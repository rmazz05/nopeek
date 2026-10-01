"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  CheckIcon,
  CopyIcon,
  EyeSlashIcon,
  InfoIcon,
  LockSimpleIcon,
  SpinnerGapIcon,
  TrophyIcon,
  XIcon,
  BackspaceIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
} from "@phosphor-icons/react";
import { Brand } from "./brand";
import { Symbol } from "./symbol";
import { useDialog } from "./use-dialog";
import {
  CODE_LENGTH,
  MAX_ATTEMPTS,
  SYMBOL_NAMES,
  formatClock,
  scoreGuess,
  secureCode,
  isValidCode,
  type Room,
} from "@/lib/game";

const STORAGE_KEY = "nopeek-practice-v1";
function freshPractice(): Room {
  const now = Date.now();
  return {
    id: "practice",
    title: "The quiet room",
    host: "you",
    status: "playing",
    players: [{ publicKey: "you", name: "You", guesses: [], joinedAt: now }],
    createdAt: now,
    startedAt: now,
    expiresAt: now + 20 * 60 * 1000,
    mode: "practice",
    solution: secureCode(),
  };
}
export function GameRoom({ id }: { id: string }) {
  const practice = id === "practice";
  const [room, setRoom] = useState<Room | null>(null);
  const [me, setMe] = useState(practice ? "you" : "");
  const [draft, setDraft] = useState<(number | null)[]>(
    Array(CODE_LENGTH).fill(null),
  );
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clock, setClock] = useState(Date.now());
  const [showGuide, setShowGuide] = useState(false);
  const [inspect, setInspect] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nickname, setNickname] = useState("");
  const [sound, setSound] = useState(false);
  const [initialError, setInitialError] = useState("");
  useDialog(showGuide || inspect, () => {
    setShowGuide(false);
    setInspect(false);
  });
  const endRef = useRef<HTMLDivElement>(null);
  const refresh = useCallback(async () => {
    if (practice) return;
    try {
      const response = await fetch(`/api/room/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Room unavailable.");
      setRoom(body);
      setInitialError("");
    } catch (e) {
      setInitialError(
        e instanceof Error ? e.message : "Could not load the room.",
      );
    }
  }, [id, practice]);
  useEffect(() => {
    if (practice) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : null;
        setRoom(
          parsed &&
            parsed.mode === "practice" &&
            isValidCode(parsed.solution) &&
            Array.isArray(parsed.players) &&
            parsed.players.length === 1 &&
            Array.isArray(parsed.players[0].guesses) &&
            parsed.players[0].guesses.every(
              (g: { symbols: unknown; exact: number; misplaced: number }) =>
                isValidCode(g.symbols) &&
                Number.isInteger(g.exact) &&
                Number.isInteger(g.misplaced) &&
                g.exact >= 0 &&
                g.misplaced >= 0 &&
                g.exact + g.misplaced <= 5,
            ) &&
            Number.isFinite(parsed.expiresAt) &&
            ["playing", "won", "expired"].includes(parsed.status)
            ? parsed
            : freshPractice(),
        );
      } catch {
        setRoom(freshPractice());
      }
    } else {
      import("@/lib/client-chain").then(({ identity }) =>
        setMe(identity().publicKey.toBase58()),
      );
      void refresh();
      const interval = setInterval(() => void refresh(), 3000);
      return () => clearInterval(interval);
    }
  }, [practice, refresh]);
  useEffect(() => {
    if (practice && room) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(room));
      } catch {
        /* Storage can be disabled; the round still works in memory. */
      }
    }
  }, [practice, room]);
  useEffect(() => {
    const interval = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (practice && room?.status === "playing" && clock >= room.expiresAt)
      setRoom({ ...room, status: "expired" });
  }, [clock, practice, room]);
  const player = room?.players.find((p) => p.publicKey === me);
  const guesses = player?.guesses ?? [];
  const over = room?.status === "won" || room?.status === "expired";
  const exhausted = guesses.length >= MAX_ATTEMPTS;
  const canPlay =
    room?.status === "playing" &&
    !!player &&
    !busy &&
    !exhausted &&
    clock < room.expiresAt &&
    !guesses.some((g) => g.pending);
  function beep(won = false) {
    if (!sound) return;
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(won ? 660 : 330, context.currentTime);
      gain.gain.setValueAtTime(0.045, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.16);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.17);
      oscillator.onended = () => void context.close();
    } catch {}
  }
  const choose = useCallback(
    (value: number) => {
      if (!canPlay) return;
      setDraft((previous) => {
        const next = [...previous];
        next[selected] = value;
        return next;
      });
      setSelected(Math.min(selected + 1, CODE_LENGTH - 1));
    },
    [canPlay, selected],
  );
  async function submit() {
    if (!canPlay || !room || draft.some((s) => s === null)) return;
    const symbols = draft as number[];
    setError("");
    if (practice) {
      const score = scoreGuess(room.solution!, symbols);
      const won = score.exact === 5;
      const nextGuesses = [...guesses, { symbols: [...symbols], ...score }];
      const nextRoom: Room = {
        ...room,
        players: [{ ...player!, guesses: nextGuesses }],
        status: won
          ? "won"
          : nextGuesses.length >= MAX_ATTEMPTS
            ? "expired"
            : "playing",
        winner: won ? me : undefined,
      };
      setRoom(nextRoom);
      setDraft(Array(CODE_LENGTH).fill(null));
      setSelected(0);
      beep(won);
      return;
    }
    setBusy(true);
    try {
      const { chainAction } = await import("@/lib/client-chain");
      await chainAction("guess", { id, symbols });
      setDraft(Array(CODE_LENGTH).fill(null));
      setSelected(0);
      await refresh();
      beep();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your guess could not be submitted.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    function key(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.closest("a, .game-header, .room-sidebar, .game-recovery") ||
        showGuide ||
        inspect ||
        !canPlay
      )
        return;
      if (event.key >= "1" && event.key <= "6") {
        event.preventDefault();
        choose(Number(event.key) - 1);
      } else if (event.key === "Backspace") {
        event.preventDefault();
        setDraft((prev) => {
          const next = [...prev];
          const index =
            next[selected] === null ? Math.max(0, selected - 1) : selected;
          next[index] = null;
          setSelected(index);
          return next;
        });
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        setSelected((prev) =>
          Math.max(
            0,
            Math.min(4, prev + (event.key === "ArrowRight" ? 1 : -1)),
          ),
        );
      } else if (event.key === "Enter") {
        if (
          target.closest("button") &&
          !target.closest(".symbol-palette, .draft-slots")
        )
          return;
        event.preventDefault();
        void submit();
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [canPlay, choose, draft, showGuide, inspect, selected, room]);
  useEffect(() => {
    const history = endRef.current?.parentElement;
    history?.scrollTo({ top: history.scrollHeight, behavior: "smooth" });
  }, [guesses.length]);
  async function action(kind: string) {
    setBusy(true);
    setError("");
    try {
      const { chainAction } = await import("@/lib/client-chain");
      await chainAction(kind, {
        id,
        name: nickname.trim() || "A mysterious stranger",
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("Copy the address from your browser to invite friends.");
    }
  }
  function replay() {
    setRoom(freshPractice());
    setDraft(Array(5).fill(null));
    setSelected(0);
    setError("");
  }
  if (!room)
    return (
      <div className="game-shell">
        <header className="game-header">
          <Brand dark />
          <Link href="/">Leave room</Link>
        </header>
        <main className="loading-room">
          {initialError ? (
            <>
              <EyeSlashIcon size={42} />
              <h1>This door won’t open yet.</h1>
              <p role="alert">{initialError}</p>
              <button className="button primary" onClick={() => void refresh()}>
                Try again
              </button>
              <Link className="inline-link" href="/room/practice">
                Play solo practice instead ↗
              </Link>
            </>
          ) : (
            <>
              <div className="loading-slots">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} style={{ animationDelay: `${i * 100}ms` }} />
                ))}
              </div>
              <p>Opening your room…</p>
            </>
          )}
        </main>
      </div>
    );
  const winner = room.players.find((p) => p.publicKey === room.winner);
  return (
    <div className="game-shell">
      <header className="game-header">
        <Brand dark />
        <div className="game-header-actions">
          <button
            aria-label={sound ? "Mute sound" : "Enable sound"}
            onClick={() => setSound(!sound)}
          >
            {sound ? (
              <SpeakerHighIcon size={19} />
            ) : (
              <SpeakerSlashIcon size={19} />
            )}
          </button>
          <button aria-label="How to play" onClick={() => setShowGuide(true)}>
            <InfoIcon size={18} />
            <span>How to play</span>
          </button>
          <Link href="/" aria-label="Leave room">
            <XIcon size={22} />
          </Link>
        </div>
      </header>
      <main className="game-layout">
        <aside className="room-sidebar">
          <div className="eyebrow game-muted">
            {practice ? "SOLO PRACTICE" : "ENCRYPTED ROOM"}
          </div>
          <h1>
            {room.title}
            <span className="accent">.</span>
          </h1>
          <div className="room-mode">
            <span className="status-dot" />
            {practice
              ? "Local browser game"
              : `Arcium · Solana ${room.network ?? "devnet"}`}
          </div>
          <div className="room-summary">
            <div>
              <span>TIME REMAINING</span>
              <strong
                className={room.expiresAt - clock < 60000 ? "accent" : ""}
              >
                {room.status === "waiting" || room.status === "sealing"
                  ? "20:00"
                  : over
                    ? "—"
                    : formatClock((room.expiresAt - clock) / 1000)}
              </strong>
            </div>
            <div>
              <span>ATTEMPTS LEFT</span>
              <strong>
                {Math.max(0, MAX_ATTEMPTS - guesses.length)}
                <small> / 10</small>
              </strong>
            </div>
          </div>
          <div className="players-title">
            {practice ? "THE SUSPECT" : "THE SUSPECTS"}
            <span>
              {room.players.length}
              {!practice && " / 4"}
            </span>
          </div>
          <div className="player-list">
            {room.players.map((p, i) => (
              <div
                key={p.publicKey}
                className={`player-row ${p.publicKey === me ? "player-you" : ""}`}
              >
                <span className="player-avatar">
                  <Symbol value={i % 6} size={18} />
                </span>
                <div>
                  <strong>
                    {p.name}
                    {p.publicKey === me && <small> YOU</small>}
                  </strong>
                  <span>
                    {room.status === "waiting"
                      ? "Ready to crack it"
                      : `${p.guesses.filter((g) => !g.pending).length} attempts used`}
                  </span>
                </div>
                {room.winner === p.publicKey ? (
                  <TrophyIcon size={18} className="accent" />
                ) : (
                  <span className="player-status" />
                )}
              </div>
            ))}
          </div>
          {!practice && (
            <button className="invite-button" onClick={() => void copy()}>
              {copied ? <CheckIcon size={17} /> : <CopyIcon size={17} />}{" "}
              {copied ? "Invitation copied" : "Copy invitation"}
            </button>
          )}
          <div className="sidebar-bottom">
            <button className="inspect-link" onClick={() => setInspect(true)}>
              <LockSimpleIcon size={16} />{" "}
              {practice ? "About practice mode" : "Inspect the sealed secret"}
              <ArrowUpRightIcon size={14} />
            </button>
            <p>
              {practice
                ? "Practice teaches the rules. Encrypted multiplayer rooms use Arcium to keep the code off our server."
                : "The clues are public. The code stays encrypted. Even the host has to solve it."}
            </p>
          </div>
        </aside>
        <section className="game-board">
          <div className="board-heading">
            <div>
              <div className="eyebrow game-muted">THE VAULT</div>
              <h2>
                {over
                  ? room.status === "won"
                    ? "Secret cracked."
                    : "The vault stays shut."
                  : "What’s your best guess?"}
              </h2>
            </div>
            <span className="board-badge">
              <LockSimpleIcon size={13} />
              {over ? "ROUND OVER" : "SEALED"}
            </span>
          </div>
          <div className="secret-display">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i}>
                {room.status === "won" && winner ? (
                  <Symbol
                    value={
                      winner.guesses.find((g) => g.exact === 5)?.symbols[i] ?? 0
                    }
                    size={25}
                  />
                ) : practice && over ? (
                  <Symbol value={room.solution![i]} size={25} />
                ) : (
                  <LockSimpleIcon size={19} weight="light" />
                )}
              </span>
            ))}
          </div>
          <div className="board-separator">
            <span>YOUR ATTEMPTS</span>
            <span>EXACT / ELSEWHERE</span>
          </div>
          <div className="guess-history" aria-live="polite">
            {guesses.length === 0 ? (
              <div className="empty-history">
                <div className="empty-ornament">
                  <Symbol value={1} size={19} />
                </div>
                <p>Every secret starts with a guess.</p>
                <span>Pick five symbols below. Repeats are allowed.</span>
              </div>
            ) : (
              guesses.map((guess, index) => (
                <div
                  className={`guess-row ${guess.exact === 5 ? "winning-row" : ""}`}
                  key={index}
                >
                  <span className="attempt-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="guess-symbols">
                    {guess.symbols.map((s, i) => (
                      <span key={i}>
                        <Symbol value={s} size={23} />
                      </span>
                    ))}
                  </div>
                  <div className="guess-feedback">
                    {guess.pending ? (
                      <span className="pending-clue">Verifying…</span>
                    ) : guess.failed ? (
                      <span className="pending-clue">No clue returned</span>
                    ) : (
                      <>
                        <div
                          aria-label={`${guess.exact} exact, ${guess.misplaced} elsewhere`}
                          className="feedback-dots"
                        >
                          {Array.from({ length: 5 }, (_, i) => (
                            <span
                              key={i}
                              className={`feedback-peg ${i < guess.exact ? "exact" : i < guess.exact + guess.misplaced ? "misplaced" : "absent"}`}
                            />
                          ))}
                        </div>
                        <small>
                          {guess.exact} / {guess.misplaced}
                        </small>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>
          {over ? (
            <div className="end-state">
              <TrophyIcon size={29} weight="light" />
              <h3>
                {room.status === "won"
                  ? room.winner === me
                    ? "You had their number."
                    : `${winner?.name ?? "A rival"} cracked it first.`
                  : "Some secrets take another round."}
              </h3>
              <p>
                {room.status === "won"
                  ? `${winner?.guesses.length ?? guesses.length} attempts. A little logic, a little nerve.`
                  : exhausted
                    ? "Ten attempts down. Try a different opening next time."
                    : "Time’s up. Your next breakthrough is one room away."}
              </p>
              {practice ? (
                <button className="button primary" onClick={replay}>
                  Another secret <ArrowRightIcon size={18} />
                </button>
              ) : (
                <Link href="/" className="button primary">
                  Start another room <ArrowRightIcon size={18} />
                </Link>
              )}
            </div>
          ) : room.status === "sealing" ? (
            <div className="waiting-state">
              <div className="loading-slots">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} />
                ))}
              </div>
              <h3>The network is making a secret.</h3>
              <p>
                This can take a little while on devnet. Your room will open
                automatically.
              </p>
            </div>
          ) : !player ? (
            <div className="waiting-state">
              <h3>There’s room for one more suspect.</h3>
              {room.status === "waiting" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action("join");
                  }}
                >
                  <label htmlFor="nickname">Your nickname</label>
                  <input
                    id="nickname"
                    placeholder="The usual suspect"
                    maxLength={24}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                  <button
                    className="button primary"
                    disabled={busy || !nickname.trim()}
                  >
                    {busy ? "Joining…" : "Join the room"}
                    <ArrowRightIcon size={17} />
                  </button>
                </form>
              ) : (
                <p>
                  The race has started. You can watch the leaderboard, but the
                  player roster is locked.
                </p>
              )}
            </div>
          ) : room.status === "waiting" ? (
            <div className="waiting-state">
              <h3>
                {room.host === me
                  ? "Assemble your suspects."
                  : "You’re on the list."}
              </h3>
              <p>
                {room.host === me
                  ? "Share the room link, then start when everyone’s here. You can also play alone."
                  : "The host will start the race when everyone’s ready."}
              </p>
              {room.host === me && (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => void action("start")}
                >
                  {busy ? "Starting…" : "Start the race"}
                  <ArrowRightIcon size={18} />
                </button>
              )}
            </div>
          ) : exhausted ? (
            <div className="waiting-state">
              <h3>You’re out of attempts.</h3>
              <p>
                The other suspects are still working. Watch the race, or start a
                new room.
              </p>
              <Link href="/" className="button secondary">
                Back to NOPEEK
              </Link>
            </div>
          ) : (
            <div className="input-zone">
              <div className="draft-row">
                <span className="attempt-number">
                  {String(guesses.length + 1).padStart(2, "0")}
                </span>
                <div className="draft-slots">
                  {draft.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setSelected(i)}
                      disabled={!canPlay}
                      className={selected === i ? "selected" : ""}
                      aria-label={`Position ${i + 1}: ${s === null ? "empty" : SYMBOL_NAMES[s]}`}
                    >
                      {s === null ? (
                        <span className="slot-placeholder">{i + 1}</span>
                      ) : (
                        <Symbol value={s} size={25} />
                      )}
                    </button>
                  ))}
                </div>
                <button
                  className="erase-button"
                  aria-label="Clear guess"
                  disabled={busy}
                  onClick={() => {
                    setDraft(Array(5).fill(null));
                    setSelected(0);
                  }}
                >
                  <BackspaceIcon size={22} />
                </button>
              </div>
              <div className="symbol-palette">
                {SYMBOL_NAMES.map((name, i) => (
                  <button
                    key={name}
                    onClick={() => choose(i)}
                    disabled={!canPlay}
                    aria-label={`Choose ${name}`}
                    title={`${name} — key ${i + 1}`}
                  >
                    <Symbol value={i} size={23} />
                    <kbd>{i + 1}</kbd>
                  </button>
                ))}
              </div>
              <div className="submit-row">
                <span className="keyboard-hint">
                  Use keys <kbd>1–6</kbd> · <kbd>↵</kbd> to submit
                </span>
                <button
                  className="button primary"
                  onClick={() => void submit()}
                  disabled={!canPlay || draft.some((s) => s === null)}
                >
                  {busy || guesses.some((g) => g.pending)
                    ? "Checking your guess…"
                    : "Submit guess"}
                  {busy ? (
                    <SpinnerGapIcon className="spin" size={18} />
                  ) : (
                    <ArrowRightIcon size={18} />
                  )}
                </button>
              </div>
            </div>
          )}
          {guesses.some(
            (g) => g.pending && g.queuedAt && clock - g.queuedAt >= 180000,
          ) && (
            <div className="game-recovery">
              <p>
                The network has not returned this clue. You can cancel the
                attempt and continue. It still counts toward your ten attempts.
              </p>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => void action("recover")}
              >
                Cancel stalled attempt
              </button>
            </div>
          )}
          {room.error && (
            <p className="game-error" role="alert">
              {room.error}
            </p>
          )}
          {error && (
            <p className="game-error" role="alert">
              {error}
            </p>
          )}
          {initialError && (
            <p className="game-error" role="status">
              Connection interrupted. Your last known game state is shown.{" "}
              {initialError}
            </p>
          )}
          <div className="board-legend">
            <span>
              <i className="feedback-peg exact" /> Right symbol, right place
            </span>
            <span>
              <i className="feedback-peg misplaced" /> Right symbol, wrong place
            </span>
          </div>
        </section>
      </main>
      <footer className="game-footer">
        <span>
          {practice
            ? "PRACTICE MODE · SECRET STORED LOCALLY"
            : `ARCIUM MPC · SOLANA ${(room.network ?? "devnet").toUpperCase()}`}
        </span>
        <span>Play fair. Think sideways.</span>
      </footer>
      {(showGuide || inspect) && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowGuide(false);
              setInspect(false);
            }
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-dialog-title"
          >
            <button
              className="modal-close"
              aria-label="Close dialog"
              onClick={() => {
                setShowGuide(false);
                setInspect(false);
              }}
            >
              <XIcon size={22} />
            </button>
            <div className="eyebrow muted">
              {inspect ? "NOTHING UP OUR SLEEVE" : "THE SHORT VERSION"}
            </div>
            <h2 id="room-dialog-title">
              {inspect ? "Inspect the secret." : "A game of deduction."}
            </h2>
            {inspect ? (
              <>
                <p>
                  {practice
                    ? "This is a local practice round. Its secret is stored in your browser so you can learn without waiting for the network. It is not cryptographically hidden."
                    : "The code is generated inside Arcium MPC. Your room stores ciphertext, not the readable code. Guess feedback is verified by the Solana program."}
                </p>
                <dl className="inspection-list">
                  <dt>Execution</dt>
                  <dd>
                    {practice
                      ? "Local browser"
                      : `Arcium MPC on Solana ${room.network ?? "devnet"}`}
                  </dd>
                  {room.address && (
                    <>
                      <dt>Room account</dt>
                      <dd>
                        {room.network === "localnet" ? (
                          <code>{room.address}</code>
                        ) : (
                          <a
                            href={`https://explorer.solana.com/address/${room.address}?cluster=devnet`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {room.address.slice(0, 12)}… ↗
                          </a>
                        )}
                      </dd>
                    </>
                  )}
                  {room.program && (
                    <>
                      <dt>Game program</dt>
                      <dd>
                        {room.network === "localnet" ? (
                          <code>{room.program}</code>
                        ) : (
                          <a
                            href={`https://explorer.solana.com/address/${room.program}?cluster=devnet`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Inspect program & upgrade authority ↗
                          </a>
                        )}
                      </dd>
                    </>
                  )}
                  {room.ciphertext && (
                    <>
                      <dt>Encrypted code</dt>
                      <dd className="ciphertext">
                        {room.ciphertext.map((c, i) => (
                          <span key={i}>{c}</span>
                        ))}
                      </dd>
                    </>
                  )}
                  {room.signature && (
                    <>
                      <dt>Creation transaction</dt>
                      <dd>
                        <a
                          href={`https://explorer.solana.com/tx/${room.signature}?cluster=devnet`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View on Solana Explorer ↗
                        </a>
                      </dd>
                    </>
                  )}
                </dl>
                <Link
                  href="/how-it-works#under-the-hood"
                  className="inline-link"
                >
                  Read the architecture & trust assumptions ↗
                </Link>
              </>
            ) : (
              <>
                <p>
                  Crack the five-symbol code before your rivals. You have ten
                  attempts. Symbols can repeat.
                </p>
                <div className="guide-feedback">
                  <span className="feedback-peg exact" />
                  <p>Filled dot: right symbol, right place.</p>
                  <span className="feedback-peg misplaced" />
                  <p>Hollow dot: right symbol, wrong place.</p>
                </div>
                <p>
                  The dots are counts. They don’t tell you which position was
                  correct.
                </p>
                <p>
                  Choose a slot, then a symbol. On desktop, keys 1–6 choose
                  symbols and Enter submits.
                </p>
                <button
                  className="button primary full"
                  onClick={() => setShowGuide(false)}
                >
                  Got it. Let me in. <ArrowRightIcon size={18} />
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
