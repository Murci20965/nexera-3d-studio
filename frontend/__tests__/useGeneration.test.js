import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGeneration } from "../hooks/useGeneration";

vi.mock("../lib/api", () => ({
  startTextGeneration: vi.fn(),
  startImageGeneration: vi.fn(),
  startMultiviewGeneration: vi.fn(),
  pollTask: vi.fn(),
  API_BASE: "http://localhost:8000",
}));

import * as api from "../lib/api";

describe("useGeneration", () => {
  let onModelReady;
  let onError;

  beforeEach(() => {
    onModelReady = vi.fn();
    onError = vi.fn();
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── initial state ───────────────────────────────────────────────────────────

  it("starts with idle state", () => {
    const { result } = renderHook(() => useGeneration({ onModelReady, onError }));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.statusMsg).toBe("");
  });

  // ── startText ───────────────────────────────────────────────────────────────

  it("sets isLoading=true and statusMsg=Submitting… immediately", async () => {
    // Use a pending promise so startTextGeneration never resolves during this test,
    // preventing state updates outside act() from triggering warnings.
    api.startTextGeneration.mockReturnValueOnce(new Promise(() => {}));

    const { result } = renderHook(() => useGeneration({ onModelReady, onError }));
    act(() => { result.current.startText("a dragon", "balanced", false); });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.statusMsg).toBe("Submitting…");
  });

  it("calls onError when startTextGeneration rejects", async () => {
    api.startTextGeneration.mockRejectedValueOnce(new Error("Server error: 500"));

    const { result } = renderHook(() => useGeneration({ onModelReady, onError }));
    await act(async () => { await result.current.startText("a dragon", "balanced", false); });

    expect(onError).toHaveBeenCalledWith("Server error: 500");
    expect(result.current.isLoading).toBe(false);
  });

  it("polls and calls onModelReady with proxy URL on success", async () => {
    api.startTextGeneration.mockResolvedValueOnce({ task_id: "t1" });
    api.pollTask.mockResolvedValueOnce({
      status: "success",
      progress: 100,
      model_url: "https://cdn.example.com/m.glb",
    });

    const { result } = renderHook(() => useGeneration({ onModelReady, onError }));
    act(() => { result.current.startText("a dragon", "balanced", false); });

    // flush startTextGeneration promise
    await act(async () => {});

    // advance the polling interval
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });

    expect(onModelReady).toHaveBeenCalledWith(
      "http://localhost:8000/api/proxy-model?url=https%3A%2F%2Fcdn.example.com%2Fm.glb"
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.statusMsg).toBe("Generation complete!");
  });

  it("calls onError when poll returns failed status", async () => {
    api.startTextGeneration.mockResolvedValueOnce({ task_id: "t2" });
    api.pollTask.mockResolvedValueOnce({ status: "failed", progress: 0, model_url: null });

    const { result } = renderHook(() => useGeneration({ onModelReady, onError }));
    act(() => { result.current.startText("a dragon", "balanced", false); });
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });

    expect(onError).toHaveBeenCalledWith("Generation failed. Please try again.");
    expect(result.current.isLoading).toBe(false);
  });

  it("calls onError when poll throws", async () => {
    api.startTextGeneration.mockResolvedValueOnce({ task_id: "t3" });
    api.pollTask.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useGeneration({ onModelReady, onError }));
    act(() => { result.current.startText("a dragon", "balanced", false); });
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });

    expect(onError).toHaveBeenCalledWith("Network error");
  });

  // ── startImage ──────────────────────────────────────────────────────────────

  // ── startMultiview ──────────────────────────────────────────────────────────

  it("startMultiview appends all 4 view files in front/back/left/right order", async () => {
    api.startMultiviewGeneration.mockResolvedValueOnce({ task_id: "mv-1" });
    api.pollTask.mockResolvedValueOnce({
      status: "success",
      progress: 100,
      model_url: "https://cdn.example.com/mv.glb",
    });

    const { result } = renderHook(() => useGeneration({ onModelReady, onError }));
    const files = {
      front: new File([new Uint8Array(2)], "f.png", { type: "image/png" }),
      back:  new File([new Uint8Array(2)], "b.png", { type: "image/png" }),
      left:  new File([new Uint8Array(2)], "l.png", { type: "image/png" }),
      right: new File([new Uint8Array(2)], "r.png", { type: "image/png" }),
    };

    act(() => { result.current.startMultiview(files, "a chair"); });
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });

    const [formData] = api.startMultiviewGeneration.mock.calls[0];
    expect(formData.get("front")).toBe(files.front);
    expect(formData.get("back")).toBe(files.back);
    expect(formData.get("left")).toBe(files.left);
    expect(formData.get("right")).toBe(files.right);
    expect(formData.get("prompt")).toBe("a chair");
    // Default quality is "standard" — should NOT appear in the FormData
    expect(formData.get("quality")).toBeNull();
    expect(onModelReady).toHaveBeenCalled();
  });

  it("startMultiview with detailed quality forwards quality=detailed", async () => {
    api.startMultiviewGeneration.mockResolvedValueOnce({ task_id: "mv-2" });
    api.pollTask.mockResolvedValueOnce({
      status: "success",
      progress: 100,
      model_url: "https://cdn.example.com/mv2.glb",
    });

    const { result } = renderHook(() => useGeneration({ onModelReady, onError }));
    const files = {
      front: new File([new Uint8Array(2)], "f.png", { type: "image/png" }),
      back:  new File([new Uint8Array(2)], "b.png", { type: "image/png" }),
      left:  new File([new Uint8Array(2)], "l.png", { type: "image/png" }),
      right: new File([new Uint8Array(2)], "r.png", { type: "image/png" }),
    };

    act(() => { result.current.startMultiview(files, "", "detailed"); });
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });

    const [formData] = api.startMultiviewGeneration.mock.calls[0];
    expect(formData.get("quality")).toBe("detailed");
  });

  // ── startImage ──────────────────────────────────────────────────────────────

  it("startImage appends file to FormData and calls startImageGeneration", async () => {
    api.startImageGeneration.mockResolvedValueOnce({ task_id: "img-1" });
    api.pollTask.mockResolvedValueOnce({
      status: "success",
      progress: 100,
      model_url: "https://cdn.example.com/img.glb",
    });

    const { result } = renderHook(() => useGeneration({ onModelReady, onError }));
    const fakeFile = new File([new Uint8Array(10)], "photo.png", { type: "image/png" });

    act(() => { result.current.startImage(fakeFile, "make it shiny"); });
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });

    const [formData] = api.startImageGeneration.mock.calls[0];
    expect(formData.get("file")).toBe(fakeFile);
    expect(formData.get("prompt")).toBe("make it shiny");
    // Default quality is "standard" — should NOT be in the FormData
    expect(formData.get("quality")).toBeNull();
    expect(onModelReady).toHaveBeenCalled();
  });

  it("startImage forwards quality=detailed when requested", async () => {
    api.startImageGeneration.mockResolvedValueOnce({ task_id: "img-d" });
    api.pollTask.mockResolvedValueOnce({
      status: "success", progress: 100, model_url: "https://cdn.example.com/d.glb",
    });
    const { result } = renderHook(() => useGeneration({ onModelReady, onError }));
    const f = new File([new Uint8Array(2)], "p.png", { type: "image/png" });

    act(() => { result.current.startImage(f, "", "detailed"); });
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });

    const [formData] = api.startImageGeneration.mock.calls[0];
    expect(formData.get("quality")).toBe("detailed");
  });
});
