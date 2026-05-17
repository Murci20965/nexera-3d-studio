"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { startTextGeneration, startImageGeneration, pollTask, API_BASE } from "../lib/api";

const POLL_INTERVAL_MS = 3000;

export function useGeneration({ onModelReady, onError }) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const poll = useCallback((taskId, label) => {
    return new Promise((resolve, reject) => {
      pollRef.current = setInterval(async () => {
        try {
          const data = await pollTask(taskId);
          setProgress(data.progress ?? 0);
          if (data.status === "success") {
            clearInterval(pollRef.current);
            resolve(data.model_url);
          } else if (data.status === "failed") {
            clearInterval(pollRef.current);
            reject(new Error("Generation failed. Please try again."));
          } else {
            setStatusMsg(label + (data.status === "processing" ? " — Processing…" : " — Queued…"));
          }
        } catch (err) {
          clearInterval(pollRef.current);
          reject(err);
        }
      }, POLL_INTERVAL_MS);
    });
  }, []);

  const finish = (modelUrl) => {
    setIsLoading(false);
    setStatusMsg("Generation complete!");
    if (!modelUrl) { onError("Generation succeeded but no model URL was returned."); return; }
    onModelReady(`${API_BASE}/api/proxy-model?url=${encodeURIComponent(modelUrl)}`);
  };

  const startText = async (prompt, quality, lowPoly) => {
    clearInterval(pollRef.current);
    setIsLoading(true); setProgress(0); setStatusMsg("Submitting…"); onError("");
    try {
      const { task_id } = await startTextGeneration(prompt, quality, lowPoly);
      setStatusMsg("Generating…"); setProgress(0);
      const modelUrl = await poll(task_id, "Generating");
      finish(modelUrl);
    } catch (err) {
      setIsLoading(false); setProgress(0); setStatusMsg("");
      onError(err.message || "Failed to start generation.");
    }
  };

  const startImage = async (file, prompt) => {
    clearInterval(pollRef.current);
    setIsLoading(true); setProgress(0); setStatusMsg("Uploading image…"); onError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (prompt.trim()) formData.append("prompt", prompt.trim());
      const { task_id } = await startImageGeneration(formData);
      setStatusMsg("Generating…"); setProgress(0);
      const modelUrl = await poll(task_id, "Generating");
      finish(modelUrl);
    } catch (err) {
      setIsLoading(false); setProgress(0); setStatusMsg("");
      onError(err.message || "Failed to start generation.");
    }
  };

  return { isLoading, progress, statusMsg, startText, startImage };
}
