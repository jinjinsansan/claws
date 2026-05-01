// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ClawsNFT is
    ERC721,
    ERC721URIStorage,
    ERC721Enumerable,
    AccessControl,
    ReentrancyGuard,
    Pausable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant METADATA_UPDATER_ROLE = keccak256("METADATA_UPDATER_ROLE");

    uint8 public constant TOTAL_CHARACTERS = 30;
    uint256 public constant PRICE_USDT = 300 * 10 ** 6; // 300 USDT (6 decimals)

    IERC20 public immutable usdtToken;

    address public treasuryAddress;
    string private _baseTokenURI;
    uint256 private _nextTokenId = 1;
    bool public mintingEnabled = true;

    mapping(uint8 => uint256) public charactersCount;
    mapping(uint256 => uint8) public tokenToCharacter;
    mapping(uint256 => address) public tokenReferrer;
    mapping(uint8 => uint256) public characterMaxSupply;

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
    event CharacterMaxSupplyUpdated(uint8 indexed characterNo, uint256 maxSupply);
    event TokenURIUpdated(uint256 indexed tokenId, string newURI);

    error InvalidCharacterNumber();
    error MintingDisabled();
    error InsufficientUSDTAllowance();
    error InsufficientUSDTBalance();
    error CharacterMaxSupplyReached();
    error InvalidAddress();
    error TransferFailed();
    error TokenDoesNotExist();

    constructor(
        address _usdtAddress,
        address _treasury,
        string memory baseURI
    ) ERC721("OPENCLAW Claws", "CLAW") {
        if (_usdtAddress == address(0) || _treasury == address(0)) revert InvalidAddress();

        usdtToken = IERC20(_usdtAddress);
        treasuryAddress = _treasury;
        _baseTokenURI = baseURI;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(METADATA_UPDATER_ROLE, msg.sender);
    }

    function mintClaw(
        uint8 characterNo,
        address referrer
    ) external nonReentrant whenNotPaused returns (uint256) {
        if (!mintingEnabled) revert MintingDisabled();
        if (characterNo < 1 || characterNo > TOTAL_CHARACTERS) revert InvalidCharacterNumber();
        if (referrer == address(0)) revert InvalidAddress();

        uint256 maxSupply = characterMaxSupply[characterNo];
        if (maxSupply > 0 && charactersCount[characterNo] >= maxSupply) {
            revert CharacterMaxSupplyReached();
        }

        if (usdtToken.allowance(msg.sender, address(this)) < PRICE_USDT) {
            revert InsufficientUSDTAllowance();
        }
        if (usdtToken.balanceOf(msg.sender) < PRICE_USDT) {
            revert InsufficientUSDTBalance();
        }

        bool success = usdtToken.transferFrom(msg.sender, treasuryAddress, PRICE_USDT);
        if (!success) revert TransferFailed();

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);

        tokenToCharacter[tokenId] = characterNo;
        tokenReferrer[tokenId] = referrer;
        charactersCount[characterNo]++;

        emit CharacterMinted(tokenId, msg.sender, characterNo, referrer, PRICE_USDT);

        return tokenId;
    }

    // --- Admin Functions ---

    function setTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        if (newTreasury == address(0)) revert InvalidAddress();
        address old = treasuryAddress;
        treasuryAddress = newTreasury;
        emit TreasuryUpdated(old, newTreasury);
    }

    function setBaseURI(string calldata newBaseURI) external onlyRole(ADMIN_ROLE) {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function setMintingEnabled(bool enabled) external onlyRole(ADMIN_ROLE) {
        mintingEnabled = enabled;
        emit MintingStatusChanged(enabled);
    }

    function setCharacterMaxSupply(uint8 characterNo, uint256 maxSupply) external onlyRole(ADMIN_ROLE) {
        if (characterNo < 1 || characterNo > TOTAL_CHARACTERS) revert InvalidCharacterNumber();
        characterMaxSupply[characterNo] = maxSupply;
        emit CharacterMaxSupplyUpdated(characterNo, maxSupply);
    }

    function updateTokenURI(uint256 tokenId, string calldata newURI) external onlyRole(METADATA_UPDATER_ROLE) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();
        _setTokenURI(tokenId, newURI);
        emit TokenURIUpdated(tokenId, newURI);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // --- View Functions ---

    function getOwnerClaws(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }
        return tokens;
    }

    function getTokenReferrer(uint256 tokenId) external view returns (address) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();
        return tokenReferrer[tokenId];
    }

    function ownsCharacter(address owner, uint8 characterNo) external view returns (bool) {
        uint256 balance = balanceOf(owner);
        for (uint256 i = 0; i < balance; i++) {
            if (tokenToCharacter[tokenOfOwnerByIndex(owner, i)] == characterNo) {
                return true;
            }
        }
        return false;
    }

    // --- Required Overrides (OZ v5) ---

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage, ERC721Enumerable, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
