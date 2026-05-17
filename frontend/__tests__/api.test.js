import { describe, it, expect, vi, beforeEach } from "vitest";
import { startTextGeneration, startImageGeneration, pollTask } from "../lib/api";

global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

// ── startTextGeneration ───────────────────────────────────────────────────────

describe("startTextGeneration", () => {
  it("POSTs with correct body and returns task_id", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ task_id: "abc123" }),
    });

    const result = await startTextGeneration("a dragon", "balanced", false);
    expect(result).toEqual({ task_id: "abc123" });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/generate/text"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "a dragon", quality: "balanced", low_poly: false }),
      })
    );
  });

  it("throws the detail message on non-ok response", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ detail: "prompt must not be empty" }),
    });

    await expect(startTextGeneration("", "balanced", false)).rejects.toThrow("prompt must not be empty");
  });

  it("falls back to generic error when response body is not JSON", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error("not json"); },
    });

    await expect(startTextGeneration("test", "balanced", false)).rejects.toThrow("Server error: 500");
  });
});

// ── startImageGeneration ──────────────────────────────────────────────────────

describe("startImageGeneration", () => {
  it("POSTs FormData and returns task_id", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ task_id: "img-456" }),
    });

    const formData = new FormData();
    const result = await startImageGeneration(formData);
    expect(result).toEqual({ task_id: "img-456" });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/generate/image"),
      expect.objectContaining({ method: "POST", body: formData })
    );
  });

  it("throws the detail message on 413 response", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 413,
      json: async () => ({ detail: "File exceeds 20 MB limit" }),
    });

    await expect(startImageGeneration(new FormData())).rejects.toThrow("File exceeds 20 MB limit");
  });
});

// ── pollTask ──────────────────────────────────────────────────────────────────

describe("pollTask", () => {
  it("GETs the correct URL and returns parsed status", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "success", progress: 100, model_url: "https://cdn.example.com/m.glb" }),
    });

    const result = await pollTask("task-123");
    expect(result).toEqual({ status: "success", progress: 100, model_url: "https://cdn.example.com/m.glb" });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/task/task-123"));
  });

  it("throws on non-ok response", async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(pollTask("missing")).rejects.toThrow("Status check failed: 404");
  });
});
