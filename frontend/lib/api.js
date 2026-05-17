const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function startTextGeneration(prompt, quality, lowPoly) {
  const res = await fetch(`${API_BASE}/api/generate/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, quality, low_poly: lowPoly }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server error: ${res.status}`);
  }
  return res.json(); // { task_id }
}

export async function startImageGeneration(formData) {
  const res = await fetch(`${API_BASE}/api/generate/image`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server error: ${res.status}`);
  }
  return res.json(); // { task_id }
}

export async function pollTask(taskId) {
  const res = await fetch(`${API_BASE}/api/task/${taskId}`);
  if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
  return res.json(); // { status, progress, model_url }
}

export { API_BASE };
