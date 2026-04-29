#!/usr/bin/env python3
"""AI Builders Lab — X (Twitter) 自動投稿スクリプト

Claude APIでツイートを自動生成し、Tweepy経由でX APIに投稿。
1日3回（7:30/12:00/19:00 JST）のcronで実行。

Usage:
    python scripts/auto_x_post.py
    python scripts/auto_x_post.py --dry-run
    python scripts/auto_x_post.py --type value       # 価値提供ツイート
    python scripts/auto_x_post.py --type note_share   # note記事シェア
    python scripts/auto_x_post.py --type hook         # フック・実績ツイート

Cron例:
    30 7  * * * /opt/dlogic/venv/bin/python /path/to/dlc/scripts/auto_x_post.py --type value
    0  12 * * * /opt/dlogic/venv/bin/python /path/to/dlc/scripts/auto_x_post.py --type note_share
    0  19 * * * /opt/dlogic/venv/bin/python /path/to/dlc/scripts/auto_x_post.py --type hook

環境変数:
    ANTHROPIC_API_KEY       — Claude API
    X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET — X API
    ABL_LP_URL              — LPのURL
    TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID — 通知用（任意）
"""

import argparse
import json
import logging
import os
import random
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

JST = timezone(timedelta(hours=9))
LP_URL = os.getenv("ABL_LP_URL", "https://dlc-sigma.vercel.app")
MAX_TWEET_LENGTH = 280

# ─── ツイートタイプ定義 ───────────────────────────────────────────────────────

TWEET_TYPES = {
    "value": {
        "label": "価値提供",
        "prompt": f"""以下のルールでX (Twitter)のツイートを1つ生成してください。

【ルール】
- AIを使った個人開発の有益な情報を提供する
- 「あなたにもできる」感を出す
- 具体的な事実・数字を含める
- プログラミング不要であることを強調
- 280文字以内（日本語）
- 最後に改行してハッシュタグ2〜3個: #AI開発 #個人開発 #ノーコード 等
- 競馬やDlogicには絶対触れない
- プロフへの誘導文（「詳しくはプロフから」等）を入れる

JSON形式: {{"tweet": "ツイート本文"}}""",
    },
    "note_share": {
        "label": "note記事シェア",
        "prompt": f"""以下のルールでnote記事のシェアツイートを1つ生成してください。

【ルール】
- AI個人開発に関する記事を書いた体で告知する
- 記事URLの代わりに「{LP_URL}」を使う
- 「新着記事」「解説しました」等の導入
- 280文字以内
- ハッシュタグ: #AI開発 #note
- 競馬やDlogicには絶対触れない

JSON形式: {{"tweet": "ツイート本文"}}""",
    },
    "hook": {
        "label": "フック・実績",
        "prompt": f"""以下のルールで実績アピール/フック型のツイートを1つ生成してください。

【ルール】
- AIでプロダクトを作った実績を語る（抽象的でOK）
- 「昔は○○だったが、今はAIで○○」の対比構造
- 読者が「自分もやりたい」と思う内容
- 280文字以内
- 最後に「→ 学び方はプロフから」等のCTA
- ハッシュタグ: #AI開発 #個人開発
- 競馬やDlogicには絶対触れない

JSON形式: {{"tweet": "ツイート本文"}}""",
    },
}


# ─── Claude API ──────────────────────────────────────────────────────────────

def generate_tweet(tweet_type: str) -> str | None:
    """Claude APIでツイートを生成する。"""
    try:
        import anthropic
    except ImportError:
        logger.error("anthropic パッケージが必要: pip install anthropic")
        return None

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY が未設定")
        return None

    tt = TWEET_TYPES[tweet_type]
    client = anthropic.Anthropic(api_key=api_key)

    try:
        response = client.messages.create(
            model="claude-haiku-4-20250414",
            max_tokens=500,
            messages=[{"role": "user", "content": tt["prompt"]}],
        )
        text = response.content[0].text.strip()

        if "{" in text:
            json_str = text[text.index("{"):text.rindex("}") + 1]
            result = json.loads(json_str)
            tweet = result.get("tweet", "")
            if tweet:
                return tweet[:MAX_TWEET_LENGTH]

        logger.error(f"ツイート解析失敗: {text[:200]}")
        return None

    except Exception as e:
        logger.exception(f"Claude API エラー: {e}")
        return None


# ─── X投稿 ───────────────────────────────────────────────────────────────────

def post_to_x(text: str) -> dict:
    """X API v2でツイートを投稿する。"""
    try:
        import tweepy
    except ImportError:
        return {"status": "error", "message": "tweepy未インストール: pip install tweepy"}

    api_key = os.getenv("X_API_KEY")
    api_secret = os.getenv("X_API_SECRET")
    access_token = os.getenv("X_ACCESS_TOKEN")
    access_token_secret = os.getenv("X_ACCESS_TOKEN_SECRET")

    if not all([api_key, api_secret, access_token, access_token_secret]):
        return {"status": "error", "message": "X API credentials not configured"}

    text = text.strip()
    if not text:
        return {"status": "error", "message": "ツイート文が空"}

    if len(text) > MAX_TWEET_LENGTH:
        text = text[:MAX_TWEET_LENGTH]

    client = tweepy.Client(
        consumer_key=api_key,
        consumer_secret=api_secret,
        access_token=access_token,
        access_token_secret=access_token_secret,
    )

    try:
        response = client.create_tweet(text=text)
        tweet_id = response.data["id"]
        logger.info(f"X投稿成功: tweet_id={tweet_id}")
        return {"status": "ok", "tweet_id": tweet_id}

    except tweepy.TweepyException as e:
        message = str(e)
        logger.warning(f"X投稿失敗: {message}")
        # 重複エラーの場合、タイムスタンプ付きでリトライ
        if "duplicate" in message.lower() or "same text" in message.lower():
            suffix = f"\n（{datetime.now(JST).strftime('%H:%M')}）"
            retry_text = text[:MAX_TWEET_LENGTH - len(suffix)] + suffix
            try:
                response = client.create_tweet(text=retry_text)
                return {"status": "ok", "tweet_id": response.data["id"]}
            except Exception as retry_err:
                return {"status": "error", "message": str(retry_err)}
        return {"status": "error", "message": message}


# ─── Telegram通知 ─────────────────────────────────────────────────────────────

def notify_telegram(message: str) -> None:
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
    parser = argparse.ArgumentParser(description="AI Builders Lab — X自動投稿")
    parser.add_argument("--dry-run", action="store_true", help="生成のみ")
    parser.add_argument("--type", choices=list(TWEET_TYPES.keys()), help="ツイートタイプ")
    args = parser.parse_args()

    if os.getenv("ABL_X_ENABLED", "true").lower() == "false":
        logger.info("ABL_X_ENABLED=false のため終了")
        return

    # タイプ選択
    if args.type:
        tweet_type = args.type
    else:
        hour = datetime.now(JST).hour
        if hour < 10:
            tweet_type = "value"
        elif hour < 15:
            tweet_type = "note_share"
        else:
            tweet_type = "hook"

    logger.info(f"ツイートタイプ: {TWEET_TYPES[tweet_type]['label']}")

    # 生成
    tweet = generate_tweet(tweet_type)
    if not tweet:
        msg = f"❌ ABL ツイート生成失敗: {tweet_type}"
        logger.error(msg)
        notify_telegram(msg)
        return

    logger.info(f"生成完了: {tweet[:50]}...")

    if args.dry_run:
        print(f"\n{'='*40}")
        print(tweet)
        print(f"{'='*40}")
        print(f"({len(tweet)}文字 / dry-run)")
        return

    # 投稿
    result = post_to_x(tweet)
    if result.get("status") == "ok":
        msg = f"✅ ABL X投稿完了\n🐦 {tweet[:100]}..."
        logger.info(msg)
    else:
        msg = f"❌ ABL X投稿失敗: {result.get('message')}\n🐦 {tweet[:50]}..."
        logger.error(msg)
        notify_telegram(msg)


if __name__ == "__main__":
    main()
