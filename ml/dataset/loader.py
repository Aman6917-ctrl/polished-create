import os

print("USING NEW LOADER FILE")

import pandas as pd
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
import cv2


# =========================
# DATASET CLASS
# =========================
class MRIDataset(Dataset):

    def __init__(self, df, image_folder, img_size=224):
        self.df = df.reset_index(drop=True)
        self.image_folder = image_folder
        self.img_size = img_size

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):

        row = self.df.iloc[idx]

        img_path = os.path.join(self.image_folder, row["image"])
        label = int(row["label"])

        img = cv2.imread(img_path)

        if img is None:
            raise FileNotFoundError(f"Image not found: {img_path}")

        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, (self.img_size, self.img_size))
        img = img / 255.0

        img = torch.tensor(
            img,
            dtype=torch.float32
        ).permute(2, 0, 1)

        label = torch.tensor(
            label,
            dtype=torch.long
        )

        return img, label


# =========================
# MAIN LOADER
# =========================
def load_dataset(
    csv_path,
    image_folder,
    sample_size=10000,
    balance=False,
    img_size=224,
    batch_size=2,
    num_workers=0
):

    print("LOADER STARTED")
    print("CSV path:", csv_path)
    print("Image folder:", image_folder)

    # =========================
    # CHECK PATHS
    # =========================
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV not found: {csv_path}")

    if not os.path.exists(image_folder):
        raise FileNotFoundError(f"Image folder not found: {image_folder}")

    # =========================
    # READ CSV
    # =========================
    print("ABOUT TO READ CSV")

    try:

        df = pd.read_csv(
            csv_path,
            encoding="utf-8",
            engine="python"
        )

        print("CSV LOADED SUCCESSFULLY")

    except Exception as e:

        print("CSV READ ERROR")
        print(e)

        raise

    print("Raw rows:", len(df))
    print("Columns:", df.columns.tolist())

    # =========================
    # RENAME COLUMN
    # =========================
    if "image_name" in df.columns:

        df = df.rename(
            columns={"image_name": "image"}
        )

    # =========================
    # CHECK DIAGNOSIS COLUMN
    # =========================
    if "diagnosis" not in df.columns:
        raise ValueError(
            "diagnosis column not found in CSV"
        )

    # =========================
    # MAP LABELS
    # =========================
    df["label"] = df["diagnosis"].map({
        "CN": 0,
        "MCI": 1,
        "AD": 2
    })

    # =========================
    # REMOVE INVALID ROWS
    # =========================
    df = df.dropna(
        subset=["image", "label"]
    )

    df["label"] = df["label"].astype(int)

    print("Valid rows:", len(df))

    print("Class distribution:")
    print(df["label"].value_counts())

    # =========================
    # SAMPLE DATA
    # =========================
    if sample_size is not None and len(df) > sample_size:

        df = df.sample(
            sample_size,
            random_state=42
        )

    print("After sampling:", len(df))

    # =========================
    # OPTIONAL BALANCE
    # =========================
    if balance:

        min_count = (
            df["label"]
            .value_counts()
            .min()
        )

        df = (
            df.groupby(
                "label",
                group_keys=False
            )
            .apply(
                lambda g: g.sample(
                    min_count,
                    random_state=42
                )
            )
            .reset_index(drop=True)
        )

        print("After balancing:", len(df))
        print(df["label"].value_counts())

    # =========================
    # SPLIT DATA
    # =========================
    train_df, temp_df = train_test_split(
        df,
        test_size=0.30,
        random_state=42,
        stratify=df["label"]
    )

    val_df, test_df = train_test_split(
        temp_df,
        test_size=0.50,
        random_state=42,
        stratify=temp_df["label"]
    )

    print(f"Train: {len(train_df)}")
    print(f"Val: {len(val_df)}")
    print(f"Test: {len(test_df)}")

    # =========================
    # DATASETS
    # =========================
    train_ds = MRIDataset(
        train_df,
        image_folder,
        img_size
    )

    val_ds = MRIDataset(
        val_df,
        image_folder,
        img_size
    )

    test_ds = MRIDataset(
        test_df,
        image_folder,
        img_size
    )

    # =========================
    # DATALOADERS
    # =========================
    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=True
    )

    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True
    )

    test_loader = DataLoader(
        test_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True
    )

    # =========================
    # CLASS WEIGHTS
    # =========================
    weights = compute_class_weight(
        class_weight="balanced",
        classes=np.array([0, 1, 2]),
        y=train_df["label"].values
    )

    class_weights = torch.tensor(
        weights,
        dtype=torch.float32
    )

    # =========================
    # TEST LABELS
    # =========================
    y_test = test_df["label"].values

    print("LOADER READY")

    return (
        train_loader,
        val_loader,
        test_loader,
        class_weights,
        y_test
    )
