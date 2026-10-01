export const CODE_LENGTH = 5;
export const SYMBOL_COUNT = 6;
export const MAX_ATTEMPTS = 10;
export const SYMBOL_NAMES = [
  "Circle",
  "Diamond",
  "Triangle",
  "Square",
  "Star",
  "Cross",
];
export type Feedback = { exact: number; misplaced: number };
export type Guess = {
  symbols: number[];
  exact: number;
  misplaced: number;
  signature?: string;
  pending?: boolean;
  failed?: boolean;
  queuedAt?: number;
};
export type Player = {
  publicKey: string;
  name: string;
  guesses: Guess[];
  joinedAt: number;
};
export type Room = {
  id: string;
  title: string;
  host: string;
  status: "sealing" | "waiting" | "playing" | "won" | "expired";
  players: Player[];
  createdAt: number;
  startedAt?: number;
  expiresAt: number;
  winner?: string;
  mode: "practice" | "arcium";
  network?: "devnet" | "localnet";
  program?: string;
  address?: string;
  signature?: string;
  ciphertext?: string[];
  solution?: number[];
  error?: string;
};
export function isValidCode(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === CODE_LENGTH &&
    value.every((s) => Number.isInteger(s) && s >= 0 && s < SYMBOL_COUNT)
  );
}
export function scoreGuess(secret: number[], guess: number[]): Feedback {
  if (!isValidCode(secret) || !isValidCode(guess))
    throw new Error("A code needs five symbols from 0 to 5.");
  let exact = 0;
  const remainingSecret = Array(SYMBOL_COUNT).fill(0) as number[];
  const remainingGuess = Array(SYMBOL_COUNT).fill(0) as number[];
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (secret[i] === guess[i]) exact++;
    else {
      remainingSecret[secret[i]]++;
      remainingGuess[guess[i]]++;
    }
  }
  let misplaced = 0;
  for (let i = 0; i < SYMBOL_COUNT; i++)
    misplaced += Math.min(remainingSecret[i], remainingGuess[i]);
  return { exact, misplaced };
}
export function secureCode(): number[] {
  // Local practice uses exact rejection sampling. The MPC uses 64-bit reduction.
  const symbols: number[] = [];
  while (symbols.length < CODE_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    for (const b of bytes)
      if (b < 252 && symbols.length < CODE_LENGTH)
        symbols.push(b % SYMBOL_COUNT);
  }
  return symbols;
}
export function formatClock(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
