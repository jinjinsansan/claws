/**
 * /claws/[slug] — 各キャラクター詳細ページ (Phase 2-5)
 *
 * SPEC-07 §4.2 準拠。30 ISR ページ (slug = 'NN-romaji', 例: '01-guren')。
 * openclaw_char_*.html の 8 セクション (NAV / HERO / ORIGIN / DOSSIER /
 * YOUR FATE / A DAY WITH / THE OATHS / KINSMEN / CTA) を再現。
 *
 * --char-color / --char-accent はキャラ別に primary_color / accent_color から設定。
 *
 * MVP1 段階: packages/characters/data/<slug>.json を fs.readFile で静的読込。
 * Phase 1-9 後は Supabase claws テーブルに切替予定。
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import charactersIndex from "@openclaw/characters/data/index.json";
import "./claw-detail.css";

// ============================================
// 型定義
// ============================================
interface QuoteBlock {
  text: string | null;
  lines: string[];
  attribution: string | null;
}

interface DossierStat {
  jp?: string | null;
  en?: string | null;
}

interface DailyEntry {
  time: string | null;
  title: string | null;
  description: string | null;
}

interface OathEntry {
  num: string | null;
  text: string | null;
}

interface KinsmanEntry {
  no: string | null;
  name: string | null;
  relation: string | null;
  image: string | null;
}

interface ClawDetail {
  claw_no: number;
  name_jp: string;
  name_en: string;
  name_romaji: string;
  category: string;
  tagline: string[];
  image_filename: string;
  primary_color: string;
  accent_color: string;
  dossier: Record<string, DossierStat | string>;
  origin_paragraphs: string[];
  your_fate_paragraphs: string[];
  quote: QuoteBlock | null;
  daily_routine: DailyEntry[];
  oaths: OathEntry[];
  kinsmen: KinsmanEntry[];
}

// ============================================
// データ読込（fs 経由でモノレポルートの JSON を取得）
// ============================================
function getDataDir(): string {
  // apps/web から見たモノレポルート: ../..
  return path.resolve(process.cwd(), "..", "..", "packages", "characters", "data");
}

async function loadClaw(slug: string): Promise<ClawDetail | null> {
  try {
    const filePath = path.join(getDataDir(), `${slug}.json`);
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as ClawDetail;
  } catch {
    return null;
  }
}

// ============================================
// ヘルパー
// ============================================
function slugFor(no: number, romaji: string): string {
  return `${String(no).padStart(2, "0")}-${romaji}`;
}

function renderDossierValue(value: DossierStat | string | undefined) {
  if (!value) return null;
  if (typeof value === "string") {
    return <>{value}</>;
  }
  // {jp, en} 形式
  return (
    <>
      {value.jp ? <span className="stat-value-jp">{value.jp}</span> : null}
      {value.en ?? ""}
    </>
  );
}

const DOSSIER_LABELS = [
  "Type",
  "Element",
  "Origin",
  "Personality",
  "First Person",
  "Tone",
  "Catchphrase",
  "Best For",
  "Industries",
] as const;

// ============================================
// Static Params
// ============================================
export async function generateStaticParams() {
  return charactersIndex.map((c) => ({
    slug: slugFor(c.claw_no, c.name_romaji),
  }));
}

export const dynamicParams = false;

// ============================================
// Metadata
// ============================================
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const claw = await loadClaw(params.slug);
  if (!claw) {
    return { title: "Not Found" };
  }
  return {
    title: `${claw.name_jp} / ${claw.name_en}`,
    description:
      claw.tagline.join("") ||
      `OPENCLAW Platform 三十戦士 No.${claw.claw_no} ${claw.name_jp}`,
    openGraph: {
      title: `${claw.name_jp} / ${claw.name_en} — OPENCLAW`,
      description: claw.tagline.join(" "),
      images: [`/claws/${claw.image_filename}`],
    },
  };
}

// ============================================
// Page
// ============================================
export default async function ClawDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const claw = await loadClaw(params.slug);
  if (!claw) notFound();

  const charStyle = {
    "--char-color": claw.primary_color,
    "--char-accent": claw.accent_color,
  } as React.CSSProperties;

  return (
    <main style={charStyle}>
      {/* ============ NAV ============ */}
      <nav className="nav-bar">
        <Link href="/claws" className="nav-back">
          ← BACK TO THE THIRTY
        </Link>
        <div className="nav-brand">OPENCLAW</div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="char-hero">
        <div className="char-hero-info">
          <div className="char-no">
            No. {String(claw.claw_no).padStart(2, "0")} / 30 WARRIORS
          </div>
          <h1 className="char-name-jp">{claw.name_jp}</h1>
          <div className="char-name-en">{claw.name_en}</div>
          <div className="char-tagline">
            {claw.tagline.map((line, i) => (
              <span key={i}>
                {line}
                {i < claw.tagline.length - 1 ? <br /> : null}
              </span>
            ))}
          </div>
        </div>

        <div className="char-image-wrap">
          <div className="char-image-bg" />
          <Image
            src={`/claws/${claw.image_filename}`}
            alt={claw.name_jp}
            className="char-image"
            width={1200}
            height={1200}
            priority
            sizes="(max-width: 900px) 90vw, 50vw"
          />
        </div>
      </section>

      {/* ============ CHAPTER I — ORIGIN ============ */}
      <section className="detail-section">
        <div className="section-mark">CHAPTER I</div>
        <h2 className="section-title">ORIGIN</h2>
        <div className="section-title-jp">出自と物語</div>

        <div className="section-body">
          {claw.origin_paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      {/* ============ CHAPTER II — DOSSIER ============ */}
      <section className="detail-section">
        <div className="section-mark">CHAPTER II</div>
        <h2 className="section-title">DOSSIER</h2>
        <div className="section-title-jp">戦士録</div>

        <div className="stats-grid">
          {DOSSIER_LABELS.map((label) => {
            const value = claw.dossier[label];
            if (!value) return null;
            return (
              <div key={label} className="stat-row">
                <div className="stat-label">{label}</div>
                <div className="stat-value">{renderDossierValue(value)}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ CHAPTER III — YOUR FATE ============ */}
      <section className="detail-section">
        <div className="section-mark">CHAPTER III</div>
        <h2 className="section-title">YOUR FATE</h2>
        <div className="section-title-jp">{claw.name_jp}に選ばれる主</div>

        <div className="section-body">
          {claw.your_fate_paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {claw.quote ? (
          <div className="quote-box">
            <p className="quote-text">
              {(claw.quote.lines.length > 0
                ? claw.quote.lines
                : [claw.quote.text ?? ""]
              ).map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 ? <br /> : null}
                </span>
              ))}
            </p>
            {claw.quote.attribution ? (
              <div className="quote-attr">{claw.quote.attribution}</div>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* ============ CHAPTER IV — A DAY WITH ============ */}
      {claw.daily_routine.length > 0 ? (
        <section className="detail-section">
          <div className="section-mark">CHAPTER IV</div>
          <h2 className="section-title">A DAY WITH {claw.name_en}</h2>
          <div className="section-title-jp">{claw.name_jp}との一日</div>

          <ol className="daily-list">
            {claw.daily_routine.map((d, i) => (
              <li key={i} className="daily-item">
                {d.time ? <div className="daily-time">{d.time}</div> : null}
                {d.title ? <div className="daily-title">{d.title}</div> : null}
                {d.description ? (
                  <div className="daily-desc">{d.description}</div>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* ============ CHAPTER V — THE OATHS ============ */}
      {claw.oaths.length > 0 ? (
        <section className="detail-section">
          <div className="section-mark">CHAPTER V</div>
          <h2 className="section-title">THE OATHS</h2>
          <div className="section-title-jp">主への盟約</div>

          <ul className="oaths-list">
            {claw.oaths.map((o, i) => (
              <li key={i} className="oath-item">
                {o.num ? <div className="oath-num">{o.num}</div> : null}
                {o.text ? <div className="oath-text">{o.text}</div> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ============ CHAPTER VI — KINSMEN ============ */}
      {claw.kinsmen.length > 0 ? (
        <section className="detail-section">
          <div className="section-mark">CHAPTER VI</div>
          <h2 className="section-title">KINSMEN</h2>
          <div className="section-title-jp">血を分けし戦士</div>

          <div className="relations-grid">
            {claw.kinsmen.map((k, i) => {
              // No.XX → 数字部分を取り出して slug に変換
              const noMatch = k.no?.match(/(\d+)/);
              const kinNo = noMatch ? parseInt(noMatch[1], 10) : null;
              const kinEntry = kinNo
                ? charactersIndex.find((c) => c.claw_no === kinNo)
                : null;
              const kinHref = kinEntry
                ? `/claws/${slugFor(kinEntry.claw_no, kinEntry.name_romaji)}`
                : "#";
              return (
                <Link key={i} href={kinHref} className="relation-card">
                  <div className="relation-img">
                    {k.image ? (
                      <Image
                        src={`/claws/${k.image}`}
                        alt={k.name ?? ""}
                        width={300}
                        height={300}
                        sizes="(max-width: 900px) 50vw, 200px"
                      />
                    ) : null}
                  </div>
                  {k.no ? <div className="relation-no">{k.no}</div> : null}
                  {k.name ? <div className="relation-name">{k.name}</div> : null}
                  {k.relation ? (
                    <div className="relation-relation">{k.relation}</div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ============ CTA ============ */}
      <section className="char-cta">
        <h2 className="cta-title">SUMMON {claw.name_en}</h2>
        <div className="cta-subtitle">
          {claw.name_jp}を、汝の戦士に
        </div>

        <Link href="/claws" className="cta-button">
          CALL THE CLAW
        </Link>

        <div className="cta-price">300 USDT</div>
        <div className="cta-note">
          ※ お申し込みは紹介者を通じてのみ受け付けております
        </div>
      </section>
    </main>
  );
}
