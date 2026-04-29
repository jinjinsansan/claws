# SPEC-02: OPENCLAW Platform - NFT・スマートコントラクト

> **このドキュメントの位置づけ**: Polygon上で動くスマートコントラクトの仕様。Foundryで実装し、ClawsNFT（ERC-721）と RewardDistributor（報酬分配）の2つを定義する。
> 
> **前提**: SPEC-00（全体概要）、SPEC-01（データベース設計）を読んでいること。

---

## 1. スマートコントラクト全体方針

### 1.1 コントラクト構成

```
ClawsNFT.sol           — メインのNFTコントラクト（ERC-721）
                        ・USDT決済での購入
                        ・30体のキャラ管理
                        ・所有者の透明な記録

RewardDistributor.sol  — 紹介報酬の分配コントラクト
                        ・運営アドレスから複数アドレスへの一括送金
                        ・ガス効率化のためのバッチ処理
                        ・分配履歴のオンチェーン記録

USDT (既存)            — Polygonの USDT (Tether)
                        Address: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F
                        ※新規デプロイ不要、既存の Polygon USDT を使う
```

### 1.2 採用技術

| 項目 | 内容 |
|------|------|
| 言語 | Solidity ^0.8.20 |
| 開発フレームワーク | Foundry |
| ライブラリ | OpenZeppelin Contracts ^5.0 |
| 補助ライブラリ | Solady（ガス最適化用、必要に応じて） |
| ネットワーク | Polygon (PoS Mainnet, ChainID: 137) |
| テストネット | Polygon Amoy (ChainID: 80002) |
| デプロイ | Foundry script + Forge |
| 検証 | Polygonscan |

### 1.3 セキュリティ原則

1. **Reentrancy Guard**: USDT送金関数は ReentrancyGuard を使用
2. **AccessControl**: 管理者権限を Role-based で分離
3. **Pausable**: 緊急時に全機能を停止できる Pausable を実装
4. **Pull over Push**: 報酬は直接Push送金するが、失敗時は Pull モデルにフォールバック
5. **Audit Trail**: 全ての重要操作で Event を発火

### 1.4 ガス最適化方針

- ストレージ書き込み最小化（packing）
- 配列ループは制限値を設定（100件まで等）
- 静的データは constant / immutable 利用
- バッチ処理で N回の処理を1トランザクションにまとめる

---

## 2. ClawsNFT.sol（メインNFTコントラクト）

### 2.1 概要

ERC-721 規格のNFTコントラクト。30体のキャラを表現し、ユーザーは USDT 300 を支払って指定のキャラをミント（購入）する。

### 2.2 主要な状態変数

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title ClawsNFT
 * @notice OPENCLAW Platform の30体キャラクター NFT
 * @dev ERC-721 + USDT決済 + 紹介者記録
 */
contract ClawsNFT is 
    ERC721,
    ERC721URIStorage,
    ERC721Enumerable,
    AccessControl,
    ReentrancyGuard,
    Pausable
{
    using ECDSA for bytes32;
    
    // ============================================
    // Roles
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant METADATA_UPDATER_ROLE = keccak256("METADATA_UPDATER_ROLE");
    
    // ============================================
    // Constants
    // ============================================
    
    /// @notice 30体のキャラクター総数
    uint8 public constant TOTAL_CHARACTERS = 30;
    
    /// @notice NFT 1体の価格（USDT、6 decimals）
    uint256 public constant PRICE_USDT = 300 * 10**6; // 300.000000 USDT
    
    /// @notice トークンID開始値
    uint256 public constant TOKEN_ID_START = 1;
    
    // ============================================
    // State Variables
    // ============================================
    
    /// @notice USDTコントラクトアドレス（Polygon版 USDT）
    IERC20 public immutable usdtToken;
    
    /// @notice 売上の受け取りアドレス（運営者ウォレット）
    address public treasuryAddress;
    
    /// @notice 各キャラの発行数（claw_no → 発行された数）
    /// 例: charactersCount[1] = 紅蓮の発行数
    mapping(uint8 => uint256) public charactersCount;
    
    /// @notice トークンID → キャラクター番号のマッピング
    mapping(uint256 => uint8) public tokenToCharacter;
    
    /// @notice トークンID → 紹介者アドレス（オフチェーン参照用、報酬分配で使用）
    mapping(uint256 => address) public tokenReferrer;
    
    /// @notice ベースURI（メタデータ）
    string private _baseTokenURI;
    
    /// @notice 次のトークンID
    uint256 private _nextTokenId = TOKEN_ID_START;
    
    /// @notice キャラクターごとの発行上限（0 = 無制限）
    /// 初期は無制限。MVP2以降で進化システムなどで使う可能性
    mapping(uint8 => uint256) public characterMaxSupply;
    
    /// @notice 緊急時の購入停止
    bool public mintingEnabled = true;
    
    // ============================================
    // Events
    // ============================================
    
    event CharacterMinted(
        address indexed buyer,
        uint256 indexed tokenId,
        uint8 indexed characterNo,
        address referrer,
        uint256 priceUSDT
    );
    
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event BaseURIUpdated(string newBaseURI);
    event MintingStatusChanged(bool enabled);
    event CharacterMaxSupplyUpdated(uint8 indexed characterNo, uint256 newMaxSupply);
    event TokenURIUpdated(uint256 indexed tokenId, string newURI);
    
    // ============================================
    // Errors
    // ============================================
    
    error InvalidCharacterNumber();
    error MintingDisabled();
    error InsufficientUSDTAllowance();
    error InsufficientUSDTBalance();
    error CharacterMaxSupplyReached();
    error InvalidAddress();
    error TransferFailed();
    error TokenDoesNotExist();
    
    // ============================================
    // Constructor
    // ============================================
    
    constructor(
        address _usdtAddress,
        address _treasury,
        string memory baseURI
    ) ERC721("OPENCLAW Claws", "CLAW") {
        if (_usdtAddress == address(0)) revert InvalidAddress();
        if (_treasury == address(0)) revert InvalidAddress();
        
        usdtToken = IERC20(_usdtAddress);
        treasuryAddress = _treasury;
        _baseTokenURI = baseURI;
        
        // 権限設定
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(METADATA_UPDATER_ROLE, msg.sender);
    }
    
    // ============================================
    // Core: Minting
    // ============================================
    
    /**
     * @notice キャラクターをミント（購入）する
     * @param characterNo キャラクター番号 (1〜30)
     * @param referrer 紹介者ウォレットアドレス（紹介者なしの場合は treasuryAddress を渡す）
     * @return tokenId 発行されたトークンID
     * 
     * @dev ユーザーは事前に USDT を approve しておく必要がある
     * @dev approve 額: PRICE_USDT (300 USDT)
     */
    function mintClaw(uint8 characterNo, address referrer) 
        external 
        whenNotPaused 
        nonReentrant 
        returns (uint256) 
    {
        // バリデーション
        if (!mintingEnabled) revert MintingDisabled();
        if (characterNo < 1 || characterNo > TOTAL_CHARACTERS) revert InvalidCharacterNumber();
        if (referrer == address(0)) revert InvalidAddress();
        
        // 発行上限チェック
        uint256 maxSupply = characterMaxSupply[characterNo];
        if (maxSupply > 0 && charactersCount[characterNo] >= maxSupply) {
            revert CharacterMaxSupplyReached();
        }
        
        // USDT 残高・許可量チェック
        if (usdtToken.balanceOf(msg.sender) < PRICE_USDT) revert InsufficientUSDTBalance();
        if (usdtToken.allowance(msg.sender, address(this)) < PRICE_USDT) revert InsufficientUSDTAllowance();
        
        // USDT を treasury へ転送
        bool success = usdtToken.transferFrom(msg.sender, treasuryAddress, PRICE_USDT);
        if (!success) revert TransferFailed();
        
        // トークンID 発行
        uint256 tokenId = _nextTokenId++;
        
        // 状態更新
        tokenToCharacter[tokenId] = characterNo;
        tokenReferrer[tokenId] = referrer;
        charactersCount[characterNo]++;
        
        // ミント実行
        _safeMint(msg.sender, tokenId);
        
        // メタデータURI設定
        _setTokenURI(tokenId, _generateTokenURI(tokenId, characterNo));
        
        // イベント発火
        emit CharacterMinted(msg.sender, tokenId, characterNo, referrer, PRICE_USDT);
        
        return tokenId;
    }
    
    // ============================================
    // Metadata
    // ============================================
    
    /**
     * @notice トークンのメタデータURIを生成
     * @dev ベースURI + キャラクター番号 + .json 形式
     * @dev 例: https://api.openclaw.com/metadata/01.json
     */
    function _generateTokenURI(uint256 tokenId, uint8 characterNo) 
        internal 
        view 
        returns (string memory) 
    {
        return string(
            abi.encodePacked(
                _baseTokenURI,
                _toString(characterNo),
                ".json"
            )
        );
    }
    
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (string memory) 
    {
        return super.tokenURI(tokenId);
    }
    
    /**
     * @notice ベースURIを更新（管理者のみ）
     */
    function setBaseURI(string memory newBaseURI) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }
    
    /**
     * @notice 個別トークンのURIを上書き（メタデータ更新）
     */
    function updateTokenURI(uint256 tokenId, string memory newURI)
        external
        onlyRole(METADATA_UPDATER_ROLE)
    {
        if (!_exists(tokenId)) revert TokenDoesNotExist();
        _setTokenURI(tokenId, newURI);
        emit TokenURIUpdated(tokenId, newURI);
    }
    
    // ============================================
    // Admin Functions
    // ============================================
    
    /**
     * @notice Treasury（売上受け取り先）を更新
     */
    function setTreasury(address newTreasury) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (newTreasury == address(0)) revert InvalidAddress();
        address oldTreasury = treasuryAddress;
        treasuryAddress = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }
    
    /**
     * @notice ミント機能のON/OFF
     */
    function setMintingEnabled(bool enabled) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        mintingEnabled = enabled;
        emit MintingStatusChanged(enabled);
    }
    
    /**
     * @notice 特定キャラクターの発行上限を設定
     * @param characterNo キャラクター番号
     * @param maxSupply 上限（0 = 無制限）
     */
    function setCharacterMaxSupply(uint8 characterNo, uint256 maxSupply) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (characterNo < 1 || characterNo > TOTAL_CHARACTERS) revert InvalidCharacterNumber();
        characterMaxSupply[characterNo] = maxSupply;
        emit CharacterMaxSupplyUpdated(characterNo, maxSupply);
    }
    
    /**
     * @notice 緊急停止
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @notice 停止解除
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    // ============================================
    // View Functions
    // ============================================
    
    /**
     * @notice あるユーザーが所持している全 Claws のリストを取得
     * @param owner 所有者アドレス
     * @return tokenIds 所有しているトークンIDの配列
     * @return characterNos 各トークンに対応するキャラクター番号
     */
    function getOwnerClaws(address owner) 
        external 
        view 
        returns (uint256[] memory tokenIds, uint8[] memory characterNos) 
    {
        uint256 balance = balanceOf(owner);
        tokenIds = new uint256[](balance);
        characterNos = new uint8[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(owner, i);
            tokenIds[i] = tokenId;
            characterNos[i] = tokenToCharacter[tokenId];
        }
    }
    
    /**
     * @notice あるトークンの紹介者を取得
     */
    function getTokenReferrer(uint256 tokenId) external view returns (address) {
        if (!_exists(tokenId)) revert TokenDoesNotExist();
        return tokenReferrer[tokenId];
    }
    
    /**
     * @notice あるユーザーが特定のキャラを所持しているかチェック
     */
    function ownsCharacter(address owner, uint8 characterNo) external view returns (bool) {
        uint256 balance = balanceOf(owner);
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(owner, i);
            if (tokenToCharacter[tokenId] == characterNo) return true;
        }
        return false;
    }
    
    // ============================================
    // Internal Helpers
    // ============================================
    
    /**
     * @dev uint to string 変換
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "00";
        
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        // 2桁にゼロパディング
        if (digits < 2) digits = 2;
        
        bytes memory buffer = new bytes(digits);
        uint256 index = digits;
        
        while (value != 0) {
            index--;
            buffer[index] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        // ゼロパディング
        while (index > 0) {
            index--;
            buffer[index] = bytes1(uint8(48));
        }
        
        return string(buffer);
    }
    
    // ============================================
    // Required Overrides
    // ============================================
    
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        override(ERC721, ERC721Enumerable) 
        returns (address) 
    {
        return super._update(to, tokenId, auth);
    }
    
    function _increaseBalance(address account, uint128 amount) 
        internal 
        override(ERC721, ERC721Enumerable) 
    {
        super._increaseBalance(account, amount);
    }
    
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, ERC721URIStorage, ERC721Enumerable, AccessControl) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}
```

### 2.3 主要な機能の動作詳細

#### `mintClaw(uint8 characterNo, address referrer)`

ユーザーがNFTを購入する際の処理。

**事前条件**:
1. ユーザーがフロントエンドで MetaMask 接続済み
2. ユーザーが事前に USDT 300 を approve 済み（コントラクトに対して）
3. ユーザーが USDT 300 以上を保有している

**処理フロー**:
```
1. バリデーション
   ・characterNo が 1〜30 の範囲内か
   ・referrer が ゼロアドレス でないか
   ・キャラの発行上限に達していないか
   ・ユーザーの USDT 残高・許可量が十分か

2. USDT 送金
   ・ユーザー → treasury（運営ウォレット）へ 300 USDT 移動

3. NFT ミント
   ・新しい token_id を発行
   ・tokenToCharacter[tokenId] に characterNo を記録
   ・tokenReferrer[tokenId] に referrer を記録
   ・charactersCount[characterNo] をインクリメント
   ・msg.sender にNFTを発行

4. メタデータURI設定
   ・https://api.openclaw.com/metadata/{characterNo}.json

5. イベント発火
   ・CharacterMinted イベント
```

**注意**: ユーザーが「紹介者なし」で買う場合、フロントエンドで `treasuryAddress`（運営アドレス）を `referrer` として渡す。これは **SPEC-00 で確定した「紹介者なしは運営にデフォルト紐付け」のオンチェーン実装**。

---

## 3. RewardDistributor.sol（紹介報酬の分配）

### 3.1 概要

紹介報酬を複数のユーザーに一括送金するコントラクト。

**設計判断**:
- MVP1 では **オフチェーン計算 → オンチェーン送金** のハイブリッド方式
- バックエンド（Cloudflare Workers）が紹介系図を辿って報酬を計算
- 計算結果（誰にいくら）をこのコントラクトに渡し、運営アドレスから一括送金
- 透明性のため、各送金は Event で記録される

### 3.2 実装

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title RewardDistributor
 * @notice 紹介報酬の分配コントラクト
 * @dev 運営アドレスから複数ユーザーへの一括送金
 */
contract RewardDistributor is AccessControl, ReentrancyGuard, Pausable {
    
    // ============================================
    // Roles
    // ============================================
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // ============================================
    // Constants
    // ============================================
    uint256 public constant MAX_BATCH_SIZE = 200;
    
    // ============================================
    // State Variables
    // ============================================
    IERC20 public immutable usdtToken;
    
    /// @notice バッチID → 配信実績
    mapping(bytes32 => DistributionRecord) public distributions;
    
    /// @notice ユーザー別の累計受取額
    mapping(address => uint256) public totalReceived;
    
    /// @notice 失敗時の Pull モード分のクレーム可能額
    mapping(address => uint256) public claimableBalance;
    
    struct DistributionRecord {
        bytes32 batchId;
        uint256 totalAmount;
        uint256 recipientCount;
        uint256 timestamp;
        bool exists;
    }
    
    // ============================================
    // Events
    // ============================================
    event RewardDistributed(
        bytes32 indexed batchId,
        address indexed recipient,
        uint256 amount,
        uint8 generation,
        bytes32 sourcePurchaseId
    );
    
    event BatchExecuted(
        bytes32 indexed batchId,
        uint256 totalAmount,
        uint256 recipientCount
    );
    
    event RewardFallbackToClaim(
        address indexed recipient,
        uint256 amount,
        bytes reason
    );
    
    event RewardClaimed(address indexed recipient, uint256 amount);
    
    // ============================================
    // Errors
    // ============================================
    error InvalidArrayLengths();
    error EmptyBatch();
    error BatchSizeExceeded();
    error BatchAlreadyProcessed();
    error InsufficientBalance();
    error TransferFailed();
    error NoClaimableBalance();
    error InvalidAddress();
    
    // ============================================
    // Structs (input)
    // ============================================
    
    struct RewardItem {
        address recipient;
        uint256 amount;
        uint8 generation;          // 1=直紹介、2=2世代上、3=3世代上
        bytes32 sourcePurchaseId;  // 元になった購入のID（オフチェーン記録のキー）
    }
    
    // ============================================
    // Constructor
    // ============================================
    
    constructor(address _usdtAddress) {
        if (_usdtAddress == address(0)) revert InvalidAddress();
        
        usdtToken = IERC20(_usdtAddress);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DISTRIBUTOR_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }
    
    // ============================================
    // Core: Batch Distribution
    // ============================================
    
    /**
     * @notice 複数の紹介報酬を一括送金する
     * @param batchId バッチの一意ID（オフチェーンで生成、二重実行防止）
     * @param rewards 報酬の配列（受取人、金額、世代、購入ID）
     * 
     * @dev DISTRIBUTOR_ROLE を持つアドレス（バックエンドのhot wallet）が呼び出す
     * @dev 事前に運営アドレスからこのコントラクトに USDT が approve または transfer されている必要がある
     */
    function distributeBatch(
        bytes32 batchId,
        RewardItem[] calldata rewards
    ) 
        external 
        onlyRole(DISTRIBUTOR_ROLE) 
        whenNotPaused 
        nonReentrant 
    {
        // バリデーション
        if (rewards.length == 0) revert EmptyBatch();
        if (rewards.length > MAX_BATCH_SIZE) revert BatchSizeExceeded();
        if (distributions[batchId].exists) revert BatchAlreadyProcessed();
        
        // 合計金額の事前計算
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < rewards.length; i++) {
            totalAmount += rewards[i].amount;
        }
        
        // コントラクトの USDT 残高チェック
        if (usdtToken.balanceOf(address(this)) < totalAmount) revert InsufficientBalance();
        
        // バッチ記録（再実行防止）
        distributions[batchId] = DistributionRecord({
            batchId: batchId,
            totalAmount: totalAmount,
            recipientCount: rewards.length,
            timestamp: block.timestamp,
            exists: true
        });
        
        // 各報酬を送金
        for (uint256 i = 0; i < rewards.length; i++) {
            RewardItem calldata reward = rewards[i];
            
            // 個別送金（失敗してもバッチは継続）
            try this._transferReward(reward.recipient, reward.amount) {
                // 成功
                totalReceived[reward.recipient] += reward.amount;
                
                emit RewardDistributed(
                    batchId,
                    reward.recipient,
                    reward.amount,
                    reward.generation,
                    reward.sourcePurchaseId
                );
            } catch (bytes memory reason) {
                // 失敗時は claimableBalance に積む（Pull モード）
                claimableBalance[reward.recipient] += reward.amount;
                
                emit RewardFallbackToClaim(reward.recipient, reward.amount, reason);
            }
        }
        
        emit BatchExecuted(batchId, totalAmount, rewards.length);
    }
    
    /**
     * @dev 個別の送金（external にすることで try/catch 可能に）
     */
    function _transferReward(address recipient, uint256 amount) external {
        require(msg.sender == address(this), "Only self");
        bool success = usdtToken.transfer(recipient, amount);
        if (!success) revert TransferFailed();
    }
    
    // ============================================
    // Pull Mode（送金失敗時のフォールバック）
    // ============================================
    
    /**
     * @notice 失敗した報酬をユーザー自身が引き出す
     */
    function claimReward() external nonReentrant whenNotPaused {
        uint256 amount = claimableBalance[msg.sender];
        if (amount == 0) revert NoClaimableBalance();
        
        claimableBalance[msg.sender] = 0;
        totalReceived[msg.sender] += amount;
        
        bool success = usdtToken.transfer(msg.sender, amount);
        if (!success) {
            // 戻す
            claimableBalance[msg.sender] = amount;
            totalReceived[msg.sender] -= amount;
            revert TransferFailed();
        }
        
        emit RewardClaimed(msg.sender, amount);
    }
    
    // ============================================
    // Admin
    // ============================================
    
    /**
     * @notice 緊急時に USDT を引き出す
     */
    function emergencyWithdraw(address to, uint256 amount) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (to == address(0)) revert InvalidAddress();
        bool success = usdtToken.transfer(to, amount);
        if (!success) revert TransferFailed();
    }
    
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    // ============================================
    // View
    // ============================================
    
    function getDistribution(bytes32 batchId) 
        external 
        view 
        returns (DistributionRecord memory) 
    {
        return distributions[batchId];
    }
    
    function getClaimableBalance(address user) external view returns (uint256) {
        return claimableBalance[user];
    }
    
    function getTotalReceived(address user) external view returns (uint256) {
        return totalReceived[user];
    }
}
```

### 3.3 報酬分配のオペレーションフロー

```
1. 日次バッチ起動（Cloudflare Workers Cron）
   毎日0時（JST）

2. バックエンドで報酬計算
   ・過去24時間の confirmed な nft_purchases を取得
   ・各購入について、紹介系図を辿る（最大3世代）
   ・各報酬対象に金額を計算
   ・ DBの referral_rewards テーブルに保存
   ・ batchId を生成（例: keccak256("batch-2026-04-29-001")）

3. 運営ウォレットから RewardDistributor へ USDT 転送
   ・batch合計額をtransfer
   ・コントラクト内に USDT 残高ができる

4. distributeBatch() 呼び出し
   ・runtime: バックエンドのhot wallet (DISTRIBUTOR_ROLE)
   ・gas: hot wallet が支払う
   ・引数: batchId, RewardItem[]

5. 各報酬がオンチェーンで送金される
   ・成功: RewardDistributed イベント
   ・失敗: claimableBalance に積まれる、ユーザーは後で claimReward()

6. バックエンドでイベントを取得
   ・成功・失敗を反映して reward_distributions / referral_rewards テーブル更新
   ・通知システム（SPEC-08）でユーザーに通知
```

---

## 4. デプロイ手順

### 4.1 Foundry プロジェクトセットアップ

```bash
# プロジェクト初期化（既存のリポジトリ内 apps/contracts/）
cd apps/contracts
forge init . --no-commit
forge install OpenZeppelin/openzeppelin-contracts@v5.0.0 --no-commit

# foundry.toml の設定
```

`foundry.toml`:
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.20"
optimizer = true
optimizer_runs = 200
via_ir = false

[rpc_endpoints]
polygon = "${POLYGON_RPC_URL}"
amoy = "${AMOY_RPC_URL}"

[etherscan]
polygon = { key = "${POLYGONSCAN_API_KEY}", chain = 137 }
amoy = { key = "${POLYGONSCAN_API_KEY}", chain = 80002 }
```

### 4.2 デプロイスクリプト

`script/Deploy.s.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ClawsNFT.sol";
import "../src/RewardDistributor.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY_DEPLOYER");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address usdtAddress = vm.envAddress("USDT_ADDRESS");
        string memory baseURI = vm.envString("BASE_URI");
        
        vm.startBroadcast(deployerKey);
        
        // 1. ClawsNFT デプロイ
        ClawsNFT clawsNFT = new ClawsNFT(
            usdtAddress,
            treasury,
            baseURI
        );
        console.log("ClawsNFT deployed at:", address(clawsNFT));
        
        // 2. RewardDistributor デプロイ
        RewardDistributor rewardDistributor = new RewardDistributor(usdtAddress);
        console.log("RewardDistributor deployed at:", address(rewardDistributor));
        
        // 3. RewardDistributor に DISTRIBUTOR_ROLE を bot wallet に付与
        address botWallet = vm.envAddress("BOT_WALLET_ADDRESS");
        rewardDistributor.grantRole(rewardDistributor.DISTRIBUTOR_ROLE(), botWallet);
        console.log("Granted DISTRIBUTOR_ROLE to:", botWallet);
        
        vm.stopBroadcast();
    }
}
```

### 4.3 デプロイコマンド

```bash
# Amoy testnet にデプロイ
forge script script/Deploy.s.sol --rpc-url amoy --broadcast --verify

# Polygon mainnet にデプロイ
forge script script/Deploy.s.sol --rpc-url polygon --broadcast --verify
```

### 4.4 デプロイ後の設定

```bash
# 環境変数に追加（デプロイされたアドレスを記録）
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_REWARD_CONTRACT_ADDRESS=0x...

# Polygonscan で verify
forge verify-contract <ADDRESS> ClawsNFT --rpc-url polygon
```

---

## 5. テスト

### 5.1 主要なテストケース

`test/ClawsNFT.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ClawsNFT.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// テスト用のモック USDT
contract MockUSDT is ERC20 {
    constructor() ERC20("Tether USD", "USDT") {}
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract ClawsNFTTest is Test {
    ClawsNFT public clawsNFT;
    MockUSDT public usdt;
    
    address public deployer = address(1);
    address public treasury = address(2);
    address public buyer = address(3);
    address public referrer = address(4);
    
    uint256 public constant PRICE = 300 * 10**6;
    
    function setUp() public {
        vm.startPrank(deployer);
        
        usdt = new MockUSDT();
        clawsNFT = new ClawsNFT(
            address(usdt),
            treasury,
            "https://api.openclaw.com/metadata/"
        );
        
        vm.stopPrank();
        
        // buyer に USDT を付与
        usdt.mint(buyer, PRICE * 10);
    }
    
    function test_MintClaw_Success() public {
        vm.startPrank(buyer);
        
        // 事前に approve
        usdt.approve(address(clawsNFT), PRICE);
        
        // ミント実行（紅蓮 = 1番）
        uint256 tokenId = clawsNFT.mintClaw(1, referrer);
        
        // 検証
        assertEq(tokenId, 1);
        assertEq(clawsNFT.ownerOf(tokenId), buyer);
        assertEq(clawsNFT.tokenToCharacter(tokenId), 1);
        assertEq(clawsNFT.tokenReferrer(tokenId), referrer);
        assertEq(clawsNFT.charactersCount(1), 1);
        assertEq(usdt.balanceOf(treasury), PRICE);
        
        vm.stopPrank();
    }
    
    function test_MintClaw_Revert_InvalidCharacter() public {
        vm.startPrank(buyer);
        usdt.approve(address(clawsNFT), PRICE);
        
        // 0番（無効）
        vm.expectRevert(ClawsNFT.InvalidCharacterNumber.selector);
        clawsNFT.mintClaw(0, referrer);
        
        // 31番（無効）
        vm.expectRevert(ClawsNFT.InvalidCharacterNumber.selector);
        clawsNFT.mintClaw(31, referrer);
        
        vm.stopPrank();
    }
    
    function test_MintClaw_Revert_InsufficientAllowance() public {
        vm.startPrank(buyer);
        // approve なし
        
        vm.expectRevert(ClawsNFT.InsufficientUSDTAllowance.selector);
        clawsNFT.mintClaw(1, referrer);
        
        vm.stopPrank();
    }
    
    function test_MintClaw_Revert_WhenPaused() public {
        // 管理者が pause
        vm.prank(deployer);
        clawsNFT.pause();
        
        vm.startPrank(buyer);
        usdt.approve(address(clawsNFT), PRICE);
        
        vm.expectRevert();
        clawsNFT.mintClaw(1, referrer);
        
        vm.stopPrank();
    }
    
    function test_MintClaw_MultipleSameCharacter() public {
        // 同じキャラを複数発行できることを確認
        vm.startPrank(buyer);
        usdt.approve(address(clawsNFT), PRICE * 3);
        
        uint256 tokenId1 = clawsNFT.mintClaw(1, referrer);
        uint256 tokenId2 = clawsNFT.mintClaw(1, referrer);
        uint256 tokenId3 = clawsNFT.mintClaw(1, referrer);
        
        assertEq(tokenId1, 1);
        assertEq(tokenId2, 2);
        assertEq(tokenId3, 3);
        assertEq(clawsNFT.charactersCount(1), 3);
        
        vm.stopPrank();
    }
    
    function test_GetOwnerClaws() public {
        vm.startPrank(buyer);
        usdt.approve(address(clawsNFT), PRICE * 3);
        
        clawsNFT.mintClaw(1, referrer);
        clawsNFT.mintClaw(5, referrer);
        clawsNFT.mintClaw(15, referrer);
        
        (uint256[] memory tokenIds, uint8[] memory characterNos) = clawsNFT.getOwnerClaws(buyer);
        
        assertEq(tokenIds.length, 3);
        assertEq(characterNos[0], 1);
        assertEq(characterNos[1], 5);
        assertEq(characterNos[2], 15);
        
        vm.stopPrank();
    }
    
    function test_OwnsCharacter() public {
        vm.startPrank(buyer);
        usdt.approve(address(clawsNFT), PRICE);
        clawsNFT.mintClaw(7, referrer);
        vm.stopPrank();
        
        assertTrue(clawsNFT.ownsCharacter(buyer, 7));
        assertFalse(clawsNFT.ownsCharacter(buyer, 8));
        assertFalse(clawsNFT.ownsCharacter(referrer, 7));
    }
    
    function test_TransferTokenChangesOwnership() public {
        // 売却したらライセンスが切れることのテスト（オフチェーン側で扱う）
        vm.startPrank(buyer);
        usdt.approve(address(clawsNFT), PRICE);
        uint256 tokenId = clawsNFT.mintClaw(1, referrer);
        
        // 別のアドレスへ転送
        clawsNFT.transferFrom(buyer, address(99), tokenId);
        
        assertEq(clawsNFT.ownerOf(tokenId), address(99));
        assertFalse(clawsNFT.ownsCharacter(buyer, 1));
        assertTrue(clawsNFT.ownsCharacter(address(99), 1));
        
        vm.stopPrank();
    }
}
```

### 5.2 RewardDistributor のテスト

`test/RewardDistributor.t.sol`:

```solidity
// 主要テストケース:
// 1. test_DistributeBatch_Success
// 2. test_DistributeBatch_PreventDoubleProcess
// 3. test_DistributeBatch_FallbackToClaim
// 4. test_ClaimReward_Success
// 5. test_DistributeBatch_BatchSizeExceeded
// 6. test_OnlyDistributorRole_CanDistribute

// 詳細実装は実装フェーズで Claude Code が記述
```

---

## 6. ガス見積もり

### 6.1 想定ガス消費（Polygon）

| 関数 | 想定ガス | USD換算（@0.1 USD/POL, 50 gwei） |
|------|---------|--------------------------------|
| `mintClaw()` | 約 200,000 gas | 約 $0.001 |
| `distributeBatch(50 items)` | 約 1,500,000 gas | 約 $0.008 |
| `claimReward()` | 約 60,000 gas | 約 $0.0003 |
| `transferFrom()` (NFT転送) | 約 90,000 gas | 約 $0.0005 |

ガス代は Polygon ネットワークの混雑度による。実測は Amoy でテスト時に確認。

---

## 7. セキュリティ・監査チェックリスト

### 7.1 必須チェック項目

- [ ] **Reentrancy**: nonReentrant 装飾子を全ての送金関数に
- [ ] **Integer Overflow**: Solidity 0.8.x なので自動チェック
- [ ] **AccessControl**: 全ての admin 関数に onlyRole
- [ ] **Pausable**: 全ての state-changing 関数に whenNotPaused
- [ ] **ECDSA Signature**: 必要に応じて署名検証
- [ ] **Event Emission**: 全ての重要操作で Event 発火
- [ ] **External Call Safety**: try/catch で失敗をキャッチ
- [ ] **Input Validation**: 全ての public/external 関数の引数チェック
- [ ] **State Variable Visibility**: 適切な可視性（public/private/internal）
- [ ] **Use SafeERC20**: USDT などERC20 trasnferFrom が false を返す可能性を考慮（Polygon版 USDTは return false の可能性あり、`require(success)` で対応）

### 7.2 監査推奨

MVP1 ローンチ前に、以下のいずれかを推奨：
- **Slither** によるStaticAnalysis（無料、自分で実行）
- **CertiK / Hacken / OpenZeppelin** などへの監査依頼（数百〜数千万円）

最低限、Slither を必ず実行すること。

```bash
# Slither 実行
slither apps/contracts/src/
```

---

## 8. メタデータ仕様

### 8.1 メタデータJSONの構造

各 NFT のメタデータは標準ERC-721形式に準拠。

```json
{
  "name": "Claw No.01 - 紅蓮 / Guren",
  "description": "OPENCLAW Platform Claw NFT - 悪魔・炎の戦士。紅蓮は地獄の業火より召喚されし、OPENCLAW最初の戦士である。",
  "image": "https://api.openclaw.com/images/01_guren.png",
  "external_url": "https://openclaw.com/claws/01-guren",
  "attributes": [
    {
      "trait_type": "Number",
      "value": 1
    },
    {
      "trait_type": "Name",
      "value": "Guren"
    },
    {
      "trait_type": "Type",
      "value": "Demon"
    },
    {
      "trait_type": "Element",
      "value": "Flame"
    },
    {
      "trait_type": "Gender",
      "value": "Male"
    },
    {
      "trait_type": "Origin",
      "value": "Valley of Flames"
    }
  ]
}
```

### 8.2 メタデータホスティング

`https://api.openclaw.com/metadata/{characterNo}.json`

メタデータは Cloudflare Workers + Cloudflare R2 で配信する。

実装は SPEC-11 で詳細化。

---

## 9. NFT保有状態の同期（オフチェーン）

### 9.1 同期の必要性

データベース側の `nft_tokens.is_active` を、オンチェーンの実際の所有状態と一致させる必要がある。

NFT が転送・売却された場合：
- オンチェーン: 即座に新しい所有者に移動
- オフチェーン（DB）: バッチ処理で同期

### 9.2 同期ロジック（Cloudflare Workers Cron）

```typescript
// apps/workers/nft-sync/src/index.ts

import { createPublicClient, http } from 'viem';
import { polygon } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';

export default {
  async scheduled(event, env) {
    const client = createPublicClient({
      chain: polygon,
      transport: http(env.POLYGON_RPC_URL),
    });
    
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    
    // 1. DBから全NFTのリストを取得
    const { data: nfts } = await supabase
      .from('nft_tokens')
      .select('*')
      .eq('is_active', true);
    
    // 2. 各NFTのオンチェーン所有者を確認
    for (const nft of nfts) {
      const onChainOwner = await client.readContract({
        address: env.NFT_CONTRACT_ADDRESS,
        abi: ClawsNFTABI,
        functionName: 'ownerOf',
        args: [BigInt(nft.token_id)],
      });
      
      // 3. DB上の所有者と異なる場合
      if (onChainOwner.toLowerCase() !== nft.owner_wallet_address.toLowerCase()) {
        // 所有者更新
        await supabase
          .from('nft_tokens')
          .update({
            owner_wallet_address: onChainOwner.toLowerCase(),
            owner_user_id: await getUserIdByWallet(onChainOwner, supabase),
            last_verified_at: new Date().toISOString(),
            // 旧所有者のサイトを停止
          })
          .eq('id', nft.id);
        
        // 旧所有者の関連サービス（HP、Bot権限）を停止
        await deactivateUserServices(nft.owner_user_id, nft.token_id);
      }
    }
  }
};
```

実行頻度: **毎日1回（深夜0時）**。リアルタイム同期は不要。

---

## 10. 緊急対応プラン

### 10.1 想定される緊急事態

| 事態 | 対応 |
|------|------|
| 脆弱性発見 | `pause()` で全機能停止 → 修正版デプロイ → ユーザー通知 |
| 私鍵漏洩 | DEFAULT_ADMIN_ROLE で別アドレスに権限移譲 → 旧アドレスの権限剥奪 |
| Treasury 受け取りミス | `setTreasury()` で正しいアドレスに変更 |
| Bot Wallet (DISTRIBUTOR_ROLE) 漏洩 | 即座に role 剥奪 → 新しい hot wallet を grant |
| バグによる分配ミス | `emergencyWithdraw()` で資金回収 → 正しい配分で再実行 |

### 10.2 即時対応のための準備

- 管理者の MetaMask は MultiSig（Safe Wallet）を推奨（MVP2以降）
- ペーパーウォレットでバックアップ
- 緊急連絡先リスト（仁さん、開発担当、弁護士）

---

## 11. Claude Code への実装指示テンプレート

```
[コンテキスト]
- プロジェクト: OPENCLAW Platform
- 関連仕様書: SPEC-02 NFT・スマートコントラクト
- 対象: apps/contracts/ ディレクトリ

[タスク]
SPEC-02 に記載されている Solidity スマートコントラクトを実装してください。

[具体的な要件]
1. apps/contracts/ 配下に Foundry プロジェクトを作成
2. ClawsNFT.sol を実装（仕様書のコードをベースに）
3. RewardDistributor.sol を実装
4. test/ に十分なテストを書く（最低 80% カバレッジ）
5. script/Deploy.s.sol を作成
6. README.md にデプロイ手順を記載

[出力形式]
- 全 Solidity ファイル
- テストファイル
- デプロイスクリプト
- foundry.toml
- README.md

[禁止事項]
- 仕様書から逸脱しない
- 30体のキャラ番号や価格を変更しない
- セキュリティチェックリストを無視しない
- テストを省略しない
```

---

## 12. 改訂履歴

| 日付 | 改訂内容 | 担当 |
|------|---------|------|
| 2026-04-29 | 初版 | Claude (with 仁さん) |

---

**END OF SPEC-02**

次のドキュメント: SPEC-03 紹介報酬システム
