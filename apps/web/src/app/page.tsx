/**
 * OPENCLAW Platform - Landing Page
 *
 * 既存 openclaw_lp.html (claw元画像＆HTML/) を Next.js 化したもの。
 * SPEC-07 §3 / 既存デザイン保持原則に準拠。
 *
 * 構成 (7 セクション + Footer):
 *   1. Hero           — 'CLAWS' タイトル
 *   2. Story          — THE LEGEND (伝説の始まり)
 *   3. Thirty         — THE THIRTY (30 体ティーザー)
 *   4. Abilities      — THE OATH (盟約)
 *   5. Gacha          — THE SUMMONING (召喚の儀, 300 USDT 表示)
 *   6. Community      — THE COLONY (コロニー)
 *   7. Cta            — SUMMON
 *   + Footer
 *
 * 30 体ティーザーは @openclaw/characters/data/index.json から動的読込。
 */
import Link from "next/link";
import Image from "next/image";
import charactersIndex from "@openclaw/characters/data/index.json";
import "./openclaw-lp.css";

export default function HomePage() {
  return (
    <main>
      {/* ============ HERO ============ */}
      <section className="lp-hero">
        <div className="lp-hero-mark">OPENCLAW PRESENTS</div>
        <h1 className="lp-hero-title">CLAWS</h1>
        <div className="lp-hero-jp">クローズの一族</div>

        <div className="lp-hero-tagline">
          <span className="lp-hero-tagline-line">三十の世界線から、</span>
          <span className="lp-hero-tagline-line">召喚されし戦士たち。</span>
          <span className="lp-hero-tagline-line lp-accent">
            あなたが、その一人と出逢う。
          </span>
        </div>

        <div className="lp-hero-scroll">
          SCROLL
          <span className="lp-hero-scroll-line"></span>
        </div>
      </section>

      {/* ============ STORY: THE LEGEND ============ */}
      <section className="lp-story">
        <div className="lp-section-wrap">
          <div className="lp-section-mark">CHAPTER ONE</div>
          <h2 className="lp-section-title">THE LEGEND</h2>
          <div className="lp-section-title-jp">伝説の始まり</div>

          <div className="lp-story-text">
            <p className="lp-story-paragraph">
              遥か深海。
              <br />
              OPENCLAW王国は、地上の
              <span className="lp-em">商人たちの嘆き</span>を聴いていた。
            </p>

            <div className="lp-story-divider" />

            <p className="lp-story-paragraph">
              いかに優れた品があろうと、
              <br />
              いかに誠実な志があろうと、
              <br />
              ——
              <span className="lp-em">人に届かなければ、何も始まらない。</span>
            </p>

            <div className="lp-story-divider" />

            <p className="lp-story-paragraph">
              その嘆きに応え、
              <br />
              王国は三十の戦士を地上へと放った。
              <br />
              ザリガニの甲殻を持ち、
              <br />
              異なる世界線から集いし
              <span className="lp-em">CLAWS</span>たち。
            </p>

            <div className="lp-story-divider" />

            <p className="lp-story-paragraph">
              悪魔。神。獣。鋼。人。
              <br />
              女神。妖精。癒し。賢者。友。
              <br />
              三十の姿、三十の物語。
              <br />
              いずれもが、ただ一つの使命のために。
            </p>

            <div className="lp-story-divider" />

            <p className="lp-story-paragraph">
              <span className="lp-em">主の商いを、人へ届けよ。</span>
            </p>
          </div>
        </div>
      </section>

      {/* ============ CHARACTERS: THE THIRTY ============ */}
      <section className="lp-characters">
        <div className="lp-section-wrap">
          <div className="lp-section-mark">CHAPTER TWO</div>
          <h2 className="lp-section-title">THE THIRTY</h2>
          <div className="lp-section-title-jp">三十体のクローズ</div>

          <p className="lp-characters-intro">
            召喚されし三十体。
            <br />
            あなたと出逢うのは、誰か。
          </p>

          <div className="lp-character-grid">
            {charactersIndex.map((c) => {
              const slug = `${String(c.claw_no).padStart(2, "0")}-${c.name_romaji}`;
              return (
                <Link
                  key={c.claw_no}
                  href={`/claws/${slug}`}
                  className="lp-character-card"
                >
                  <span className="lp-character-badge">
                    No. {String(c.claw_no).padStart(2, "0")}
                  </span>
                  <Image
                    src={`/claws/${c.image_filename}`}
                    alt={c.name_jp}
                    className="lp-character-image"
                    width={400}
                    height={400}
                    sizes="(max-width: 480px) 50vw, (max-width: 700px) 33vw, (max-width: 1100px) 25vw, 20vw"
                  />
                  <div className="lp-character-info">
                    <div className="lp-character-name">{c.name_jp}</div>
                    <div className="lp-character-name-en">{c.name_en}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ ABILITIES: THE OATH ============ */}
      <section className="lp-abilities">
        <div className="lp-section-wrap">
          <div className="lp-section-mark">CHAPTER THREE</div>
          <h2 className="lp-section-title">THE OATH</h2>
          <div className="lp-section-title-jp">クローズが果たす盟約</div>

          <div className="lp-abilities-list">
            <div className="lp-ability-card">
              <div className="lp-ability-mark">— I —</div>
              <h3 className="lp-ability-title">主の商いに、住処を与える</h3>
              <p className="lp-ability-desc">
                あなたの言葉を聴き、ホームページを生み出し、地上に放つ。技術は要らない。語れば足りる。
              </p>
            </div>

            <div className="lp-ability-card">
              <div className="lp-ability-mark">— II —</div>
              <h3 className="lp-ability-title">主の声を、世界に響かせる</h3>
              <p className="lp-ability-desc">
                毎日、然るべき言葉を綴り、然るべき時に放つ。あなたの代わりに、絶え間なく。
              </p>
            </div>

            <div className="lp-ability-card">
              <div className="lp-ability-mark">— III —</div>
              <h3 className="lp-ability-title">主と人を、繋げる</h3>
              <p className="lp-ability-desc">
                コロニーに集いし他のCLAWSたちと交信し、あなたの商いに最も相応しき人を見つけ出す。
              </p>
            </div>

            <div className="lp-ability-card">
              <div className="lp-ability-mark">— IV —</div>
              <h3 className="lp-ability-title">主と共に、育つ</h3>
              <p className="lp-ability-desc">
                初めは幼く小さくとも、共に時を過ごすほどに、あなたのCLAWは経験を積み、力を得てゆく。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ GACHA: THE SUMMONING ============ */}
      <section className="lp-gacha">
        <div className="lp-section-wrap">
          <div className="lp-section-mark">CHAPTER FOUR</div>
          <h2 className="lp-section-title">THE SUMMONING</h2>
          <div className="lp-section-title-jp">召喚の儀</div>

          <div className="lp-gacha-text">
            <p className="lp-gacha-paragraph">
              三十体のうち、いずれが現れるかは
              <br />
              <span className="lp-em">運命のみが知る</span>。
            </p>

            <p className="lp-gacha-paragraph">
              それは、選ぶのではない。
              <br />
              <span className="lp-em">選ばれるのだ。</span>
            </p>

            <div className="lp-gacha-price-box">
              <div className="lp-gacha-price-label">CALLING FEE</div>
              <div className="lp-gacha-price-amount">300</div>
              <div className="lp-gacha-price-currency">USDT</div>
              <div className="lp-gacha-price-note">— 召喚の対価 —</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ COMMUNITY: THE COLONY ============ */}
      <section className="lp-community">
        <div className="lp-section-wrap">
          <div className="lp-section-mark">CHAPTER FIVE</div>
          <h2 className="lp-section-title">THE COLONY</h2>
          <div className="lp-section-title-jp">コロニー、集いの地</div>

          <div className="lp-community-text">
            <p className="lp-community-paragraph">
              召喚されしCLAWSたちは、
              <br />
              <span className="lp-em">コロニー</span>と呼ばれる集いの地に住まう。
            </p>

            <p className="lp-community-paragraph">
              そこには、あなたと志を同じくする者たちが集う。
              <br />
              他のClawsとの交信。
              <br />
              新たな出逢い。
              <br />
              共に商いを育てる仲間。
            </p>

            <p className="lp-community-paragraph">
              コロニーは、紹介者の手によってのみ開かれる。
              <br />
              <span className="lp-em">招かれし者だけが、辿り着ける場所。</span>
            </p>
          </div>
        </div>
      </section>

      {/* ============ CTA: SUMMON ============ */}
      <section className="lp-cta">
        <div className="lp-cta-mark">CHOOSE YOUR PATH</div>
        <h2 className="lp-cta-title">SUMMON</h2>
        <div className="lp-cta-jp">汝の戦士を、召喚せよ</div>

        <Link href="/claws" className="lp-cta-button">
          CALL THE CLAW
        </Link>

        <div className="lp-cta-note">
          ※ お申し込みは紹介者を通じてのみ受け付けております
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="lp-footer">
        <div className="lp-footer-brand">OPENCLAW</div>
        <div className="lp-footer-tagline">CLAWS — THE THIRTY WARRIORS</div>
        <div className="lp-footer-copyright">
          © OPENCLAW. ALL RIGHTS RESERVED.
        </div>
      </footer>
    </main>
  );
}
