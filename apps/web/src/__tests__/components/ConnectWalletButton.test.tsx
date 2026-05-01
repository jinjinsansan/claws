import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConnectWalletButton } from "@/components/web3/ConnectWalletButton";

describe("ConnectWalletButton (placeholder)", () => {
  it("renders Phase 3 placeholder text", () => {
    render(<ConnectWalletButton />);
    expect(screen.getByText("WALLET — COMING IN PHASE 3")).toBeInTheDocument();
  });

  it("has cursor-not-allowed class", () => {
    render(<ConnectWalletButton />);
    const el = screen.getByText("WALLET — COMING IN PHASE 3");
    expect(el.className).toContain("cursor-not-allowed");
  });
});
