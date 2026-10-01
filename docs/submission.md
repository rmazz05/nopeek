# NOPEEK — submission pack

Demo: https://nopeek-whu.vercel.app

Pitch: https://nopeek-whu.vercel.app/pitch

Deck PDF: https://nopeek-whu.vercel.app/nopeek-pitch.pdf

Source: https://github.com/rmazz05/nopeek

## Listing

https://superteam.fun/earn/listing/build-at-whu/

Checked on 1 October 2026: a working prototype with at least one Solana feature, a public GitHub repository, a pitch deck explaining the problem, solution, intended users and growth. Identity/privacy is an eligible direction and AI-assisted implementation is allowed by the description. The listing is limited to WHU 2026 participants. The deadline displayed is 4 October 2026, 23:59. Confirm the listing's timezone in your account before submitting.

## Submission description

**NOPEEK — a secret even the host cannot read**

NOPEEK is a multiplayer browser codebreaking game. Up to four friends race to solve a five-symbol code, with ten attempts each. Its first users are WHU participants and student groups who enjoy quick browser games. Hosts invite rivals with a link; players need no wallet extension, token purchase or crypto knowledge.

The core Solana feature is a public game referee with confidential state. Arcium generates the secret inside MPC and stores it as MXE-owned ciphertext. Each guess is evaluated without giving our server the readable code. The Solana program locks the roster, enforces attempt limits, verifies MPC callbacks and records the winner. The host gets the same clues as everyone else.

The prototype includes invitations, a race timer, duplicate-safe scoring, sponsored fees, browser player signatures, ciphertext inspection, mobile and keyboard support, stalled-attempt recovery, and a clearly labeled local practice mode. Growth starts with the room invitation: one host can bring three friends. We will validate completed rounds and repeat play before claiming traction. Themed room packs and event hosting are possible business models after measuring compute latency and cost.

The public source and pitch explain the security assumptions: Arcium cluster confidentiality, a retained prototype upgrade authority where present, public guesses/clues, browser identities and test-network execution.

## 90-second presenter script

“In an ordinary online puzzle, the server knows the answer. You trust the operator to hide it and apply the rules fairly.

NOPEEK is a game where the host has to solve the secret too. Four friends race to crack five symbols. Every attempt tells you how many symbols are in the right position and how many belong elsewhere.

Watch what happens when I create a room. Arcium generates the code inside encrypted computation. Solana stores ciphertext, not a readable answer. My browser and our web server never receive the decryption key.

I share the link and another player joins. When I start, Solana locks the roster. Each player gets ten attempts. I submit a guess; Arcium returns only the two feedback counts. The program verifies that result and updates the game. The first correct verified result wins.

This is why the blockchain is part of the game: it enforces the referee while the referee works on a secret our application cannot read under the published implementation.

There is no wallet extension or crypto to buy. The app sponsors devnet transactions. Our first users are student groups and browser-game players, and every room gives them a reason to invite friends.

The prototype is playable, its source is public, and its trust assumptions are documented. Open the account, inspect the ciphertext, and try to beat the host.”

## Demo sequence

1. Check `/api/health`: encrypted rooms must say `ready`. Verify whether evidence and demo are on localnet or public devnet.
2. Open the demo in two different browser profiles or one normal and one private window. Two tabs in the same profile share a player identity.
3. Create “WHU suspects”, copy the invitation and join as “The usual suspect”.
4. Start the round. Show that the second player cannot start it and that a newcomer cannot join after start if asked.
5. Open “Inspect the sealed secret”. Show the five ciphertext blocks and, on devnet, the Explorer link.
6. Submit a repeated-symbol guess such as circle, circle, diamond, diamond, triangle. Explain that feedback gives counts, not positions.
7. Continue solving or use the verified integration recording. Do not claim a locally generated practice win is an encrypted-room win.
8. Open the public repository and pitch. Mention retained upgrade authority if asked about immutable rules.

## Participant actions before submission

- Supply your participant identity/social profile in Superteam Earn.
- Follow `@SuperteamDE` on X if required by the listing.
- Review the demo and deck and verify the live encrypted-room flow.
- Use the **pitch deck link** as the primary submission link; include repository and demo where the form allows.
- Submit from your own participant account before the confirmed deadline. This pack has not submitted the contest entry or posted to social media.

## Deployment status

Local Solana + two-node Arcium integration and real two-player browser flow have passed. Public devnet deployment requires free test SOL; update this paragraph and the verification evidence after that deployment. The hosted web demo can expose practice while this external dependency is pending. Do not describe that state as a fully live encrypted multiplayer deployment.
