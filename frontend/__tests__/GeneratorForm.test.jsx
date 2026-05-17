import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GeneratorForm from "../components/generator/GeneratorForm";

const { mockStartText, mockStartImage } = vi.hoisted(() => ({
  mockStartText: vi.fn(),
  mockStartImage: vi.fn(),
}));

vi.mock("../hooks/useGeneration", () => ({
  useGeneration: () => ({
    isLoading: false,
    progress: 0,
    statusMsg: "",
    startText: mockStartText,
    startImage: mockStartImage,
  }),
}));

describe("GeneratorForm", () => {
  const onModelReady = vi.fn();
  const onError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Text to 3D tab by default", () => {
    render(<GeneratorForm onModelReady={onModelReady} onError={onError} />);
    expect(screen.getByRole("tab", { name: "Text to 3D" })).toBeTruthy();
    expect(screen.getByPlaceholderText(/Describe the 3D model/)).toBeTruthy();
  });

  it("switches to Image to 3D tab on click", () => {
    render(<GeneratorForm onModelReady={onModelReady} onError={onError} />);
    fireEvent.click(screen.getByRole("tab", { name: "Image to 3D" }));
    expect(screen.getByLabelText("Upload image")).toBeTruthy();
    expect(screen.queryByPlaceholderText(/Describe the 3D model/)).toBeNull();
  });

  it("submit button is disabled when prompt is empty", () => {
    render(<GeneratorForm onModelReady={onModelReady} onError={onError} />);
    const btn = screen.getByRole("button", { name: "Generate 3D Model" });
    expect(btn).toBeDisabled();
  });

  it("submit button enables when prompt is typed", () => {
    render(<GeneratorForm onModelReady={onModelReady} onError={onError} />);
    fireEvent.change(screen.getByPlaceholderText(/Describe the 3D model/), {
      target: { value: "a red dragon" },
    });
    expect(screen.getByRole("button", { name: "Generate 3D Model" })).not.toBeDisabled();
  });

  it("calls startText with trimmed prompt, quality, and lowPoly on submit", () => {
    render(<GeneratorForm onModelReady={onModelReady} onError={onError} />);
    fireEvent.change(screen.getByPlaceholderText(/Describe the 3D model/), {
      target: { value: "  a red dragon  " },
    });
    fireEvent.submit(screen.getByPlaceholderText(/Describe the 3D model/).closest("form"));
    expect(mockStartText).toHaveBeenCalledWith("a red dragon", "balanced", false);
  });

  it("does not call startText when prompt is whitespace only", () => {
    render(<GeneratorForm onModelReady={onModelReady} onError={onError} />);
    fireEvent.change(screen.getByPlaceholderText(/Describe the 3D model/), {
      target: { value: "   " },
    });
    fireEvent.submit(screen.getByPlaceholderText(/Describe the 3D model/).closest("form"));
    expect(mockStartText).not.toHaveBeenCalled();
  });

  it("quality toggle switches between balanced and high-detail", () => {
    render(<GeneratorForm onModelReady={onModelReady} onError={onError} />);
    const highDetailBtn = screen.getByRole("button", { name: "High Detail" });
    fireEvent.click(highDetailBtn);
    fireEvent.change(screen.getByPlaceholderText(/Describe the 3D model/), {
      target: { value: "a cube" },
    });
    fireEvent.submit(screen.getByPlaceholderText(/Describe the 3D model/).closest("form"));
    expect(mockStartText).toHaveBeenCalledWith("a cube", "high-detail", false);
  });
});
