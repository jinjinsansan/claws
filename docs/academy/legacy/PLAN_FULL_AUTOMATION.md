# AI Builders Lab — 全自動パイプライン仕様書

**作成日**: 2026-04-24
**ステータス**: 設計フェーズ
**コンセプト**: AI個人開発で何でも作れるアカデミー（競馬AI・Dlogicの要素なし）

---

## 1. 全体像 — 集客→教育→販売→サポートの完全自動化

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Builders Lab 自動化パイプライン              │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │  ① 集客   │ →  │  ② 教育   │ →  │  ③ 販売   │ →  │  ④ 運営   │   │
│  │          │    │          │    │          │    │          │   │
│  │ note記事  │    │ LP閲覧    │    │ Stripe   │    │ メール   │   │
│  │ X投稿    │    │ 無料動画   │    │ 決済     │    │ サポート  │   │
│  │ SEO      │    │ メルマガ   │    │ Webhook  │    │ 会員     │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│       ↑                                              ↓          │
│       └──────────── Claude API で全記事自動生成 ───────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. ① 集客パイプライン（自動）

### 2.1 noteブログ記事 自動投稿

**目的**: SEO + note内検索でオーガニック流入を獲得

| 項目 | 内容 |
|------|------|
| 投稿頻度 | 週3〜5本（平日毎日 or 月水金） |
| 投稿時間 | 朝7:00 JST（note閲覧ピーク帯） |
| 記事長 | 1500〜3000字 |
| AI生成 | Claude Sonnet 4 で自動生成 |
| 投稿方法 | Playwright 経由で note.com に自動ログイン＆投稿 |
| CTA | 記事末尾に LP（AI Builders Lab）へのリンク |

**記事カテゴリ（ローテーション）**:

| カテゴリ | 例 | 目的 |
|---------|-----|------|
| AI開発入門 | 「Claude Codeで初めてのWebアプリを作る方法」 | 初心者獲得 |
| 実践チュートリアル | 「Supabase × Next.jsで会員サイトを30分で作る」 | 技術者層獲得 |
| AI業界ニュース解説 | 「GPT-5が出た今、個人開発者がやるべき3つのこと」 | トレンド層獲得 |
| 成功事例 | 「プログラミング未経験の主婦がAIで月5万円稼いだ話」 | 共感・欲求喚起 |
| マインドセット | 「なぜ今AIを学ばないと手遅れになるのか」 | 危機感・行動喚起 |

**スクリプト**: `scripts/auto_note_post.py`
- `~/dlogic-note/danger/services/note_poster.py` を参考に実装
- 記事テンプレート＋Claude API → Markdown生成 → note投稿 → Supabase記録

### 2.2 X（Twitter）自動投稿

**目的**: 拡散力のあるXで認知・LPへの誘導

| 項目 | 内容 |
|------|------|
| 投稿頻度 | 1日2〜3ツイート |
| 投稿時間 | 7:30 / 12:00 / 19:00 JST |
| 種類 | 通常ツイート + note記事シェア + スレッド |
| AI生成 | Claude Haiku 4（コスト抑制） |
| 投稿方法 | Tweepy (X API v2 Free Tier) |
| CTA | プロフ固定ツイートにLP直リンク |

**投稿テンプレート**:

```
① 価値提供ツイート（7:30）
「AIで○○が作れるって知ってましたか？
プログラミング不要で、実際に動くアプリが30分で完成。
方法はプロフのリンクから👇」

② note記事シェア（12:00）
「【新着記事】○○の作り方を解説しました
{note_url}
#AI開発 #個人開発 #ノーコード」

③ 実績・フック（19:00）
「今週もAIだけで新しいプロダクトを1つリリースした。
かかった時間は3時間。
昔なら3ヶ月かかった。
→ この差を生むのが "AIへの指示力" です。」
```

**スクリプト**: `scripts/auto_x_post.py`
- `~/dlogic-note/danger/services/x_poster.py` を参考に実装

### 2.3 SEO（LP自体の検索流入）

| 対策 | 実装方法 |
|------|---------|
| メタタグ最適化 | `layout.tsx` の metadata を充実 |
| OGP画像 | 自動生成 or 手動（Vercel OG Image） |
| sitemap.xml | Next.js の `app/sitemap.ts` で自動生成 |
| 構造化データ | JSON-LD（Course / Organization スキーマ） |
| ページ速度 | 画像最適化 + next/image |

---

## 3. ② 教育パイプライン

### 3.1 LP（ランディングページ）

**URL**: `https://dlc-sigma.vercel.app/`（本番ドメイン設定後に変更）

**セクション構成（集客特化リデザイン）**:

| # | セクション | 目的 | 改善ポイント |
|---|-----------|------|-------------|
| 1 | Hero | 第一印象・興味喚起 | 具体的な数値（「3つのAIプロダクトを開発」等） |
| 2 | Pain（悩み） | **新規追加** — 共感・問題提起 | 「こんな悩みありませんか？」パターン |
| 3 | Era Change | 時代変化の認識 | 現状のまま（良い出来） |
| 4 | Achievement | 実績提示 | プレースホルダー → 具体的な成果物 |
| 5 | Social Proof | **新規追加** — 受講者の声 | テスティモニアル3〜5件 |
| 6 | About | コンセプト説明 | 現状のまま |
| 7 | Curriculum | カリキュラム | 現状のまま |
| 8 | Pricing | 料金プラン | 現状のまま |
| 9 | FAQ | よくある質問 | 現状のまま |
| 10 | CTA | 行動喚起 | カウントダウンタイマー追加 |

### 3.2 無料ローンチ動画（4話構成）

| 話 | タイトル | 内容 | CTA |
|----|---------|------|-----|
| 1 | AIが変えた、個人開発の常識 | 時代変化・チャンス提示 | 次の話へ |
| 2 | 私のAIプロダクトはこうして生まれた | 開発実録・ツール紹介 | 次の話へ |
| 3 | あなたにも同じことができる理由 | ロードマップ・不安解消 | 次の話へ |
| 4 | AI Builders Lab、始まります | サロン全貌・料金・CTA | 申し込みページへ |

**動画配信**: Cloudflare Stream（埋め込み）
**メール**: 動画公開通知を自動送信（Supabase Edge Functions or Resend）

### 3.3 メルマガ（ステップメール）

登録後に自動で5通のステップメールを配信：

| 日 | 件名 | 内容 |
|----|------|------|
| Day 0 | ご登録ありがとうございます | 自己紹介 + 第1話リンク |
| Day 1 | 「AIで作れるもの」の衝撃リスト | 事例20選 + 第2話リンク |
| Day 3 | 受講者Aさんの変化 | 成功事例 + 第3話リンク |
| Day 5 | よくある質問にお答えします | FAQ + 第4話リンク |
| Day 7 | 【残りわずか】1期生の募集について | 限定性 + 申し込みCTA |

**配信**: Resend API（月3,000通無料）or Supabase Edge Functions + SMTP

---

## 4. ③ 決済パイプライン（自動）

### 4.1 Stripe 決済フロー

```
ユーザー → /apply → プラン選択 → Stripe Checkout
                                      ↓
                               Stripe Webhook
                                      ↓
                            Supabase users テーブル更新
                            (email, plan, stripe_session_id)
                                      ↓
                            自動ウェルカムメール送信
                                      ↓
                            会員エリア /members アクセス可能
```

**既存実装（流用可）**:
- `src/app/api/checkout/route.ts` — Checkout Session 作成 ✅
- `src/app/api/webhook/route.ts` — Webhook 受信・ユーザー登録 ✅
- `src/lib/stripe.ts` — Stripe クライアント ✅
- `src/lib/plans.ts` — プラン定義 ✅

**追加実装が必要**:
- ウェルカムメール自動送信（Webhook内で Resend API 呼び出し）
- 領収書自動送信（Stripe標準機能を有効化）
- サブスク管理ポータル（`/api/billing-portal` は既に雛形あり）

### 4.2 料金プラン

| プラン | 価格（税込） | 内容 |
|--------|------------|------|
| 動画のみ | ¥49,800 | 全8週分の講義動画 + 資料DL |
| 動画 + メールサポート | ¥98,000 | 上記 + 個別メール相談無制限 |
| Zoom型（1期生） | ¥150,000 | 上記 + 週1 Zoom + コミュニティ6ヶ月 |

---

## 5. ④ 運営パイプライン（半自動）

### 5.1 サポートメール自動化

| 機能 | 実装 |
|------|------|
| 受信 | 専用メールアドレス（support@ai-builders-lab.com） |
| 自動応答 | 受信直後に「24時間以内に返信します」自動返信 |
| チケット管理 | Supabase `support_tickets` テーブル |
| 通知 | 新規チケット → Telegram Bot で仁さんに通知 |
| AI下書き | Claude API でサポート返信の下書きを自動生成 |
| 送信 | 仁さんが確認後、ワンクリックで送信（管理画面から） |

**実装**: `src/app/admin/tickets/page.tsx`（既に雛形あり）を拡張

### 5.2 会員エリア

| ページ | パス | 機能 | 状態 |
|--------|------|------|------|
| ダッシュボード | `/members/dashboard` | 進捗・お知らせ | 雛形あり |
| 動画一覧 | `/members/videos` | 講義動画視聴 | 雛形あり |
| 資料DL | `/members/materials` | PDF/資料ダウンロード | 雛形あり |
| コミュニティ | `/members/community` | 投稿・コメント | 雛形あり |
| 案件掲示板 | `/members/jobs` | 受講者同士の仕事依頼 | 雛形あり |
| サポート | `/members/support` | チケット問い合わせ | 雛形あり |
| マイページ | `/members/mypage` | プロフィール・プラン確認 | 雛形あり |

### 5.3 管理画面

| ページ | パス | 状態 |
|--------|------|------|
| ダッシュボード | `/admin` | 雛形あり |
| ユーザー管理 | `/admin/users` | 雛形あり |
| 動画管理 | `/admin/videos` | 雛形あり |
| 教材管理 | `/admin/materials` | 雛形あり |
| コミュニティ管理 | `/admin/community` | 雛形あり |
| チケット管理 | `/admin/tickets` | 雛形あり |
| お知らせ管理 | `/admin/announcements` | 雛形あり |
| 案件管理 | `/admin/jobs` | 雛形あり |

---

## 6. 自動化スクリプト一覧

### 6.1 新規作成

| スクリプト | 場所 | 実行タイミング | 役割 |
|-----------|------|-------------|------|
| `auto_note_post.py` | `scripts/` | cron 毎日 7:00 JST | Claude APIでnote記事生成→Playwright投稿 |
| `auto_x_post.py` | `scripts/` | cron 7:30/12:00/19:00 JST | Claude APIでツイート生成→Tweepy投稿 |
| `step_email.py` | `scripts/` | cron 毎日 9:00 JST | ステップメール配信（Resend API） |
| `content_calendar.py` | `scripts/` | cron 毎週月曜 6:00 JST | 1週間分のnote記事テーマをClaude APIで生成 |

### 6.2 参考実装（流用元）

| 元ファイル | 場所 | 流用内容 |
|-----------|------|---------|
| `note_poster.py` | `~/dlogic-note/danger/services/` | Playwright経由のnote.com自動投稿 |
| `x_poster.py` | `~/dlogic-note/danger/services/` | Tweepy経由のX自動投稿 |
| `generator.py` | `~/dlogic-note/` | Claude APIでの記事自動生成 |

---

## 7. 技術スタック

| レイヤー | 技術 | 用途 |
|---------|------|------|
| フロントエンド | Next.js 14 (App Router) | LP + 会員エリア + 管理画面 |
| スタイリング | Tailwind CSS | ダークテーマ + ゴールドアクセント |
| データベース | Supabase (PostgreSQL) | ユーザー・コンテンツ・チケット管理 |
| 認証 | Supabase Auth | メール/パスワード認証 |
| 決済 | Stripe | 一括決済 + Webhook |
| 動画配信 | Cloudflare Stream | 講義動画ホスティング |
| メール配信 | Resend | ステップメール・通知メール |
| AI記事生成 | Claude API (Anthropic) | note記事・X投稿・メール文面 |
| note投稿 | Playwright | note.com自動ログイン＆投稿 |
| X投稿 | Tweepy | X API v2 Free Tier |
| ホスティング | Vercel | Next.jsデプロイ |
| cron実行 | VPS (220.158.24.157) | 自動化スクリプト群 |
| 通知 | Telegram Bot | 新規申込・サポートチケット通知 |

---

## 8. 環境変数

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Claude API（記事生成用）
ANTHROPIC_API_KEY=xxx

# note.com 自動投稿
NOTE_EMAIL=xxx
NOTE_PASSWORD=xxx

# X (Twitter) 自動投稿
X_API_KEY=xxx
X_API_SECRET=xxx
X_ACCESS_TOKEN=xxx
X_ACCESS_TOKEN_SECRET=xxx
X_BEARER_TOKEN=xxx

# メール配信
RESEND_API_KEY=xxx

# Telegram 通知
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_CHAT_ID=xxx

# Cloudflare Stream
CLOUDFLARE_ACCOUNT_ID=xxx
CLOUDFLARE_API_TOKEN=xxx

# 管理者
NEXT_PUBLIC_ADMIN_EMAIL=xxx
```

---

## 9. 実装フェーズ

### Phase 1: LP完成（2日）
1. ヒーローセクション刷新（具体的コピー）
2. Pain（悩み）セクション新規追加
3. 実績セクション改善（プレースホルダー排除）
4. Social Proof（受講者の声）セクション新規追加
5. CTAセクション強化（カウントダウンタイマー）
6. OGP画像・メタタグ最適化
7. sitemap.xml 自動生成

### Phase 2: 決済接続（1日）
1. Stripe 本番APIキー設定
2. Webhook エンドポイント本番テスト
3. ウェルカムメール自動送信（Resend連携）
4. 領収書自動送信（Stripe設定）

### Phase 3: 集客自動化（2日）
1. `auto_note_post.py` 実装（Claude API + Playwright）
2. `auto_x_post.py` 実装（Claude API + Tweepy）
3. `content_calendar.py` 実装（週次テーマ自動生成）
4. cron 登録（VPS）
5. 投稿品質チェック＆プロンプト調整

### Phase 4: メール自動化（1日）
1. Resend API 連携
2. ステップメール5通の文面をClaude APIで生成
3. `step_email.py` 実装
4. メール登録 → ステップメール配信のE2Eテスト

### Phase 5: サポート自動化（1日）
1. サポートメール受信 → Supabase チケット登録
2. AI 下書き生成（Claude API）
3. 管理画面からワンクリック返信
4. Telegram 通知接続

### Phase 6: 会員エリア整備（2日）
1. 動画視聴ページ（Cloudflare Stream埋め込み）
2. 資料ダウンロードページ
3. コミュニティ（投稿・コメント）
4. 案件掲示板
5. プラン別アクセス制御

**合計: 約 9日**

---

## 10. コスト試算（月間）

| 項目 | サービス | 月額 |
|------|---------|------|
| ホスティング | Vercel (Hobby) | ¥0 |
| データベース | Supabase (Free) | ¥0 |
| 決済 | Stripe (3.6% + ¥40/件) | 従量 |
| 動画 | Cloudflare Stream | 約 $5〜10 |
| AI記事生成 | Claude API | 約 $10〜20 |
| メール | Resend (3,000通/月無料) | ¥0 |
| VPS（cron） | 既存Xサーバー | ¥0（既存） |
| ドメイン | 年 ¥1,500程度 | 約 ¥125/月 |
| **合計** | | **約 ¥2,000〜4,000/月** |

※ 売上が立てばすぐにペイする水準

---

## 11. KPI（成功指標）

| 指標 | 目標（3ヶ月後） |
|------|---------------|
| note記事数 | 60本以上 |
| X フォロワー | 500人 |
| LP PV | 3,000/月 |
| メール登録 | 200人 |
| 動画視聴完了率 | 40% |
| 有料申込 | 10人（= ¥98万〜150万） |

---

## 12. 未解決事項

- [ ] 本番ドメインの決定（ai-builders-lab.com 等）
- [ ] note.com のアカウント準備（新規 or 既存）
- [ ] X のアカウント準備（新規 or 既存）
- [ ] Stripe 本番アカウントの準備
- [ ] Cloudflare Stream の契約
- [ ] Resend のアカウント作成
- [ ] 講義動画の制作（別途）
- [ ] ローンチ動画4本の制作（Cloudflare Stream用）
- [ ] 仁さんの自己紹介文（LP用）— 「競馬AI」に触れない版
