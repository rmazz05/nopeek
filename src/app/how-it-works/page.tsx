import Link from "next/link";
import { Brand } from "@/components/brand";
import { Symbol } from "@/components/symbol";
export default function Guide() {
  return (
    <div className="home-shell">
      <header className="site-header">
        <Brand />
        <Link className="inline-link" href="/">
          Back to the game ↗
        </Link>
      </header>
      <main className="guide-page">
        <div className="eyebrow muted">THE FIELD GUIDE</div>
        <h1>
          Five symbols.
          <br />
          Zero shortcuts.
        </h1>
        <p className="guide-lead">
          NOPEEK is a race of deduction. Every player is trying to crack the
          same code. Even the host starts in the dark.
        </p>
        <section>
          <h2>Read your feedback</h2>
          <div className="example-code">
            {[0, 1, 2, 3, 4].map((s) => (
              <span key={s}>
                <Symbol value={s} />
              </span>
            ))}
          </div>
          <div className="guide-feedback">
            <span className="feedback-peg exact" />
            <p>
              <strong>Exact:</strong> a correct symbol in the correct position.
            </p>
            <span className="feedback-peg misplaced" />
            <p>
              <strong>Elsewhere:</strong> a correct symbol in a different
              position.
            </p>
          </div>
          <p>
            The clues are counts, not labels for particular slots. One symbol
            can appear more than once, but each occurrence can only count once.
          </p>
          <p>
            For example: if the code has one circle and you guess five circles,
            only one circle counts.
          </p>
        </section>
        <section>
          <h2>The room rules</h2>
          <ul>
            <li>
              Five positions, six possible symbols, ten attempts per player.
            </li>
            <li>
              Up to four players. The host can start alone or wait for friends.
            </li>
            <li>Once the game starts, the player roster is locked.</li>
            <li>First verified guess with all five positions correct wins.</li>
            <li>
              The race ends after 20 minutes or when everyone runs out of
              attempts.
            </li>
            <li>
              A correct guess submitted before the deadline can still finish
              processing afterward.
            </li>
          </ul>
        </section>
        <section id="under-the-hood">
          <div className="eyebrow muted">UNDER THE HOOD</div>
          <h2>A referee without the answer.</h2>
          <p>
            In an encrypted room, our Solana program asks Arcium’s MPC network
            to generate the secret. The encrypted code is stored on Solana. Each
            guess is evaluated against it in confidential computation; only the
            feedback counts are returned.
          </p>
          <div className="architecture-row">
            <span>Your guess</span>
            <b>→</b>
            <span>Solana rules</span>
            <b>→</b>
            <span>Arcium computation</span>
            <b>→</b>
            <span>Verified clue</span>
          </div>
          <p>
            The host and web server do not receive a decryption key.
            Confidentiality depends on Arcium’s security assumptions, including
            at least one honest node in its MPC cluster. Guess history and
            feedback are public: deductions are part of the game, so secrecy
            doesn’t mean the answer can’t eventually be inferred.
          </p>
          <p>
            NOPEEK is a devnet hackathon prototype, not an audited application.
            A retained program upgrade authority, where present, is a trust
            assumption; deployment details are shown in the room’s inspection
            panel.
          </p>
          <p>
            <a
              href="https://github.com/arcium-hq/examples"
              target="_blank"
              rel="noreferrer"
            >
              Explore Arcium’s official examples ↗
            </a>
          </p>
        </section>
        <section>
          <h2>What happens in practice?</h2>
          <p>
            Solo practice runs entirely in your browser. It teaches the rules,
            saves your progress locally, and has no network delay. Its code is
            readable by someone inspecting the browser; it does not demonstrate
            encrypted computation.
          </p>
        </section>
        <Link href="/room/practice" className="button primary">
          Try a practice round ↗
        </Link>
      </main>
      <footer className="site-footer">
        <Brand />
        <span>One secret. No peeking.</span>
        <Link href="/pitch">Project & pitch ↗</Link>
      </footer>
    </div>
  );
}
