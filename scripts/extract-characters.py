#!/usr/bin/env python3
"""
30 OPENCLAW characters の HTML から構造化 JSON データを抽出する。

入力: claw元画像＆HTML/openclaw_char_*.html (30HTML)
出力: packages/characters/data/<NN>-<romaji>.json (30個別ファイル)
       packages/characters/data/index.json (一覧)

各キャラHTMLの8セクション構造に依存:
  HERO / ORIGIN / DOSSIER / YOUR FATE / A DAY WITH X / THE OATHS / KINSMEN / CTA

使い方:
  python scripts/extract-characters.py
"""
import json
import re
import sys
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
HTML_DIR = ROOT / "claw元画像＆HTML"
OUT_DIR = ROOT / "packages" / "characters" / "data"


def text_of(el):
    return el.get_text(strip=True) if el else None


def paras_of(section):
    """section-body 内の <p> 要素を段落配列に変換。

    各 <p> の改行 (<br>) は空白に変換、<span class="em"> 等の装飾は
    プレーンテキストに落とす。フロントの装飾は別途キーワードベースで適用する。
    """
    body = section.select_one(".section-body")
    if not body:
        return []
    paras = []
    for p in body.find_all("p", recursive=False):
        text = p.get_text(" ", strip=True)
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            paras.append(text)
    return paras


def parse_dossier(section):
    """DOSSIER の 9 項目（Type / Element / Origin / Personality / First Person /
    Tone / Catchphrase / Best For / Industries）を辞書化。"""
    rows = section.select(".stat-row")
    out = {}
    for row in rows:
        label = text_of(row.select_one(".stat-label"))
        value_el = row.select_one(".stat-value")
        if not label or not value_el:
            continue
        # stat-value 内の stat-value-jp（漢字部）と英字部を抽出
        jp_el = value_el.select_one(".stat-value-jp")
        if jp_el:
            jp = jp_el.get_text(strip=True)
            # 残りのテキスト（英字部）
            full = value_el.get_text(" ", strip=True)
            en = full.replace(jp, "", 1).strip()
            out[label] = {"jp": jp or None, "en": en or None} if en else jp
        else:
            out[label] = value_el.get_text(" ", strip=True)
    return out


def parse_daily_routine(section):
    """A DAY WITH X の 5 シーン（time / title / description）"""
    items = section.select(".daily-item")
    out = []
    for item in items:
        out.append({
            "time": text_of(item.select_one(".daily-time")),
            "title": text_of(item.select_one(".daily-title")),
            "description": text_of(item.select_one(".daily-desc")),
        })
    return out


def parse_oaths(section):
    """THE OATHS の 5 つの盟約"""
    items = section.select(".oath-item")
    out = []
    for item in items:
        out.append({
            "num": text_of(item.select_one(".oath-num")),
            "text": text_of(item.select_one(".oath-text")),
        })
    return out


def parse_kinsmen(section):
    """KINSMEN の関連キャラ 3 体"""
    items = section.select(".relation-card")
    out = []
    for item in items:
        img = item.select_one(".relation-img img")
        out.append({
            "no": text_of(item.select_one(".relation-no")),
            "name": text_of(item.select_one(".relation-name")),
            "relation": text_of(item.select_one(".relation-relation")),
            "image": img.get("src") if img else None,
        })
    return out


def parse_quote(section):
    """YOUR FATE 内の quote-box（キャラの台詞）。<br> を改行として保持。"""
    qb = section.select_one(".quote-box")
    if not qb:
        return None
    qt = qb.select_one(".quote-text")
    qa = qb.select_one(".quote-attr")
    quote_lines = []
    if qt:
        for line in qt.get_text("\n", strip=False).split("\n"):
            line = line.strip()
            if line:
                quote_lines.append(line)
    return {
        "text": "\n".join(quote_lines) if quote_lines else None,
        "lines": quote_lines,
        "attribution": text_of(qa),
    }


def extract_colors(soup):
    """<style> 内の --char-color と --char-accent を抽出"""
    style = soup.find("style")
    if not style:
        return None, None
    css = style.string or ""
    primary = None
    accent = None
    m = re.search(r"--char-color:\s*([^;]+);", css)
    if m:
        primary = m.group(1).strip()
    m = re.search(r"--char-accent:\s*([^;]+);", css)
    if m:
        accent = m.group(1).strip()
    return primary, accent


def derive_romaji(image_filename, claw_no):
    """画像ファイル名から romaji 識別子を取り出す。
    claw_no=1 のみ openclaw_demon_01.png（特例）。それ以外は NN_<romaji>.png。"""
    if not image_filename:
        return None
    if claw_no == 1:
        return "guren"
    base = re.sub(r"\.png$", "", image_filename, flags=re.IGNORECASE)
    m = re.match(r"\d+_(.+)$", base)
    return m.group(1) if m else base


def derive_category(filename):
    """SPEC-00 §8.2 のカテゴリ分類を claw_no から推定。
    1-3:demon / 4-6:god / 7-9:wild / 10-12:robot / 13-15:human /
    16-18:goddess / 19-21:temptress / 22-24:fluffy / 25-27:concierge / 28-30:friend"""
    return None  # claw_no ベースで main() 側で割当


CATEGORY_BY_NO = {}
for n in range(1, 4):
    CATEGORY_BY_NO[n] = "demon"
for n in range(4, 7):
    CATEGORY_BY_NO[n] = "god"
for n in range(7, 10):
    CATEGORY_BY_NO[n] = "wild"
for n in range(10, 13):
    CATEGORY_BY_NO[n] = "robot"
for n in range(13, 16):
    CATEGORY_BY_NO[n] = "human"
for n in range(16, 19):
    CATEGORY_BY_NO[n] = "goddess"
for n in range(19, 22):
    CATEGORY_BY_NO[n] = "temptress"
for n in range(22, 25):
    CATEGORY_BY_NO[n] = "fluffy"
for n in range(25, 28):
    CATEGORY_BY_NO[n] = "concierge"
for n in range(28, 31):
    CATEGORY_BY_NO[n] = "friend"


def extract_character(html_path):
    soup = BeautifulSoup(html_path.read_text(encoding="utf-8"), "html.parser")

    # HERO
    char_no_text = text_of(soup.select_one(".char-no"))  # "No. 01 / 30 WARRIORS"
    m = re.search(r"No\.\s*(\d+)", char_no_text or "")
    claw_no = int(m.group(1)) if m else None

    name_jp = text_of(soup.select_one(".char-name-jp"))
    name_en = text_of(soup.select_one(".char-name-en"))

    # tagline は HTML の <br> で区切られた複数行が意図された形式なので、配列で保持
    tagline_el = soup.select_one(".char-tagline")
    tagline = None
    if tagline_el:
        tagline = [
            line.strip()
            for line in tagline_el.get_text("\n", strip=False).split("\n")
            if line.strip()
        ]

    image_el = soup.select_one(".char-image")
    image_filename = image_el.get("src") if image_el else None

    # CHAPTER sections
    sections = soup.select(".detail-section")
    by_title = {}
    for sec in sections:
        title = text_of(sec.select_one(".section-title"))
        if title:
            by_title[title.upper()] = sec

    origin = by_title.get("ORIGIN")
    dossier = by_title.get("DOSSIER")
    fate = by_title.get("YOUR FATE")
    daily = next(
        (s for k, s in by_title.items() if k.startswith("A DAY WITH")),
        None,
    )
    oaths = by_title.get("THE OATHS")
    kin = by_title.get("KINSMEN")

    primary_color, accent_color = extract_colors(soup)
    name_romaji = derive_romaji(image_filename, claw_no)
    category = CATEGORY_BY_NO.get(claw_no) if claw_no else None

    return {
        "claw_no": claw_no,
        "name_jp": name_jp,
        "name_en": name_en,
        "name_romaji": name_romaji,
        "category": category,
        "tagline": tagline,
        "image_filename": image_filename,
        "primary_color": primary_color,
        "accent_color": accent_color,
        "dossier": parse_dossier(dossier) if dossier else {},
        "origin_paragraphs": paras_of(origin) if origin else [],
        "your_fate_paragraphs": paras_of(fate) if fate else [],
        "quote": parse_quote(fate) if fate else None,
        "daily_routine": parse_daily_routine(daily) if daily else [],
        "oaths": parse_oaths(oaths) if oaths else [],
        "kinsmen": parse_kinsmen(kin) if kin else [],
        # 以下はマニュアル付与（仁さん確認後に手動補完）
        # - gender: male/female  ← HTML から推測できないため要確認
        # - system_prompt: SPEC-04 §4.2 のテンプレートで自動生成（別ステップ）
    }


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    html_files = sorted(HTML_DIR.glob("openclaw_char_*.html"))
    if not html_files:
        print("ERROR: No HTML files found in", HTML_DIR, file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(html_files)} HTML files in {HTML_DIR}")
    print(f"Output: {OUT_DIR}\n")

    all_chars = []
    errors = []
    for html_path in html_files:
        try:
            char = extract_character(html_path)
            if char.get("claw_no") is None:
                errors.append(f"  WARN: claw_no missing in {html_path.name}")
                continue

            out_name = f"{char['claw_no']:02d}-{char['name_romaji']}.json"
            (OUT_DIR / out_name).write_text(
                json.dumps(char, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            all_chars.append({
                "claw_no": char["claw_no"],
                "name_jp": char["name_jp"],
                "name_en": char["name_en"],
                "category": char["category"],
                "file": out_name,
            })
            print(f"  OK: {out_name}")
        except Exception as e:
            errors.append(f"  ERR {html_path.name}: {e}")

    # index.json
    all_chars.sort(key=lambda c: c["claw_no"])
    (OUT_DIR / "index.json").write_text(
        json.dumps(all_chars, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"\nWrote {len(all_chars)} character files to {OUT_DIR}")
    if errors:
        print(f"\n{len(errors)} errors:")
        for err in errors:
            print(err)
        sys.exit(2)


if __name__ == "__main__":
    main()
