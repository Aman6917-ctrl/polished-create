print("TRAINING STARTED")

# Allow `python ml/train.py` from repo root: resolve dataset/ & model/ next to this file.
import sys
from pathlib import Path

_ml_root = Path(__file__).resolve().parent
_repo_root = _ml_root.parent
if str(_ml_root) not in sys.path:
    sys.path.insert(0, str(_ml_root))

# Help torchvision/torch.hub download ImageNet weights on macOS (Python.org) SSL setups
import os

try:
    import certifi

    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
    os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())
except ImportError:
    pass

import argparse
import numpy as np
import torch
import torch.nn as nn
import matplotlib.pyplot as plt

from torch.optim import Adam
from torch.optim.lr_scheduler import ReduceLROnPlateau
from sklearn.metrics import classification_report, roc_curve, auc
from sklearn.preprocessing import label_binarize
from tqdm import tqdm

from dataset.loader import load_dataset
from model.ensemble_model import FeatureConcatEnsemble


if __name__ == "__main__":

    default_csv = str(_repo_root / "processed_data/metadata/final_metadata.csv")
    default_images = str(_repo_root / "processed_data/slices")

    parser = argparse.ArgumentParser(description="Train CN/MCI/AD ensemble on MRI slices.")
    parser.add_argument("--csv", default=default_csv, help=f"Metadata CSV (default: {default_csv})")
    parser.add_argument(
        "--images",
        default=default_images,
        dest="image_folder",
        help=f"Folder of slice images (default: {default_images})",
    )
    parser.add_argument("--sample-size", type=int, default=11000)
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--img-size", type=int, default=224)
    parser.add_argument("--phase1-epochs", type=int, default=5)
    parser.add_argument("--phase2-epochs", type=int, default=5)
    parser.add_argument("--early-stop", type=int, default=5)
    parser.add_argument(
        "--torch-ssl-insecure",
        action="store_true",
        help="Skip TLS certificate verification when downloading pretrained weights (dev only).",
    )
    args = parser.parse_args()

    if args.torch_ssl_insecure or os.environ.get("ML_TORCH_SSL_INSECURE", "").lower() in (
        "1",
        "true",
        "yes",
    ):
        import ssl

        print("WARNING: Insecure TLS for weight downloads (--torch-ssl-insecure or ML_TORCH_SSL_INSECURE). Dev only.")
        ssl._create_default_https_context = ssl._create_unverified_context

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("Device:", device)
    if device.type == "cuda":
        print("GPU:", torch.cuda.get_device_name(0))

    CSV_PATH = args.csv
    IMAGE_PATH = args.image_folder

    SAMPLE_SIZE   = args.sample_size
    BATCH_SIZE    = args.batch_size
    IMG_SIZE      = args.img_size
    NUM_CLASSES   = 3
    LABELS        = ["CN", "MCI", "AD"]
    PHASE1_EPOCHS = args.phase1_epochs
    PHASE2_EPOCHS = args.phase2_epochs
    EARLY_STOP    = args.early_stop

    SAVE_DIR = str(_ml_root / "outputs")
    os.makedirs(SAVE_DIR, exist_ok=True)

    print("\nLoading dataset...")

    try:
        train_loader, val_loader, test_loader, class_weights, y_test = load_dataset(
            csv_path=CSV_PATH,
            image_folder=IMAGE_PATH,
            sample_size=SAMPLE_SIZE,
            balance=False,
            img_size=IMG_SIZE,
            batch_size=BATCH_SIZE,
            num_workers=0
        )
    except FileNotFoundError as e:
        print("\n--- Data not found ---")
        print(str(e))
        print(
            "\nPut your files in place or pass paths explicitly, for example:\n"
            f"  python3 ml/train.py --csv /path/to/final_metadata.csv --images /path/to/slices\n\n"
            "Or generate random placeholder slices (smoke test only, not real MRI):\n"
            "  npm run ml:demo-data\n\n"
            "CSV must include: column `diagnosis` (CN | MCI | AD), and `image` or `image_name` "
            "(filename inside the images folder).\n"
        )
        raise SystemExit(1) from e

    class_weights = class_weights.to(device)
    print("Data loaded")

    print("\nLoading model...")
    model = FeatureConcatEnsemble(
        num_classes=NUM_CLASSES,
        freeze_backbones=True,
    ).to(device)
    print("Params:", sum(p.numel() for p in model.parameters()))

    criterion = None
    optimizer = None

    def train_one_epoch():
        model.train()
        total_loss, correct, total = 0, 0, 0
        for x, y in tqdm(train_loader, desc="Train"):
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            out  = model(x)
            loss = criterion(out, y)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            total_loss += loss.item() * x.size(0)
            correct    += (out.argmax(1) == y).sum().item()
            total      += x.size(0)
        return total_loss / total, correct / total

    def evaluate(loader):
        model.eval()
        total_loss, correct, total = 0, 0, 0
        preds_all, probs_all = [], []
        with torch.no_grad():
            for x, y in tqdm(loader, desc="Eval"):
                x, y = x.to(device), y.to(device)
                out  = model(x)
                loss = criterion(out, y)
                prob = torch.softmax(out, 1)
                pred = prob.argmax(1)
                total_loss += loss.item() * x.size(0)
                correct    += (pred == y).sum().item()
                total      += x.size(0)
                preds_all.extend(pred.cpu().numpy())
                probs_all.extend(prob.cpu().numpy())
        return total_loss / total, correct / total, np.array(preds_all), np.array(probs_all)

    def run_phase(name, lr, epochs, unfreeze=None, load=None):
        global criterion, optimizer
        if load:
            model.load_state_dict(torch.load(load, map_location=device))
        if unfreeze:
            model.unfreeze_top_layers(unfreeze)
        criterion = nn.CrossEntropyLoss(weight=class_weights)
        optimizer = Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=lr)
        scheduler = ReduceLROnPlateau(optimizer, factor=0.5, patience=2)
        best_acc  = 0
        patience  = 0
        save_path = f"{SAVE_DIR}/best_{name}.pth"
        for epoch in range(epochs):
            print(f"\nEpoch {epoch+1}/{epochs}")
            tr_loss, tr_acc = train_one_epoch()
            vl_loss, vl_acc, _, _ = evaluate(val_loader)
            scheduler.step(vl_loss)
            print(f"Train loss={tr_loss:.4f} acc={tr_acc:.4f} | Val loss={vl_loss:.4f} acc={vl_acc:.4f}")
            if vl_acc > best_acc:
                best_acc = vl_acc
                torch.save(model.state_dict(), save_path)
                patience = 0
                print("Saved best")
            else:
                patience += 1
                if patience >= EARLY_STOP:
                    print("Early stop")
                    break
        return save_path

    print("\n=== PHASE 1 ===")
    best1 = run_phase("phase1", lr=1e-3, epochs=PHASE1_EPOCHS)

    print("\n=== PHASE 2 ===")
    best2 = run_phase("phase2", lr=1e-4, epochs=PHASE2_EPOCHS, unfreeze=30, load=best1)

    print("\n=== FINAL TEST ===")
    model.load_state_dict(torch.load(best2, map_location=device))
    _, acc, y_pred, y_probs = evaluate(test_loader)
    print(f"\nTest Accuracy: {acc:.4f}")
    print(classification_report(y_test, y_pred, target_names=LABELS))

    y_test_bin = label_binarize(y_test, classes=[0, 1, 2])
    plt.figure(figsize=(8, 6))
    for i in range(NUM_CLASSES):
        fpr, tpr, _ = roc_curve(y_test_bin[:, i], y_probs[:, i])
        plt.plot(fpr, tpr, label=f"{LABELS[i]} AUC={auc(fpr, tpr):.3f}")
    plt.plot([0, 1], [0, 1], "k--")
    plt.xlabel("FPR")
    plt.ylabel("TPR")
    plt.title("ROC Curve - CN / MCI / AD")
    plt.legend()
    plt.tight_layout()
    plt.savefig(f"{SAVE_DIR}/roc_curve.png")
    plt.show()

    print("\nDONE")
