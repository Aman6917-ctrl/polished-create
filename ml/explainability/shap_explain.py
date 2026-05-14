# explainability/shap_explain.py

import os
import shap
import torch
import numpy as np
import matplotlib.pyplot as plt


def _to_device_str(device):
    if isinstance(device, torch.device):
        return device.type
    return str(device)


class SHAPExplainer:

    def __init__(
        self,
        model,
        device,
        background,
        n_background_samples=10,
        fast_mode=True
    ):

        dev_str = _to_device_str(device)
        if fast_mode and dev_str == "cuda":
            device = "cpu"

        self.model = model.to(device).eval()

        self.device = device

        self.fast_mode = fast_mode

        if not isinstance(background, torch.Tensor):
            background = torch.tensor(
                background,
                dtype=torch.float32
            )

        if len(background) > n_background_samples:

            idx = np.random.choice(
                len(background),
                n_background_samples,
                replace=False
            )

            background = background[idx]

        self.background = background.to(device).float()

        self.explainer = shap.GradientExplainer(
            self.model,
            self.background,
            batch_size=4
        )

    @staticmethod
    def collect_background(
        val_loader,
        n=10,
        save_path="outputs/shap_background.pt"
    ):

        parent = os.path.dirname(save_path)
        if parent:
            os.makedirs(parent, exist_ok=True)

        collected = []

        total = 0

        for imgs, _ in val_loader:

            collected.append(imgs.float())

            total += imgs.size(0)

            if total >= n:
                break

        background = torch.cat(collected, dim=0)[:n]

        torch.save(background, save_path)

        return background

    def explain(
        self,
        input_tensor,
        class_idx=None,
        n_samples=25
    ):

        if input_tensor.dim() == 3:
            input_tensor = input_tensor.unsqueeze(0)

        input_tensor = input_tensor.float()

        original_size = input_tensor.shape[-2:]

        if self.fast_mode and original_size[0] > 224:

            input_small = torch.nn.functional.interpolate(
                input_tensor,
                size=(224, 224),
                mode="bilinear",
                align_corners=False
            )

        else:
            input_small = input_tensor

        input_small = input_small.to(self.device)

        shap_values = self.explainer.shap_values(
            input_small,
            nsamples=n_samples
        )

        if isinstance(shap_values, list):

            if class_idx is None:

                with torch.no_grad():

                    output = self.model(input_small)
                    # [B, C] — use first batch row for predicted class
                    class_idx = int(output[0].argmax().item())

            shap_map = shap_values[class_idx][0]

        else:

            shap_map = shap_values[0]

        if self.fast_mode and original_size[0] > 224:

            shap_tensor = torch.from_numpy(
                shap_map
            ).float().unsqueeze(0)

            shap_tensor = torch.nn.functional.interpolate(
                shap_tensor,
                size=original_size,
                mode="bilinear",
                align_corners=False
            )

            shap_map = shap_tensor.squeeze().numpy()

        return shap_map, class_idx

    def visualize(
        self,
        img_np,
        shap_values,
        class_idx,
        labels=["CN", "MCI", "AD"],
        save_path=None
    ):

        if shap_values.ndim == 3:
            shap_map = np.transpose(
                shap_values,
                (1, 2, 0)
            )

            heatmap = np.mean(
                np.abs(shap_map),
                axis=2
            )

        else:
            heatmap = shap_values

        heatmap = (
            heatmap - heatmap.min()
        ) / (
            heatmap.max() - heatmap.min() + 1e-8
        )

        fig, axes = plt.subplots(1, 3, figsize=(15, 5))

        axes[0].imshow(img_np)
        axes[0].set_title("Original MRI")
        axes[0].axis("off")

        im = axes[1].imshow(
            heatmap,
            cmap="coolwarm"
        )

        axes[1].set_title("SHAP Heatmap")
        axes[1].axis("off")

        plt.colorbar(im, ax=axes[1])

        axes[2].imshow(img_np)

        axes[2].imshow(
            heatmap,
            cmap="jet",
            alpha=0.45
        )

        axes[2].set_title(
            f"SHAP Overlay\n{labels[class_idx]}"
        )

        axes[2].axis("off")

        plt.tight_layout()

        if save_path:

            plt.savefig(
                save_path,
                dpi=150,
                bbox_inches="tight"
            )

        return fig
