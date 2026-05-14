"""
FastAPI server: MRI slice image -> FeatureConcatEnsemble logits + optional Grad-CAM PNG (base64).
Run from repo root: python3 -m uvicorn ml.inference_api:app --host 127.0.0.1 --port 8765
Env: ML_WEIGHTS_PATH (optional .pth), ML_TORCH_SSL_INSECURE=1 for broken TLS on weight download.
"""
from __future__ import annotations

import base64
import os
import sys
import threading
import time
from pathlib import Path

_ml_root = Path(__file__).resolve().parent
if str(_ml_root) not in sys.path:
    sys.path.insert(0, str(_ml_root))

os.environ.setdefault("MPLBACKEND", "Agg")

try:
    import certifi

    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
    os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())
except ImportError:
    pass

if os.environ.get("ML_TORCH_SSL_INSECURE", "").lower() in ("1", "true", "yes"):
    import ssl

    ssl._create_default_https_context = ssl._create_unverified_context

import cv2
import numpy as np
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from explainability.grad_cam import GradCAM
from model.ensemble_model import FeatureConcatEnsemble

app = FastAPI(title="NeuroClear ML Inference")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(127\.0\.0\.1|localhost|\[::1\])(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_model: FeatureConcatEnsemble | None = None
_device: torch.device | None = None
_load_lock = threading.Lock()


def _get_device() -> torch.device:
    global _device
    if _device is None:
        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    return _device


def _get_model() -> FeatureConcatEnsemble:
    global _model
    with _load_lock:
        if _model is not None:
            return _model
        device = _get_device()
        m = FeatureConcatEnsemble(num_classes=3, freeze_backbones=True).to(device)
        wpath = os.environ.get("ML_WEIGHTS_PATH", "").strip()
        if not wpath:
            cand = _ml_root / "outputs" / "best_phase2.pth"
            if cand.exists():
                wpath = str(cand)
        if wpath and Path(wpath).exists():
            try:
                sd = torch.load(wpath, map_location=device, weights_only=True)
            except TypeError:
                sd = torch.load(wpath, map_location=device)
            m.load_state_dict(sd, strict=False)
        m.eval()
        _model = m
        return m


def _bytes_to_tensor(raw: bytes, size: int = 224) -> torch.Tensor:
    arr = np.frombuffer(raw, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("Could not decode image (use PNG/JPEG slice).")
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    rgb = cv2.resize(rgb, (size, size))
    t = torch.from_numpy(rgb).float() / 255.0
    return t.permute(2, 0, 1).unsqueeze(0)


class PredictResponse(BaseModel):
    prediction: str
    prediction_label: str
    confidence: float
    probs: dict[str, float]
    inference_sec: float
    heatmap_png_base64: str | None = None
    xai_note: str | None = None


LABELS = ("CN", "MCI", "AD")
LABEL_LONG = {
    "CN": "Cognitively Normal",
    "MCI": "Mild Cognitive Impairment",
    "AD": "Alzheimer's Disease",
}


@app.get("/health")
def health():
    return {"ok": True, "device": str(_get_device())}


@app.post("/predict", response_model=PredictResponse)
async def predict(
    file: UploadFile = File(...),
    xai: str = Form("gradcam"),
):
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "Empty file")

    device = _get_device()
    t0 = time.perf_counter()

    try:
        x = _bytes_to_tensor(raw).to(device)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e

    model = _get_model()
    with torch.inference_mode():
        logits = model(x)
        prob = torch.softmax(logits, dim=1)[0].cpu().numpy()

    idx = int(prob.argmax())
    pred = LABELS[idx]
    confidence = float(prob[idx])
    probs = {"cn": float(prob[0]), "mci": float(prob[1]), "ad": float(prob[2])}
    elapsed = time.perf_counter() - t0

    heatmap_b64: str | None = None
    xai_note: str | None = None

    if xai.lower() == "gradcam":
        try:
            img_np = x[0].cpu().permute(1, 2, 0).numpy().astype(np.float32)
            x_gc = x.clone().detach().to(device).requires_grad_(True)
            gc = GradCAM(model, str(device))
            cams = gc.generate(x_gc)
            overlay = gc.overlay(img_np, cams["fused"])
            o8 = (np.clip(overlay, 0, 1) * 255).astype(np.uint8)
            o8 = cv2.cvtColor(o8, cv2.COLOR_RGB2BGR)
            ok, buf = cv2.imencode(".png", o8)
            if ok:
                heatmap_b64 = base64.standard_b64encode(buf.tobytes()).decode("ascii")
            gc.remove_hooks()
        except Exception as ex:
            xai_note = f"Grad-CAM failed: {ex}"
    else:
        xai_note = "API currently returns Grad-CAM heatmaps only; SHAP/LIME use the prediction above."

    return PredictResponse(
        prediction=pred,
        prediction_label=LABEL_LONG[pred],
        confidence=confidence,
        probs=probs,
        inference_sec=round(elapsed, 3),
        heatmap_png_base64=heatmap_b64,
        xai_note=xai_note,
    )
