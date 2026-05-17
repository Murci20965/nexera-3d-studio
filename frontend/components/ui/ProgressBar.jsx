"use client";

export default function ProgressBar({ progress, statusMsg }) {
  return (
    <div className="progress-section">
      <div className="progress-header">
        <span className="progress-label">{statusMsg}</span>
        <span className="progress-pct">{progress}%</span>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
