import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WalletProvider } from "@/components/web3/WalletProvider";

describe("WalletProvider (placeholder)", () => {
  it("renders children unchanged", () => {
    render(
      <WalletProvider>
        <div data-testid="child">test content</div>
      </WalletProvider>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("test content")).toBeInTheDocument();
  });
});
