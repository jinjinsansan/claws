#!/usr/bin/env python3
"""AI Builders Lab — note.com 自動記事投稿スクリプト

Claude APIでAI個人開発系の記事を自動生成し、Playwright経由でnote.comに投稿。
記事末尾にLP（AI Builders Lab）へのCTAリンクを挿入。

Usage:
    python scripts/auto_note_post.py
    python scripts/auto_note_post.py --dry-run   # 生成のみ（投稿しない）
    python scripts/auto_note_post.py --category tutorial

Cron例:
    0 7 * * 1,3,5 /opt/dlogic/venv/bin/python /path/to/dlc/scripts/auto_note_post.py

環境変数:
    ANTHROPIC_API_KEY   — Claude API キー
    NOTE_EMAIL          — note.com メールアドレス
    NOTE_PASSWORD       — note.com パスワード
    ABL_LP_URL          — LPのURL（デフォルト: https://dlc-sigma.vercel.app）
    TELEGRAM_BOT_TOKEN  — 通知用（任意）
    TELEGRAM_CHAT_ID    — 通知用（任意）
"""

import argparse
import json
import logging
import os
import random
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

# プロジェクトルートをパスに追加
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

JST = timezone(timedelta(hours=9))
LP_URL = os.getenv("ABL_LP_URL", "https://dlc-sigma.vercel.app")

# ─── 記事カテゴリ定義 ─────────────────────────────────────────────────────────

CATEGORIES = {
    "beginner": {
        "label": "AI開発入門",
        "prompt_hint": "AIツール（Claude Code, Cursor, v0等）を使った個人開発の入門記事。プログラミング未経験者が読んでも分かるように。",
        "topics": [
            "Claude Codeで初めてのWebアプリを作る手順",
            "プログラミング不要！AIだけでLPを30分で作る方法",
            "AIに指示を出すコツ — プロンプトエンジニアリング入門",
            "Supabaseとは？5分で分かるバックエンド入門",
            "Next.jsって何？AIと一緒に学ぶフロントエンド基礎",
            "Vercelで無料デプロイ！作ったアプリを世界に公開する方法",
            "AIツール比較：Claude Code vs Cursor vs GitHub Copilot",
            "ノーコードとAI開発の違い — どっちを選ぶべき？",
        ],
    },
    "tutorial": {
        "label": "実践チュートリアル",
        "prompt_hint": "具体的なプロダクトをAIで作るステップバイステップのチュートリアル記事。技術的な内容を含むが、AIが代わりにコードを書くので読者はコピペ不要。",
        "topics": [
            "AIで会員制サイトを作る — Supabase認証 × Next.js",
            "Stripe決済を30分で実装する方法",
            "AIチャットボットを自分のサイトに組み込む手順",
            "LINE Botを作ってビジネスに活用する方法",
            "AIで画像生成アプリを作る — FLUX2活用ガイド",
            "データ分析ダッシュボードをAIで作る方法",
            "PWA化で自分のWebアプリをスマホアプリにする手順",
            "RedisとWebSocketでリアルタイム機能を実装する方法",
        ],
    },
    "trend": {
        "label": "AI業界ニュース解説",
        "prompt_hint": "最新のAI業界トレンドを個人開発者の目線で解説する記事。読者が「自分も今すぐ始めないと」と感じるような内容。",
        "topics": [
            "AIの進化で個人開発者がやるべき3つのこと",
            "2026年、AIで稼ぐ個人開発者が急増している理由",
            "Claude 4が変えた開発の常識 — もうコードは書かない",
            "AIエージェント時代に個人が生き残る戦略",
            "ノーコードの限界 vs AI開発の可能性",
            "副業でAIプロダクトを作る人が増えている背景",
            "個人開発者のためのAIツール最前線",
            "AIが作ったアプリで月収100万円は可能か？",
        ],
    },
    "case_study": {
        "label": "成功事例",
        "prompt_hint": "AI個人開発で成果を出した（架空の）事例紹介記事。読者が自分にもできると感じるストーリー。具体的な数字（開発期間、収益等）を入れる。",
        "topics": [
            "未経験の主婦がAIで月5万円のSaaSを作った話",
            "会社員が週末だけでAIアプリを作って副業収入を得た方法",
            "フリーランスがAI開発スキルで単価を3倍にした実話",
            "定年退職後にAIで第二のキャリアを始めた60代の挑戦",
            "大学生がAIでスタートアップを立ち上げるまでの90日間",
            "AIカウンセリングアプリを作って人の役に立てた体験談",
        ],
    },
    "mindset": {
        "label": "マインドセット",
        "prompt_hint": "AI時代の個人開発に対するマインドセットや行動変容を促す記事。危機感と希望の両方を与える。",
        "topics": [
            "なぜ今AIを学ばないと手遅れになるのか",
            "完璧主義を捨てろ — AIで「まず出す」が正解な理由",
            "プログラマーじゃなくても「作れる人間」になれる時代",
            "学ぶだけでは意味がない — AIで「作る」ことの重要性",
            "失敗しても大丈夫。AIなら何度でもやり直せる",
            "仲間がいると速い — コミュニティで学ぶAI開発",
        ],
    },
}

# ─── Claude API ──────────────────────────────────────────────────────────────

def generate_article(category: str, topic: str) -> dict | None:
    """Claude APIで記事を生成する。

    Returns:
        {"title": "...", "body": "..."} or None
    """
    try:
        import anthropic
    except ImportError:
        logger.error("anthropic パッケージが必要です: pip install anthropic")
        return None

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY が未設定です")
        return None

    cat = CATEGORIES[category]

    system_prompt = f"""あなたは「AI Builders Lab」の公式ライターです。
AI個人開発に関するnote記事を書いてください。

【キャラクター】
- 親しみやすく、読者に寄り添うトーン
- 「あなたにもできる」というメッセージを常に込める
- 具体的でアクション可能なアドバイスを入れる
- 専門用語は最小限、使う場合は必ず説明を添える

【カテゴリ】: {cat['label']}
【カテゴリ特性】: {cat['prompt_hint']}

【記事構成ルール】
- 文字数: 1500〜3000字
- 見出し（## ）を3〜5個使う
- 冒頭で読者の悩み・関心に共感
- 中盤で具体的な解決策・手順・事例
- 末尾にまとめ + CTA

【絶対守るルール】
- 競馬AIの話は絶対にしない
- 特定のサービス名（Dlogic等）は出さない
- 「AI Builders Lab」の名前は記事本文中に1〜2回だけ自然に入れる
- 出力は必ず厳格なJSON形式

【CTA（末尾に必ず入れる）】
---
🚀 AI Builders Lab では、プログラミング経験ゼロからAIプロダクトを作れるようになる8週間のカリキュラムを提供しています。
詳しくはこちら → {LP_URL}
---"""

    user_prompt = f"""以下のテーマでnote記事を書いてください。

テーマ: 「{topic}」

JSON形式で出力してください:
{{
    "title": "記事タイトル（30字以内、興味を引く表現）",
    "body": "本文（Markdown形式、1500〜3000字）"
}}"""

    client = anthropic.Anthropic(api_key=api_key)

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        text = response.content[0].text.strip()

        # JSON抽出
        if "{" in text:
            json_str = text[text.index("{"):text.rindex("}") + 1]
            result = json.loads(json_str)
            if "title" in result and "body" in result:
                return result
        logger.error(f"JSON解析失敗: {text[:200]}")
        return None

    except Exception as e:
        logger.exception(f"Claude API エラー: {e}")
        return None


# ─── note投稿 ────────────────────────────────────────────────────────────────

def post_to_note(title: str, body: str) -> dict:
    """note.comに記事を投稿する（Playwright経由）。

    ~/dlogic-note/danger/services/note_poster.py と同じ仕組みを使用。
    """
    # dlogic-noteのnote_posterを流用
    note_poster_path = os.path.expanduser("~/dlogic-note/danger/services")
    if os.path.isdir(note_poster_path):
        sys.path.insert(0, note_poster_path)
        try:
            from note_poster import post_to_note as _post
            return _post(title=title, body_md=body, price=0, publish=True)
        except ImportError:
            logger.warning("note_posterのインポートに失敗、フォールバック実装を使用")

    # フォールバック: Playwright直接実装
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return {"status": "error", "message": "playwright未インストール"}

    email = os.getenv("NOTE_EMAIL")
    password = os.getenv("NOTE_PASSWORD")
    if not email or not password:
        return {"status": "error", "message": "NOTE_EMAIL / NOTE_PASSWORD が未設定"}

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )
            page = context.new_page()

            # ログイン
            page.goto("https://note.com/login")
            page.wait_for_load_state("networkidle")
            time.sleep(2)

            email_input = page.locator('input[placeholder*="mail@example"]')
            if email_input.count() == 0:
                email_input = page.locator("input").first
            email_input.fill(email)

            pw_input = page.locator('input[type="password"]')
            pw_input.fill(password)
            time.sleep(1)

            page.locator('button:has-text("ログイン")').last.click()
            page.wait_for_load_state("networkidle")
            time.sleep(5)

            # 記事作成
            page.goto("https://note.com/notes/new")
            page.wait_for_load_state("networkidle")
            time.sleep(3)

            # ポップアップを閉じる
            close_btn = page.locator('button:has-text("×"), [aria-label="閉じる"]')
            if close_btn.count() > 0:
                close_btn.first.click()
                time.sleep(1)

            # タイトル入力
            page.wait_for_selector("textarea", timeout=15000)
            page.locator("textarea").click()
            page.locator("textarea").fill(title)
            time.sleep(1)

            # 本文入力
            page.wait_for_selector(".ProseMirror", timeout=15000)
            body_area = page.locator(".ProseMirror")
            body_area.click()
            time.sleep(0.5)

            for line in body.split("\n"):
                if line.strip():
                    page.keyboard.type(line, delay=3)
                page.keyboard.press("Enter")
                time.sleep(0.05)
            time.sleep(2)

            # 公開
            publish_btn = page.locator('button:has-text("公開に進む")')
            if publish_btn.count() == 0:
                browser.close()
                return {"status": "error", "message": "公開ボタンが見つからない"}

            publish_btn.click()
            time.sleep(3)

            submit_btn = page.locator('button:has-text("投稿する")')
            if submit_btn.count() > 0:
                submit_btn.last.click()
                time.sleep(8)
                url = page.url
                browser.close()
                return {"status": "ok", "url": url}

            browser.close()
            return {"status": "error", "message": "投稿ボタンが見つからない"}

    except Exception as e:
        logger.exception("note投稿エラー")
        return {"status": "error", "message": str(e)}


# ─── Telegram通知 ─────────────────────────────────────────────────────────────

def notify_telegram(message: str) -> None:
    """Telegram Botで通知を送信（任意）"""
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        return

    import urllib.request
    import urllib.parse
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = urllib.parse.urlencode({"chat_id": chat_id, "text": message}).encode()
    try:
        urllib.request.urlopen(url, data, timeout=10)
    except Exception:
        pass


# ─── メイン ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="AI Builders Lab — note自動投稿")
    parser.add_argument("--dry-run", action="store_true", help="生成のみ、投稿しない")
    parser.add_argument("--category", choices=list(CATEGORIES.keys()), help="カテゴリ指定")
    args = parser.parse_args()

    # 有効化チェック
    if os.getenv("ABL_NOTE_ENABLED", "true").lower() == "false":
        logger.info("ABL_NOTE_ENABLED=false のため終了")
        return

    # カテゴリ選択（指定なしならローテーション）
    if args.category:
        category = args.category
    else:
        # 曜日ベースでローテーション
        weekday = datetime.now(JST).weekday()
        category_keys = list(CATEGORIES.keys())
        category = category_keys[weekday % len(category_keys)]

    cat = CATEGORIES[category]
    topic = random.choice(cat["topics"])

    logger.info(f"カテゴリ: {cat['label']} / テーマ: {topic}")

    # 記事生成
    article = generate_article(category, topic)
    if not article:
        msg = f"❌ ABL note記事生成失敗: {category}/{topic}"
        logger.error(msg)
        notify_telegram(msg)
        return

    logger.info(f"記事生成完了: {article['title']} ({len(article['body'])}字)")

    if args.dry_run:
        print(f"\n{'='*60}")
        print(f"タイトル: {article['title']}")
        print(f"{'='*60}")
        print(article["body"])
        print(f"{'='*60}")
        print("(dry-run: 投稿はスキップ)")
        return

    # note投稿
    result = post_to_note(article["title"], article["body"])

    if result.get("status") == "ok":
        url = result.get("url", "")
        msg = f"✅ ABL note記事投稿完了\n📝 {article['title']}\n🔗 {url}"
        logger.info(msg)
        notify_telegram(msg)
    else:
        msg = f"❌ ABL note投稿失敗: {result.get('message', '不明')}\n📝 {article['title']}"
        logger.error(msg)
        notify_telegram(msg)


if __name__ == "__main__":
    main()
