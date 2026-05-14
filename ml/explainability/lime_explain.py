# explainability/lime_explain.py

import numpy as np
import torch
import matplotlib.pyplot as plt

from skimage.segmentation import mark_boundaries
from lime import lime_image

LABELS = ["CN", "MCI", "AD"]


class LIMEExplainer:

    def __init__(self, model, device):

        self.model = model
        self.device = device

        self.explainer = lime_image.LimeImageExplainer(
            random_state=42
        )

    def _predict_fn(self, images):

        self.model.eval()

        batch = torch.from_numpy(images) \
            .permute(0, 3, 1, 2) \
            .float() \
            .to(self.device)

        with torch.no_grad():

            logits = self.model(batch)

            probs = torch.softmax(
                logits,
                dim=1
            ).cpu().numpy()

        return probs

    def explain(
        self,
        img_np,
        num_samples=500
    ):

        explanation = self.explainer.explain_instance(
            img_np.astype(np.double),
            self._predict_fn,
            top_labels=3,
            hide_color=0,
            num_samples=num_samples
        )

        return explanation

    def visualize(
        self,
        img_np,
        explanation,
        label_idx,
        labels=LABELS,
        num_features=10,
        save_path=None
    ):

        temp_pos, mask_pos = explanation.get_image_and_mask(
            label_idx,
            positive_only=True,
            num_features=num_features,
            hide_rest=False
        )

        temp_both, mask_both = explanation.get_image_and_mask(
            label_idx,
            positive_only=False,
            num_features=num_features,
            hide_rest=False
        )

        weights = dict(explanation.local_exp[label_idx])

        segments = explanation.segments

        heatmap = np.zeros_like(
            segments,
            dtype=np.float32
        )

        for seg_id, weight in weights.items():
            heatmap[segments == seg_id] = weight

        vmax = np.abs(heatmap).max() + 1e-8

        fig, axes = plt.subplots(1, 4, figsize=(20, 5))

        fig.patch.set_facecolor("#0f0f0f")

        axes[0].imshow(img_np)
        axes[0].set_title("Original MRI", color="white")
        axes[0].axis("off")

        axes[1].imshow(
            mark_boundaries(temp_pos, mask_pos)
        )

        axes[1].set_title(
            "Positive Regions",
            color="white"
        )

        axes[1].axis("off")

        axes[2].imshow(
            mark_boundaries(temp_both, mask_both)
        )

        axes[2].set_title(
            "Positive + Negative",
            color="white"
        )

        axes[2].axis("off")

        axes[3].imshow(img_np, alpha=0.6)

        im = axes[3].imshow(
            heatmap,
            cmap="RdBu_r",
            alpha=0.7,
            vmin=-vmax,
            vmax=vmax
        )

        axes[3].set_title(
            f"LIME Heatmap\n{labels[label_idx]}",
            color="white"
        )

        axes[3].axis("off")

        plt.colorbar(im, ax=axes[3])

        plt.tight_layout()

        if save_path:

            plt.savefig(
                save_path,
                dpi=150,
                bbox_inches="tight",
                facecolor=fig.get_facecolor()
            )

        return fig
