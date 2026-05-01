// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ClawsNFT.sol";
import "../src/mocks/MockUSDT.sol";

contract ClawsNFTTest is Test {
    ClawsNFT public nft;
    MockUSDT public usdt;

    address public admin;
    address public treasury;
    address public user1;
    address public user2;
    address public referrer;

    uint256 public constant PRICE = 300 * 10 ** 6; // 300 USDT

    event CharacterMinted(
        uint256 indexed tokenId,
        address indexed owner,
        uint8 indexed characterNo,
        address referrer,
        uint256 price
    );
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event BaseURIUpdated(string newBaseURI);
    event MintingStatusChanged(bool enabled);
    event TokenURIUpdated(uint256 indexed tokenId, string newURI);

    function setUp() public {
        admin = address(this);
        treasury = makeAddr("treasury");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        referrer = makeAddr("referrer");

        // Deploy contracts
        usdt = new MockUSDT();
        nft = new ClawsNFT(address(usdt), treasury, "https://api.openclaw.io/metadata/");

        // Mint USDT to test users (10,000 USDT each)
        usdt.mint(user1, 10_000 * 10 ** 6);
        usdt.mint(user2, 10_000 * 10 ** 6);

        // Approve USDT spending for the NFT contract
        vm.prank(user1);
        usdt.approve(address(nft), type(uint256).max);

        vm.prank(user2);
        usdt.approve(address(nft), type(uint256).max);
    }

    // ================================================================
    // mintClaw - Happy Path
    // ================================================================

    function test_MintClaw_Success() public {
        uint8 characterNo = 5;

        vm.prank(user1);
        uint256 tokenId = nft.mintClaw(characterNo, referrer);

        // Verify token ID
        assertEq(tokenId, 1);

        // Verify owner
        assertEq(nft.ownerOf(tokenId), user1);

        // Verify character mapping
        assertEq(nft.tokenToCharacter(tokenId), characterNo);

        // Verify referrer mapping
        assertEq(nft.tokenReferrer(tokenId), referrer);

        // Verify character count incremented
        assertEq(nft.charactersCount(characterNo), 1);

        // Verify treasury received USDT
        assertEq(usdt.balanceOf(treasury), PRICE);

        // Verify user1 balance decreased
        assertEq(usdt.balanceOf(user1), 10_000 * 10 ** 6 - PRICE);
    }

    // ================================================================
    // mintClaw - Revert Cases
    // ================================================================

    function test_MintClaw_Revert_InvalidCharacter_Zero() public {
        vm.prank(user1);
        vm.expectRevert(ClawsNFT.InvalidCharacterNumber.selector);
        nft.mintClaw(0, referrer);
    }

    function test_MintClaw_Revert_InvalidCharacter_Over30() public {
        vm.prank(user1);
        vm.expectRevert(ClawsNFT.InvalidCharacterNumber.selector);
        nft.mintClaw(31, referrer);
    }

    function test_MintClaw_Revert_InsufficientAllowance() public {
        // Create a user with USDT but no approval
        address noApproveUser = makeAddr("noApproveUser");
        usdt.mint(noApproveUser, 10_000 * 10 ** 6);
        // No approve call

        vm.prank(noApproveUser);
        vm.expectRevert(ClawsNFT.InsufficientUSDTAllowance.selector);
        nft.mintClaw(1, referrer);
    }

    function test_MintClaw_Revert_InsufficientBalance() public {
        // Create a user with low balance but with approval
        address poorUser = makeAddr("poorUser");
        usdt.mint(poorUser, 100 * 10 ** 6); // Only 100 USDT, need 300

        vm.prank(poorUser);
        usdt.approve(address(nft), type(uint256).max);

        vm.prank(poorUser);
        vm.expectRevert(ClawsNFT.InsufficientUSDTBalance.selector);
        nft.mintClaw(1, referrer);
    }

    function test_MintClaw_Revert_WhenPaused() public {
        // Admin pauses the contract
        nft.pause();

        vm.prank(user1);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        nft.mintClaw(1, referrer);
    }

    function test_MintClaw_Revert_MintingDisabled() public {
        // Admin disables minting
        nft.setMintingEnabled(false);

        vm.prank(user1);
        vm.expectRevert(ClawsNFT.MintingDisabled.selector);
        nft.mintClaw(1, referrer);
    }

    function test_MintClaw_Revert_ZeroReferrer() public {
        vm.prank(user1);
        vm.expectRevert(ClawsNFT.InvalidAddress.selector);
        nft.mintClaw(1, address(0));
    }

    function test_MintClaw_Revert_MaxSupplyReached() public {
        uint8 characterNo = 10;

        // Set max supply = 1 for character 10
        nft.setCharacterMaxSupply(characterNo, 1);

        // First mint succeeds
        vm.prank(user1);
        nft.mintClaw(characterNo, referrer);

        // Second mint should fail
        vm.prank(user2);
        vm.expectRevert(ClawsNFT.CharacterMaxSupplyReached.selector);
        nft.mintClaw(characterNo, referrer);
    }

    // ================================================================
    // mintClaw - Multiple Mints
    // ================================================================

    function test_MintClaw_MultipleSameCharacter() public {
        uint8 characterNo = 7;

        // Mint same character 3 times
        vm.prank(user1);
        uint256 tokenId1 = nft.mintClaw(characterNo, referrer);

        vm.prank(user1);
        uint256 tokenId2 = nft.mintClaw(characterNo, referrer);

        vm.prank(user1);
        uint256 tokenId3 = nft.mintClaw(characterNo, referrer);

        // Verify sequential IDs
        assertEq(tokenId1, 1);
        assertEq(tokenId2, 2);
        assertEq(tokenId3, 3);

        // Verify character count
        assertEq(nft.charactersCount(characterNo), 3);

        // All tokens map to same character
        assertEq(nft.tokenToCharacter(tokenId1), characterNo);
        assertEq(nft.tokenToCharacter(tokenId2), characterNo);
        assertEq(nft.tokenToCharacter(tokenId3), characterNo);
    }

    // ================================================================
    // View Functions
    // ================================================================

    function test_GetOwnerClaws() public {
        // Mint 3 different characters for user1
        vm.prank(user1);
        nft.mintClaw(1, referrer);

        vm.prank(user1);
        nft.mintClaw(15, referrer);

        vm.prank(user1);
        nft.mintClaw(30, referrer);

        uint256[] memory claws = nft.getOwnerClaws(user1);
        assertEq(claws.length, 3);
        assertEq(claws[0], 1);
        assertEq(claws[1], 2);
        assertEq(claws[2], 3);
    }

    function test_OwnsCharacter() public {
        vm.prank(user1);
        nft.mintClaw(5, referrer);

        assertTrue(nft.ownsCharacter(user1, 5));
        assertFalse(nft.ownsCharacter(user1, 6));
    }

    // ================================================================
    // Transfer
    // ================================================================

    function test_TransferChangesOwnership() public {
        vm.prank(user1);
        uint256 tokenId = nft.mintClaw(1, referrer);

        assertEq(nft.ownerOf(tokenId), user1);

        // Transfer from user1 to user2
        vm.prank(user1);
        nft.transferFrom(user1, user2, tokenId);

        assertEq(nft.ownerOf(tokenId), user2);

        // Verify getOwnerClaws reflects the transfer
        uint256[] memory user1Claws = nft.getOwnerClaws(user1);
        assertEq(user1Claws.length, 0);

        uint256[] memory user2Claws = nft.getOwnerClaws(user2);
        assertEq(user2Claws.length, 1);
        assertEq(user2Claws[0], tokenId);
    }

    // ================================================================
    // Admin Functions
    // ================================================================

    function test_SetTreasury() public {
        address newTreasury = makeAddr("newTreasury");

        vm.expectEmit(true, true, false, false);
        emit TreasuryUpdated(treasury, newTreasury);

        nft.setTreasury(newTreasury);
        assertEq(nft.treasuryAddress(), newTreasury);
    }

    function test_SetTreasury_Revert_NonAdmin() public {
        address newTreasury = makeAddr("newTreasury");

        vm.prank(user1);
        vm.expectRevert();
        nft.setTreasury(newTreasury);
    }

    function test_SetBaseURI() public {
        string memory newURI = "https://new.openclaw.io/metadata/";

        vm.expectEmit(false, false, false, true);
        emit BaseURIUpdated(newURI);

        nft.setBaseURI(newURI);
    }

    function test_UpdateTokenURI() public {
        // First mint a token
        vm.prank(user1);
        uint256 tokenId = nft.mintClaw(1, referrer);

        string memory newURI = "ipfs://QmNewHash";

        vm.expectEmit(true, false, false, true);
        emit TokenURIUpdated(tokenId, newURI);

        // Admin (has METADATA_UPDATER_ROLE) updates URI
        nft.updateTokenURI(tokenId, newURI);

        // ERC721URIStorage concatenates baseURI + per-token URI
        string memory expected = string(abi.encodePacked("https://api.openclaw.io/metadata/", newURI));
        assertEq(nft.tokenURI(tokenId), expected);
    }

    function test_Pausable() public {
        // Initially not paused
        assertFalse(nft.paused());

        // Pause
        nft.pause();
        assertTrue(nft.paused());

        // Minting should fail when paused
        vm.prank(user1);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        nft.mintClaw(1, referrer);

        // Unpause
        nft.unpause();
        assertFalse(nft.paused());

        // Minting should work again
        vm.prank(user1);
        uint256 tokenId = nft.mintClaw(1, referrer);
        assertEq(tokenId, 1);
    }
}
