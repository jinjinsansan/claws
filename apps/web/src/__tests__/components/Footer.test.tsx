import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "@/components/layout/Footer";

describe("Footer", () => {
  it("renders OPENCLAW brand name", () => {
    render(<Footer />);
    expect(screen.getByText("OPENCLAW")).toBeInTheDocument();
  });

  it("renders OPENCLAW Platform copyright", () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(
      screen.getByText(`\u00A9 ${year} OPENCLAW Platform. All rights reserved.`)
    ).toBeInTheDocument();
  });

  it("renders legal links", () => {
    render(<Footer />);
    expect(screen.getByText("特定商取引法に基づく表記")).toBeInTheDocument();
    expect(screen.getByText("プライバシーポリシー")).toBeInTheDocument();
  });

  it("does not contain AI Builders Lab", () => {
    render(<Footer />);
    expect(screen.queryByText(/AI Builders Lab/i)).not.toBeInTheDocument();
  });
});
