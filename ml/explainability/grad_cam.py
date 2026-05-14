# explainability/grad_cam.py

import cv2
import numpy as np
import torch
import torch.nn.functional as F
import matplotlib.pyplot as plt

LABELS = ["CN", "MCI", "AD"]


def _resnet_gradcam_target(resnet_module):
    """Support full ResNet (`.layer4`) and `FeatureConcatEnsemble` (`nn.Sequential` backbone)."""
    if hasattr(resnet_module, "layer4"):
        return resnet_module.layer4
    # torchvision ResNet as Sequential: children 7 == layer4
    return resnet_module[7]


class GradCAM:
    def __init__(self, model, device):
        self.model = model
        self.device = device

        self._activations = {}
        self._gradients = {}
        self._hooks = []

        self._register_hooks()

    def _register_hooks(self):

        targets = {
            "resnet": _resnet_gradcam_target(self.model.resnet),
            "efficientnet": self.model.efficientnet[-1],
            "densenet": self.model.densenet.norm5,
        }

        for name, layer in targets.items():

            self._hooks.append(
                layer.register_forward_hook(self._make_fwd_hook(name))
            )

            self._hooks.append(
                layer.register_full_backward_hook(self._make_bwd_hook(name))
            )

    def _make_fwd_hook(self, name):
        def hook(module, inp, out):
            self._activations[name] = out.detach()
        return hook

    def _make_bwd_hook(self, name):
        def hook(module, grad_in, grad_out):
            self._gradients[name] = grad_out[0].detach()
        return hook

    def remove_hooks(self):
        for h in self._hooks:
            h.remove()

    def generate(self, img_tensor, class_idx=None):

        self.model.eval()

        img_tensor = img_tensor.to(self.device).float()
        img_tensor.requires_grad_(True)

        output = self.model(img_tensor)

        probs = torch.softmax(output, dim=1).detach().cpu().numpy()[0]

        if class_idx is None:
            class_idx = int(np.argmax(probs))

        self.model.zero_grad()

        output[0, class_idx].backward()

        cams = {}

        for name in ["resnet", "efficientnet", "densenet"]:

            grads = self._gradients[name]
            acts = self._activations[name]

            weights = grads.mean(dim=(2, 3), keepdim=True)

            cam = (weights * acts).sum(dim=1).squeeze()

            cam = F.relu(cam).detach().cpu().numpy()

            if cam.max() > cam.min():
                cam = (cam - cam.min()) / (cam.max() - cam.min())
            else:
                cam = np.zeros_like(cam)

            cams[name] = cam

        H, W = img_tensor.shape[-2:]

        fused = np.zeros((H, W), dtype=np.float32)

        for cam in cams.values():
            fused += cv2.resize(cam, (W, H))

        fused /= 3.0

        fused = (fused - fused.min()) / (fused.max() - fused.min() + 1e-8)

        cams["fused"] = fused
        cams["class_idx"] = class_idx
        cams["probs"] = probs

        return cams

    @staticmethod
    def overlay(img_np, cam, alpha=0.45):

        H, W = img_np.shape[:2]

        cam = cv2.resize(cam, (W, H))

        heatmap = cv2.applyColorMap(
            np.uint8(cam * 255),
            cv2.COLORMAP_JET
        )

        heatmap = cv2.cvtColor(
            heatmap,
            cv2.COLOR_BGR2RGB
        ).astype(np.float32) / 255.0

        blended = alpha * heatmap + (1 - alpha) * img_np

        return np.clip(blended, 0, 1)

    def visualize(
        self,
        img_np,
        cams,
        labels=LABELS,
        save_path=None
    ):

        keys = ["resnet", "efficientnet", "densenet", "fused"]

        titles = [
            "ResNet50",
            "EfficientNetB0",
            "DenseNet121",
            "Fused"
        ]

        fig, axes = plt.subplots(1, 5, figsize=(22, 4))

        fig.patch.set_facecolor("#0f0f0f")

        axes[0].imshow(img_np)
        axes[0].set_title("Original MRI", color="white")
        axes[0].axis("off")

        for ax, key, title in zip(axes[1:], keys, titles):

            overlaid = self.overlay(img_np, cams[key])

            ax.imshow(overlaid)

            ax.set_title(
                f"GradCAM\n{title}",
                color="white"
            )

            ax.axis("off")

        probs = cams["probs"]

        pred_label = labels[cams["class_idx"]]

        prob_text = "   ".join([
            f"{l}: {p:.2f}"
            for l, p in zip(labels, probs)
        ])

        fig.suptitle(
            f"Prediction: {pred_label} | {prob_text}",
            color="white",
            fontsize=12
        )

        plt.tight_layout()

        if save_path:
            plt.savefig(
                save_path,
                dpi=150,
                bbox_inches="tight",
                facecolor=fig.get_facecolor()
            )

        return fig
