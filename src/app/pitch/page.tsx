import Link from "next/link";
import { Brand } from "@/components/brand";
export const metadata = { title: "NOPEEK — WHU / Superteam project pitch" };
const slides = [
  {
    label: "01 / THE IDEA",
    title: "One secret. Nobody gets to peek.",
    body: (
      <>
        <p>
          <strong>NOPEEK</strong> is a browser-based multiplayer codebreaking
          game. Friends race to solve one hidden code, with ten attempts each.
        </p>
        <p>
          The twist: the secret is generated and checked inside confidential
          computation. The host and web server are not given the answer.
        </p>
      </>
    ),
  },
  {
    label: "02 / THE PROBLEM",
    title: "Hidden-information games still need a secret keeper.",
    body: (
      <>
        <p>
          In a conventional online puzzle, a server knows the solution. Players
          depend on its operator to keep the answer private and apply the rules
          fairly.
        </p>
        <p>
          Publishing the rules is easy. Publishing the complete referee without
          exposing its secret is harder.
        </p>
      </>
    ),
  },
  {
    label: "03 / THE EXPERIENCE",
    title: "Five symbols. Ten attempts. One winner.",
    body: (
      <>
        <p>
          Create a room, share a link, and race with up to four friends. Each
          guess returns counts for correct positions and symbols that belong
          elsewhere.
        </p>
        <p>
          No wallet extension, token purchase, or crypto knowledge is required.
          Browser-generated player keys sign actions; the app sponsors devnet
          fees.
        </p>
      </>
    ),
  },
  {
    label: "04 / WHY SOLANA + ARCIUM",
    title: "A referee without a readable answer.",
    body: (
      <>
        <p>
          <strong>Arcium</strong> generates and stores the secret as MXE-owned
          ciphertext, and computes feedback inside MPC.
        </p>
        <p>
          <strong>Solana</strong> stores the encrypted room, enforces membership
          and attempt limits, and accepts verified callbacks that determine the
          winner.
        </p>
        <p>The integration is the referee, not an added payment button.</p>
      </>
    ),
  },
  {
    label: "05 / THE PROTOTYPE",
    title: "A small game with a complete loop.",
    body: (
      <ul>
        <li>Solo practice with honest disclosure of its local execution.</li>
        <li>
          Encrypted room creation, invitations, locked player roster and race
          timer.
        </li>
        <li>
          Duplicate-safe scoring, signed guesses, verified feedback and winner
          state.
        </li>
        <li>Public room inspection, ciphertext and Explorer links.</li>
        <li>
          Mobile layout, keyboard controls, saved player identity and recovery
          flows.
        </li>
      </ul>
    ),
  },
  {
    label: "06 / FIRST USERS",
    title: "Start with the room we’re already in.",
    body: (
      <>
        <p>
          First users: WHU participants, student groups and friends who already
          play browser party games.
        </p>
        <p>
          Each host brings up to three other players through an invitation link.
          The initial validation is observed play: do they understand the clues,
          finish a round and ask for another?
        </p>
        <p>No user counts or retention claims are assumed before testing.</p>
      </>
    ),
  },
  {
    label: "07 / NEXT",
    title: "A foundation for games with real secrets.",
    body: (
      <>
        <p>
          Start with codebreaking. Explore longer cooperative missions and
          event-specific challenges after validating repeat play.
        </p>
        <p>
          Potential business: themed room packs and paid event hosting.
          Sponsored compute costs and sustainable pricing need measurement.
        </p>
        <p>
          Priorities beyond the hackathon: security review, deployment authority
          controls, network latency and browser identity recovery.
        </p>
      </>
    ),
  },
  {
    label: "08 / THE DEMO",
    title: "Don’t trust the pitch. Play the game.",
    body: (
      <>
        <p>
          Open a room in two browsers, inspect the encrypted account, submit
          guesses and follow the verified feedback.
        </p>
        <p>
          Security assumptions are explicit: Arcium cluster confidentiality,
          program upgrade authority where retained, public clues, limited
          guesses and a devnet prototype.
        </p>
        <div className="hero-actions">
          <Link href="/" className="button primary">
            Open NOPEEK ↗
          </Link>
          <Link
            href="/how-it-works#under-the-hood"
            className="button secondary"
          >
            Read the architecture
          </Link>
        </div>
      </>
    ),
  },
];
export default function Pitch() {
  return (
    <div className="home-shell">
      <header className="site-header">
        <Brand />
        <Link href="/" className="inline-link">
          Open the game ↗
        </Link>
      </header>
      <main className="pitch-deck">
        <section className="pitch-recording">
          <div className="eyebrow muted">ACTUAL PROTOTYPE RECORDING</div>
          <h2>Watch the encrypted round.</h2>
          <p>
            Two players, real Solana instructions and Arcium MPC feedback. This
            recording uses localnet; the network is labeled in the game.
          </p>
          <video
            controls
            preload="metadata"
            poster="/og.png"
            aria-label="NOPEEK encrypted multiplayer demonstration on localnet"
          >
            <source src="/nopeek-demo.webm" type="video/webm" />
            <a href="/nopeek-demo.webm">Download the demo recording</a>
          </video>
        </section>
        {slides.map((slide, i) => (
          <section className="pitch-slide" key={slide.label}>
            <div className="eyebrow muted">
              WHU HACKATHON 2026 · {slide.label}
            </div>
            {i === 0 ? <h1>{slide.title}</h1> : <h2>{slide.title}</h2>}
            {slide.body}
          </section>
        ))}
      </main>
      <footer className="site-footer">
        <Brand />
        <span>Built for Superteam Germany · WHU 2026</span>
        <a href="/nopeek-pitch.pdf" download>
          Download pitch PDF ↗
        </a>
        <a href="/nopeek-pitch.pptx" download>
          Editable PowerPoint ↗
        </a>
      </footer>
    </div>
  );
}
