# Release verification — 1 October 2026

Public demo: https://nopeek-whu.vercel.app

Public source: https://github.com/rmazz05/nopeek

| Check                           | Result     | Scope                                                                                      |
| ------------------------------- | ---------- | ------------------------------------------------------------------------------------------ |
| Clean `npm ci`                  | Passed     | Reproducible dependency installation                                                       |
| TypeScript and production build | Passed     | Web application and API compilation                                                        |
| TypeScript unit tests           | 15 passed  | Scoring, validation, clock, generated codes and transaction signatures                     |
| Rust tests                      | 4 passed   | Program ID and three state-machine cases                                                   |
| Actual Arcium integration       | Passed     | Local Solana + two Arcium nodes, encrypted generation through verified winner              |
| Actual multiplayer browser flow | Passed     | Two independent browser identities; both submit guesses and receive consistent feedback    |
| Public desktop/mobile suite     | 12 passed  | Hosted practice, win/replay, disclosure, invitations, responsive layout and keyboard focus |
| Dependency audit                | 0 findings | `npm audit --omit=dev`                                                                     |
| Pitch                           | 8 slides   | Validated editable PPTX and matching PDF; all slides visually inspected                    |
| Public endpoints                | HTTP 200   | Home, health, pitch, deck and real MPC recording                                           |

The local deployed binary was dumped and compared with the compiled program. Both SHA-256 hashes were:

```text
50b76620e7ff9ae3241c9ea0cf705e1e1358e27da8c9250cb62581a167310cef
```

Devnet cluster offset 456 was fetched and decoded through the matching Arcium SDK. Public devnet deployment remains pending free test SOL. `/api/health` truthfully reports `pending-deployment`; the public application currently offers practice and the actual local MPC recording. This is the remaining dependency before claiming fully live encrypted multiplayer on devnet.

GitHub authentication does not currently grant workflow publishing permission. The optional workflow is retained as `docs/github-actions.example.yml`; checks were executed directly. The repository is linked to Vercel for deployments.
