# Polygon Amoy Testnet セットアップガイド

> **目的**: SPEC-02 のスマートコントラクト（ClawsNFT, RewardDistributor）をデプロイ・テストするための Polygon Amoy（テストネット）環境を整備する手順を記載する。
>
> **関連**: SPEC-02 §4（デプロイ手順）、SPEC-11 §3.2（スマコンデプロイ）

---

## 1. 前提

- Phase 3（NFT・購入フロー）着手前に必要
- ブロックチェーン操作の基本知識（ウォレット、ガス代、トランザクション）
- MetaMask（または同等のウォレット）

---

## 2. ネットワーク情報

### Polygon Amoy

| 項目 | 値 |
|---|---|
| **Chain ID** | 80002 |
| **Network Name** | Polygon Amoy |
| **公式 RPC URL** | `https://rpc-amoy.polygon.technology` |
| **代替 RPC** | `https://polygon-amoy.drpc.org`（dRPC） / `https://polygon-amoy-bor-rpc.publicnode.com` |
| **Block Explorer** | https://amoy.polygonscan.com |
| **通貨シンボル** | POL（旧 MATIC） |

### Polygon Mainnet（参考、本番用）

| 項目 | 値 |
|---|---|
| **Chain ID** | 137 |
| **公式 RPC URL** | `https://polygon-rpc.com`（本番では Alchemy / QuickNode 等の独自 RPC を推奨） |
| **Block Explorer** | https://polygonscan.com |
| **USDT アドレス** | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F`（固定） |

---

## 3. MetaMask に Amoy を追加

### 自動追加
1. https://chainlist.org/?testnets=true&search=amoy にアクセス
2. 「Polygon Amoy Testnet」を見つけて「Connect Wallet」→「Add to MetaMask」

### 手動追加
MetaMask の「ネットワーク追加」→「ネットワークを手動で追加」で上記の値を入力。

---

## 4. テスト用 POL（旧 MATIC）の入手

スマコンのデプロイとトランザクションにはガス代として POL が必要。

### Faucet（複数候補、混雑時用に複数試す）

| Faucet | URL | 1日上限 | 必要要件 |
|---|---|---|---|
| **Polygon 公式 Faucet** | https://faucet.polygon.technology/ | 0.5 POL / 24h | Discord ログイン |
| **Alchemy Amoy Faucet** | https://www.alchemy.com/faucets/polygon-amoy | 0.5 POL / 24h | Alchemy アカウント |
| **QuickNode Amoy Faucet** | https://faucet.quicknode.com/polygon/amoy | 0.05 POL / 12h | Twitter ログイン |
| **Tatum Amoy Faucet** | https://tatum.io/faucets/polygon | 制限あり | 無料アカウント |

**推奨**: **Polygon 公式** または **Alchemy** から開始。1日 0.5 POL あればテストネットでのデプロイ・購入テストは数十回可能。

### 取得手順（Polygon 公式の場合）

1. https://faucet.polygon.technology/ を開く
2. 「Polygon Amoy」を選択
3. 自分のウォレットアドレスを入力
4. Discord 認証（初回のみ）
5. 「Submit」→ 数分以内に着金（amoy.polygonscan.com で確認）

---

## 5. テスト用 USDT の入手

`mintClaw()` のテストには 300 USDT 相当が必要。Amoy には公式 USDT がないので **以下のいずれか**を選択：

### 方式 A: モック USDT を自前デプロイ（推奨）

SPEC-02 §5 のテストファイル `test/ClawsNFT.t.sol` で使われている `MockUSDT` をそのまま Amoy にデプロイし、自分で mint する。

```bash
cd apps/contracts

# .env.local に Amoy 用の値を入れる
# AMOY_RPC_URL=https://rpc-amoy.polygon.technology
# PRIVATE_KEY_DEPLOYER=<your-amoy-test-wallet-private-key>

# モック USDT のデプロイ用スクリプトを script/DeployMockUSDT.s.sol に作成（Phase 3 で実装）
forge script script/DeployMockUSDT.s.sol \
  --rpc-url $AMOY_RPC_URL \
  --broadcast \
  --verify

# 自分のテストウォレットに 10,000 USDT を mint
cast send <MOCK_USDT_ADDRESS> "mint(address,uint256)" \
  <YOUR_TEST_WALLET> 10000000000 \
  --rpc-url $AMOY_RPC_URL \
  --private-key $PRIVATE_KEY_DEPLOYER
```

注意: モック USDT は `decimals = 6` で実装する。`mint(address, 10000000000)` で 10,000.000000 USDT になる。

### 方式 B: Aave Faucet からテスト USDT（手早いが用途限定）

Aave V3 testnet faucet が Amoy 上で複数のテストトークンを配布している:
- https://staging.aave.com/faucet/ → Amoy ネットワーク選択 → USDT を選んで 10,000 USDT を mint

**注意**: Aave の testUSDT は SPEC-02 で本番想定している USDT のアドレスとは異なるため、テスト用にコントラクトの USDT アドレス引数を上書きして使う必要がある。Mainnet 想定の動作を完全に再現するには方式 A が確実。

---

## 6. デプロイ用ウォレットの作成

**最重要: 本番用と完全に別のウォレットを作成すること。** 秘密鍵をテスト用に使い回すのは禁止。

### 手順

1. MetaMask で「アカウント追加」→「アカウントを作成」（"openclaw-amoy-deploy" 等の名前）
2. このアカウントを Amoy ネットワークに切り替え
3. 「アカウントの詳細」→「秘密鍵をエクスポート」
4. 秘密鍵を `.env.local` の `PRIVATE_KEY_DEPLOYER` に保存（`.gitignore` で除外済みを確認）
5. 上記の Faucet で POL を入金（0.5 POL あれば十分）

### 残高確認

```bash
# POL 残高
cast balance <YOUR_WALLET_ADDRESS> --rpc-url $AMOY_RPC_URL

# モック USDT 残高（方式 A 採用後）
cast call <MOCK_USDT_ADDRESS> "balanceOf(address)" <YOUR_WALLET_ADDRESS> \
  --rpc-url $AMOY_RPC_URL
```

---

## 7. Polygonscan API キー（自動 Verify 用）

スマコンデプロイ後、コードを Polygonscan で公開検証するために API キーが必要。

### 取得手順

1. https://polygonscan.com/register でアカウント作成
2. https://polygonscan.com/myapikey で API キーを生成
3. `.env.local` の `POLYGONSCAN_API_KEY` に設定

**注意**: Amoy と Mainnet は同じ API キーで運用可能。

---

## 8. Phase 3 着手前のチェックリスト

```
□ MetaMask に Amoy ネットワーク追加完了
□ デプロイ用ウォレット作成完了（本番と分離）
□ ウォレットに POL >= 0.5 取得
□ Polygonscan API キー取得・.env.local に設定
□ 方式 A 採用予定なら MockUSDT デプロイ準備
□ apps/contracts/foundry.toml の準備（Phase 3 で実装）
```

---

## 9. よくあるトラブル

### Faucet で POL がもらえない
- Discord アカウントが新しすぎる場合、Polygon 公式 Faucet が拒否することがある
- 別 Faucet（Alchemy, QuickNode）を試す
- Twitter ログイン形式の faucet を試す

### `forge script ... --verify` が失敗する
- Polygonscan の API レート制限に引っかかっている可能性 → 数分待って再試行
- Solidity バージョンと最適化設定が `foundry.toml` と完全一致しているか確認

### Amoy RPC が timeout する
- 公式 RPC は混雑する。dRPC や PublicNode の代替 RPC に切り替える
- 本番では Alchemy / QuickNode の独自 RPC を必ず使う

### nonce が合わない
- MetaMask とコマンドラインで送ったトランザクションが競合している可能性
- `cast nonce <ADDRESS> --rpc-url $AMOY_RPC_URL` で確認し、`--nonce` で明示指定

---

## 10. Mainnet 移行時の注意

Amoy で全テスト完了後の本番デプロイ前に必ず：

1. **MultiSig ウォレット推奨**（Safe Wallet を運営者の本番アドレスに設定）
2. POL を実価で購入（Mainnet ではテスト faucet 不可）
3. RPC は **Alchemy / QuickNode の独自 URL** に切替（公式 RPC は本番運用で不安定）
4. SPEC-02 §7 のセキュリティチェックリストを完全に消化
5. **Slither** によるスタティック解析を実施（最低限）

---

## 参考

- SPEC-02（NFT・スマートコントラクト）
- SPEC-11 §3.2（スマコンデプロイ手順）
- Polygon 公式ドキュメント: https://docs.polygon.technology/
- Foundry Book: https://book.getfoundry.sh/
