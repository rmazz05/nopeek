import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scoreGuess,
  isValidCode,
  formatClock,
  secureCode,
} from "../src/lib/game";
test("a solved code gives five exact matches", () =>
  assert.deepEqual(scoreGuess([0, 1, 2, 3, 4], [0, 1, 2, 3, 4]), {
    exact: 5,
    misplaced: 0,
  }));
test("a permutation gives only misplaced matches", () =>
  assert.deepEqual(scoreGuess([0, 1, 2, 3, 4], [1, 2, 3, 4, 0]), {
    exact: 0,
    misplaced: 5,
  }));
test("repeated guesses cannot invent occurrences", () =>
  assert.deepEqual(scoreGuess([0, 1, 2, 3, 4], [0, 0, 0, 0, 0]), {
    exact: 1,
    misplaced: 0,
  }));
test("exact matches are removed before counting elsewhere", () =>
  assert.deepEqual(scoreGuess([0, 0, 1, 1, 2], [0, 1, 0, 2, 1]), {
    exact: 1,
    misplaced: 4,
  }));
test("a partially matching repeated code", () =>
  assert.deepEqual(scoreGuess([0, 0, 0, 1, 2], [1, 1, 1, 0, 0]), {
    exact: 0,
    misplaced: 3,
  }));
test("disjoint codes give no feedback", () =>
  assert.deepEqual(scoreGuess([0, 0, 0, 0, 0], [5, 5, 5, 5, 5]), {
    exact: 0,
    misplaced: 0,
  }));
test("code validation rejects missing, fractional and out-of-range symbols", () => {
  for (const code of [
    null,
    [],
    [0, 1, 2, 3],
    [0, 1, 2, 3, 4, 5],
    [0, 1, 2, 3, 6],
    [0, 1, 2, 3, -1],
    [0, 1, 2, 3, 4.5],
    [0, 1, 2, 3, "4"],
  ])
    assert.equal(isValidCode(code), false);
  assert.throws(() => scoreGuess([0, 1, 2, 3, 4], [0, 1, 2, 3, 6]));
});
test("scoring obeys invariants for all 7,776 possible secret codes", () => {
  const guesses = [
    [0, 0, 0, 0, 0],
    [0, 1, 2, 3, 4],
    [0, 0, 1, 1, 5],
    [5, 4, 3, 2, 1],
  ];
  for (let n = 0; n < 6 ** 5; n++) {
    let value = n;
    const secret = Array.from({ length: 5 }, () => {
      const s = value % 6;
      value = Math.floor(value / 6);
      return s;
    });
    for (const guess of guesses) {
      const score = scoreGuess(secret, guess);
      const reversed = scoreGuess(guess, secret);
      assert.deepEqual(score, reversed);
      assert.equal(score.exact, secret.filter((s, i) => s === guess[i]).length);
      assert.ok(score.exact + score.misplaced <= 5);
      const overlap = Array.from({ length: 6 }, (_, s) =>
        Math.min(
          secret.filter((v) => v === s).length,
          guess.filter((v) => v === s).length,
        ),
      ).reduce((a, b) => a + b, 0);
      assert.equal(score.exact + score.misplaced, overlap);
    }
  }
});
test("clock never displays negative remaining time", () => {
  assert.equal(formatClock(-1), "00:00");
  assert.equal(formatClock(1200), "20:00");
  assert.equal(formatClock(65.8), "01:05");
});
test("generated practice secrets always obey the rules", () => {
  for (let i = 0; i < 500; i++) assert.ok(isValidCode(secureCode()));
});
