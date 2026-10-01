"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  ArrowRightIcon,
  LockSimpleIcon,
  XIcon,
  PlayIcon,
} from "@phosphor-icons/react";
import { Brand } from "./brand";
import { Symbol } from "./symbol";
import { useDialog } from "./use-dialog";

export function Home() {
  const [modal, setModal] = useState<"create" | "join" | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [networkReady, setNetworkReady] = useState<boolean | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal })
      .then((r) => r.json())
      .then((status) => setNetworkReady(status.encryptedRooms === "ready"))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useDialog(!!modal, () => {
    if (!busy) setModal(null);
  });
  async function create() {
    if (!name.trim()) {
      setError("Give your room a name first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { createRoom } = await import("@/lib/client-chain");
      const id = await createRoom(name.trim());
      window.location.href = `/room/${id}`;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not create the room. Please try again.",
      );
      setBusy(false);
    }
  }
  function join() {
    let candidate = code.trim();
    if (candidate.includes("/")) {
      try {
        candidate =
          new URL(candidate, window.location.origin).pathname
            .replace(/\/$/, "")
            .split("/")
            .pop() ?? "";
      } catch {
        candidate = "";
      }
    }
    if (!/^[a-z0-9]{1,13}$/.test(candidate)) {
      setError("Paste a room link or a valid room code.");
      return;
    }
    window.location.href = `/room/${encodeURIComponent(candidate)}`;
  }
  return (
    <div className="home-shell">
      <header className="site-header">
        <Brand />
        <nav>
          <Link href="/how-it-works">
            How it works <ArrowUpRightIcon size={15} />
          </Link>
          <button
            className="text-button"
            onClick={() => {
              setModal("join");
              setError("");
            }}
          >
            Join a room <ArrowRightIcon size={16} />
          </button>
        </nav>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="status-dot" /> THE SECRET HAS NO KEEPER
            </div>
            <h1>
              Good at secrets?
              <br />
              Prove it<span className="accent">.</span>
            </h1>
            <p className="hero-description">
              One hidden code. Ten attempts. A room full of rivals.
              <br className="desktop-break" /> Crack it first. Nobody gets to
              peek.
            </p>
            <div className="hero-actions">
              <button
                className="button primary"
                onClick={() => {
                  setModal("create");
                  setError("");
                }}
              >
                Create a room <ArrowUpRightIcon size={19} />
              </button>
              <Link href="/room/practice" className="button secondary">
                <PlayIcon size={16} weight="fill" /> Try it solo
              </Link>
            </div>
            <p className="hero-note">
              Play in your browser. No downloads. No crypto to buy.
            </p>
            <div className="hero-social">
              <span className="tiny-symbol">
                <Symbol value={1} size={17} />
              </span>
              <span className="tiny-symbol">
                <Symbol value={0} size={17} />
              </span>
              <span className="tiny-symbol">
                <Symbol value={4} size={17} />
              </span>
              <span>
                Bring your friends.
                <br />
                <strong>Leave your trust issues.</strong>
              </span>
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="An encrypted code, waiting to be cracked"
          >
            <div className="art-coordinate top">VAULT 001 / ACCESS SEALED</div>
            <div className="orbital orbital-one" />
            <div className="orbital orbital-two" />
            <div className="vault-graphic">
              <div className="vault-disc">
                <div className="vault-eye">
                  <div className="vault-pupil" />
                </div>
                <div className="vault-slash" />
              </div>
              <span className="disc-label">NO ONE HAS THE ANSWER.</span>
            </div>
            <div className="art-code">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="sealed-slot">
                  <LockSimpleIcon size={21} weight="light" />
                </div>
              ))}
            </div>
            <div className="art-coordinate bottom">
              <span className="status-dot" /> ENCRYPTED BY DESIGN{" "}
              <span>05 SYMBOLS</span>
            </div>
          </div>
        </section>
        <div className="brand-strip">
          <span>THE GAME IS SIMPLE. THE SECRET ISN’T.</span>
          <div>
            <span>
              Built on <strong>Solana</strong>
            </span>
            <span className="strip-divider" />
            <span>
              Encrypted with <strong>Arcium</strong>
            </span>
          </div>
        </div>
        <section className="how-preview">
          <div>
            <div className="eyebrow muted">YOUR MISSION</div>
            <h2>
              A little deduction.
              <br />A lot of suspicion.
            </h2>
            <Link href="/how-it-works" className="inline-link">
              Read the field guide <ArrowUpRightIcon size={17} />
            </Link>
          </div>
          <ol className="steps">
            <li>
              <span className="step-number">01</span>
              <div>
                <h3>Enter the room.</h3>
                <p>
                  Invite your friends. Everyone races to solve the same
                  five-symbol code.
                </p>
              </div>
            </li>
            <li>
              <span className="step-number">02</span>
              <div>
                <h3>Read the clues.</h3>
                <p>
                  Each guess tells you how many symbols are in the right place,
                  and how many belong somewhere else.
                </p>
              </div>
            </li>
            <li>
              <span className="step-number">03</span>
              <div>
                <h3>Beat them to it.</h3>
                <p>
                  Ten attempts each. Repeated symbols are allowed. First to
                  crack all five wins.
                </p>
              </div>
            </li>
          </ol>
        </section>
        <section className="trust-banner">
          <LockSimpleIcon size={29} weight="light" />
          <div>
            <h3>The host plays by the same rules.</h3>
            <p>
              In encrypted rooms, Arcium generates the code and checks guesses
              inside confidential computation. Our web server never receives the
              code in plaintext.
            </p>
          </div>
          <Link
            href="/how-it-works#under-the-hood"
            aria-label="Learn about encrypted rooms"
          >
            <ArrowUpRightIcon size={24} />
          </Link>
        </section>
      </main>
      <footer className="site-footer">
        <Brand />
        <span>One secret. No peeking.</span>
        <Link href="/pitch">
          Project & pitch <ArrowUpRightIcon size={14} />
        </Link>
      </footer>
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button
              className="modal-close"
              aria-label="Close dialog"
              disabled={busy}
              onClick={() => setModal(null)}
            >
              <XIcon size={22} />
            </button>
            <div className="eyebrow muted">
              {modal === "create"
                ? "A SECRET WORTH KEEPING"
                : "YOUR INVITATION"}
            </div>
            <h2 id="modal-title">
              {modal === "create" ? "Make some trouble." : "You’re in on it."}
            </h2>
            <p>
              {modal === "create"
                ? "Name your room, invite your rivals, and let the network seal the secret."
                : "Paste your invitation link or enter the room code."}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (modal === "create") void create();
                else join();
              }}
            >
              <label htmlFor="room-field">
                {modal === "create" ? "Room name" : "Room link or code"}
              </label>
              <input
                id="room-field"
                maxLength={modal === "create" ? 32 : 200}
                placeholder={
                  modal === "create"
                    ? "Thursday night suspects"
                    : "nopeek…/room/…"
                }
                value={modal === "create" ? name : code}
                onChange={(e) =>
                  modal === "create"
                    ? setName(e.target.value)
                    : setCode(e.target.value)
                }
                disabled={busy}
              />
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button primary full" disabled={busy}>
                {busy
                  ? "Sealing your room…"
                  : modal === "create"
                    ? "Create encrypted room"
                    : "Enter the room"}
                <ArrowRightIcon size={18} />
              </button>
            </form>
            {modal === "create" && (
              <p className="modal-footnote">
                {networkReady === false && (
                  <>
                    Multiplayer is coming online. Solo practice is available
                    now.
                    <br />
                  </>
                )}
                Encrypted rooms run on Solana devnet. Network fees are
                sponsored. <Link href="/room/practice">
                  Try solo practice
                </Link>{" "}
                while a room is sealing.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
