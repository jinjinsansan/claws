import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Header from "@/components/layout/Header";

describe("Header", () => {
  it("renders OPENCLAW brand name", () => {
    render(<Header />);
    expect(screen.getByText("OPENCLAW")).toBeInTheDocument();
  });

  it("renders navigation links", () => {
    render(<Header />);
    expect(screen.getByText("Claws")).toBeInTheDocument();
    expect(screen.getByText("Academy")).toBeInTheDocument();
  });

  it("renders login link", () => {
    render(<Header />);
    const loginLinks = screen.getAllByText("ログイン");
    expect(loginLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("does not contain AI Builders Lab", () => {
    render(<Header />);
    expect(screen.queryByText(/AI Builders Lab/i)).not.toBeInTheDocument();
  });
});
