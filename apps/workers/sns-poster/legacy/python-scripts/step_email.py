#!/usr/bin/env python3
"""AI Builders Lab — ステップメール自動配信スクリプト

メール登録後5通のステップメールを自動配信。
Supabaseからメール登録者を取得し、登録日からの経過日数に応じてメールを送信。

Usage:
    python scripts/step_email.py
    python scripts/step_email.py --dry-run

Cron例:
    0 9 * * * /opt/dlogic/venv/bin/python /path/to/dlc/scripts/step_email.py

環境変数:
    RESEND_API_KEY          — Resend APIキー
    SUPABASE_URL            — Supabase URL
    SUPABASE_SERVICE_KEY    — Supabase Service Role Key
    ABL_LP_URL              — LPのURL
    ABL_FROM_EMAIL          — 送信元メール（デフォルト: noreply@ai-builders-lab.com）
"""

import argparse
import json
import logging
import os
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
FROM_EMAIL = os.getenv("ABL_FROM_EMAIL", "AI Builders Lab <noreply@ai-builders-lab.com>")

# ─── ステップメール定義 ───────────────────────────────────────────────────────

STEP_EMAILS = [
    {
        "day": 0,
        "subject": "ご登録ありがとうございます — AI Builders Lab",
        "body": f"""こんにちは！AI Builders Lab へのご登録ありがとうございます。

これから数日間にわたり、AIを使った個人開発の魅力をお届けします。

まずは、こちらの無料動画をご覧ください👇

🎬 第1話「AIが変えた、個人開発の常識」
→ {LP_URL}/launch/episode/1

10年前には不可能だった「個人でプロ品質のアプリを作る」が、
AIの進化によって今日から誰にでもできる時代になりました。

明日もメールをお届けします。お楽しみに！

━━━━━━━━━━━━━━━━
AI Builders Lab
{LP_URL}
""",
    },
    {
        "day": 1,
        "subject": "【衝撃】AIで作れるもの20選 — あなたはいくつ知ってましたか？",
        "body": f"""おはようございます。AI Builders Lab です。

昨日の動画はご覧いただけましたか？

今日は「AIでこんなものまで作れるの？」という事例を20個ご紹介します。

━━━ AIで個人が作れるもの20選 ━━━

📱 Webアプリ・SaaS
1. 会員制サイト
2. ECサイト
3. 予約管理システム
4. ダッシュボード・分析ツール
5. チャットアプリ

🤖 AIサービス
6. AIチャットボット
7. AI画像生成アプリ
8. AIカウンセリングサービス
9. AI文章自動生成ツール
10. AI翻訳・要約サービス

📊 データ・分析
11. データ分析プラットフォーム
12. 自動レポート生成ツール
13. スクレイピング＋可視化ツール
14. リアルタイム監視ダッシュボード
15. 予測・スコアリングエンジン

🎮 エンタメ・その他
16. ゲームアプリ
17. SNS・コミュニティ
18. ランディングページ作成ツール
19. LINE Bot / Telegram Bot
20. 動画自動生成システム

━━━━━━━━━━━━━━━━

驚きましたか？これらは全て、
コードを1行も書かずにAIへの指示だけで作れます。

第2話の動画もぜひご覧ください👇
🎬 {LP_URL}/launch/episode/2

━━━━━━━━━━━━━━━━
AI Builders Lab
{LP_URL}
""",
    },
    {
        "day": 3,
        "subject": "プログラミング未経験から、たった8週間で...",
        "body": f"""おはようございます。AI Builders Lab です。

今日は実際に受講された方の体験をお伝えします。

━━━ T.K.さん（30代・会社員）の場合 ━━━

「プログラミング経験ゼロでした。
 最初は正直、自分にできるか不安でした。

 でも、Week 3 には自分のWebアプリが動いていて
 本当に感動しました。

 AIへの指示の出し方を学ぶだけで、
 こんなに変わるとは思いませんでした。」

▶ 結果: 受講2ヶ月後にSaaSをリリース

━━━━━━━━━━━━━━━━

T.K.さんだけではありません。
年齢も経験も関係なく、AIの力を借りれば
誰でも「作れる側の人間」になれます。

第3話「あなたにも同じことができる理由」👇
🎬 {LP_URL}/launch/episode/3

━━━━━━━━━━━━━━━━
AI Builders Lab
{LP_URL}
""",
    },
    {
        "day": 5,
        "subject": "よくある質問にお答えします — AI Builders Lab",
        "body": f"""おはようございます。AI Builders Lab です。

お問い合わせの多い質問にお答えします。

━━━ Q&A ━━━

Q: プログラミング経験がなくても大丈夫？
A: はい。カリキュラムは完全にノーコード前提です。
   AIへの指示の出し方から丁寧に解説します。

Q: どのくらいの時間が必要？
A: 週5〜10時間が目安です。
   会社員の方でも、平日夜と週末で十分取り組めます。

Q: 本当に8週間でプロダクトが作れる？
A: はい。実際に多くの受講者が8週間以内に
   自分のプロダクトをリリースしています。

Q: 返金保証はある？
A: 申し込み後7日以内であれば全額返金いたします。

━━━━━━━━━━━━━━━━

第4話（最終話）では、カリキュラムの全貌と
料金プランを詳しくご説明しています👇

🎬 {LP_URL}/launch/episode/4

━━━━━━━━━━━━━━━━
AI Builders Lab
{LP_URL}
""",
    },
    {
        "day": 7,
        "subject": "【残りわずか】1期生の募集について — AI Builders Lab",
        "body": f"""おはようございます。AI Builders Lab です。

1週間にわたりメールをお読みいただき、
ありがとうございました。

━━━━━━━━━━━━━━━━

現在、第1期生を募集中です。

✅ 8週間の実践カリキュラム
✅ 全講義動画は無期限で視聴可能
✅ プログラミング経験は一切不要
✅ 7日間の全額返金保証

━━━ 3つのプラン ━━━

📺 動画のみ: ¥49,800
📧 動画+メールサポート: ¥98,000（おすすめ）
💻 Zoom型: ¥150,000

定員に達し次第、募集を締め切ります。

▶ 詳細・お申し込みはこちら
{LP_URL}/#pricing

━━━━━━━━━━━━━━━━

「作れる側の人間」になる最初の一歩を、
今日踏み出してみませんか？

AI Builders Lab でお待ちしています。

━━━━━━━━━━━━━━━━
AI Builders Lab
{LP_URL}
""",
    },
]


# ─── Supabase ────────────────────────────────────────────────────────────────

def get_subscribers_for_step(day: int) -> list[dict]:
    """指定日数のステップメール対象者をSupabaseから取得する。"""
    try:
        from supabase import create_client
    except ImportError:
        logger.error("supabase パッケージが必要: pip install supabase")
        return []

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        logger.error("SUPABASE_URL / SUPABASE_SERVICE_KEY が未設定")
        return []

    client = create_client(url, key)
    now = datetime.now(JST)

    # launch_emailsテーブルから、registered_at + day日 == 今日 の行を取得
    # step_N_sent == false のもののみ
    try:
        # 対象日の範囲
        target_start = (now - timedelta(days=day)).replace(hour=0, minute=0, second=0, microsecond=0)
        target_end = target_start + timedelta(days=1)

        result = client.table("launch_emails").select("*").gte(
            "created_at", target_start.isoformat()
        ).lt(
            "created_at", target_end.isoformat()
        ).execute()

        rows = result.data or []

        # step_N_sentフラグで既送を除外
        sent_col = f"step_{day}_sent"
        filtered = [r for r in rows if not r.get(sent_col, False)]
        return filtered

    except Exception as e:
        logger.exception(f"Supabase読み取りエラー: {e}")
        return []


def mark_sent(email: str, day: int) -> None:
    """送信済みマーカーをSupabaseに記録する。"""
    try:
        from supabase import create_client
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            return
        client = create_client(url, key)
        sent_col = f"step_{day}_sent"
        client.table("launch_emails").update(
            {sent_col: True}
        ).eq("email", email).execute()
    except Exception:
        logger.exception(f"送信マーカー更新失敗: {email}")


# ─── メール送信 ──────────────────────────────────────────────────────────────

def send_email(to: str, subject: str, body: str) -> bool:
    """Resend APIでメールを送信する。"""
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        logger.error("RESEND_API_KEY が未設定")
        return False

    import urllib.request

    payload = json.dumps({
        "from": FROM_EMAIL,
        "to": [to],
        "subject": subject,
        "text": body,
    }).encode()

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status == 200:
                logger.info(f"メール送信成功: {to}")
                return True
            logger.warning(f"メール送信: status={resp.status}")
            return False
    except Exception as e:
        logger.exception(f"メール送信失敗: {to} — {e}")
        return False


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
    parser = argparse.ArgumentParser(description="AI Builders Lab — ステップメール")
    parser.add_argument("--dry-run", action="store_true", help="送信せずに確認のみ")
    args = parser.parse_args()

    if os.getenv("ABL_EMAIL_ENABLED", "true").lower() == "false":
        logger.info("ABL_EMAIL_ENABLED=false のため終了")
        return

    total_sent = 0
    total_failed = 0

    for step in STEP_EMAILS:
        day = step["day"]
        subscribers = get_subscribers_for_step(day)

        if not subscribers:
            logger.info(f"Step Day {day}: 対象者なし")
            continue

        logger.info(f"Step Day {day}: {len(subscribers)}件の対象者")

        for sub in subscribers:
            email = sub.get("email", "")
            if not email:
                continue

            if args.dry_run:
                print(f"  [DRY-RUN] Day {day} → {email}: {step['subject']}")
                continue

            ok = send_email(email, step["subject"], step["body"])
            if ok:
                mark_sent(email, day)
                total_sent += 1
            else:
                total_failed += 1

    if not args.dry_run and (total_sent > 0 or total_failed > 0):
        msg = f"📧 ABL ステップメール: {total_sent}件送信 / {total_failed}件失敗"
        logger.info(msg)
        if total_failed > 0:
            notify_telegram(msg)


if __name__ == "__main__":
    main()
