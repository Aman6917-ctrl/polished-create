/** ML inference API (FastAPI). Dev: Vite proxies /api/ml -> uvicorn :8765 */
export function getMlPredictUrl(): string {
  const base = (import.meta.env.VITE_ML_API_URL as string | undefined)?.replace(/\/$/, "");
  if (base) return `${base}/predict`;
  return "/api/ml/predict";
}

export function getMlHealthUrl(): string {
  const base = (import.meta.env.VITE_ML_API_URL as string | undefined)?.replace(/\/$/, "");
  if (base) return `${base}/health`;
  return "/api/ml/health";
}
