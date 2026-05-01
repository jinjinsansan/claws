import { describe, it, expect, vi } from "vitest";

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
  useConnect: () => ({ connect: vi.fn(), connectors: [], isPending: false }),
  useDisconnect: () => ({ disconnect: vi.fn() }),
}));

import { render, screen } from "@testing-library/react";
import { ConnectWalletButton } from "@/components/web3/ConnectWalletButton";

describe("ConnectWalletButton", () => {
  it("renders connect button when not connected", () => {
    render(<ConnectWalletButton />);
    expect(screen.getByText("CONNECT WALLET")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<ConnectWalletButton className="test-class" />);
    expect(container.firstChild).toBeTruthy();
  });
});
