# BuidlGuidl CTF — Solutions

Solutions for the [BuidlGuidl Capture The Flag](https://ctf.buidlguidl.com) — a set of
Smart Contract security challenges across two seasons.

**Result: 23/23 flags minted locally** (Season 1 and Season 2).

Built on the [SpeedRun Ethereum](https://speedrunethereum.com) / Scaffold-ETH 2 stack
(Hardhat + Next.js).

## What's in this repo

| Path | Description |
|------|-------------|
| `packages/hardhat/contracts/ctf/Solvers.sol` | Attacker/solver contracts for each challenge |
| `packages/hardhat/scripts/ctf-solve.ts` | Automation script that solves every challenge in one run |
| `packages/hardhat/scripts/flags.ts` | Prints which flags the player wallet currently holds |

## Run it locally

```bash
# 1. start a local chain (separate terminal)
yarn chain

# 2. deploy the challenge contracts
yarn deploy

# 3. solve every challenge and mint all flags
cd packages/hardhat
yarn hardhat run scripts/ctf-solve.ts --network localhost

# 4. (optional) verify
yarn hardhat run scripts/flags.ts --network localhost
```

Expected output:

```
23/23 solved
```

## How the challenges are solved

Each challenge maps to a dedicated solver contract (or an exploit sequence) in
`Solvers.sol`, driven by `ctf-solve.ts`. The solve script deploys a fresh solver
per challenge, triggers the exploit, and mints the flag from the challenge's
`mintFlag()` entry point.

Techniques exercised include:

- Reentrancy and reentrancy-adjacent accounting bugs
- `tx.origin` vs `msg.sender` authentication flaws
- Delegatecall storage collisions / proxy takeover
- Weak onchain randomness (`blockhash`, predictable nonces)
- `selfdestruct` / forced ETH transfers
- Gas-griefing and gas-window brute forcing
- `CREATE2` address prediction
- Signature / replay issues
- ERC-721 `safeTransferFrom` receiver-callback exploitation
- Multi-step state-machine games (inventory / quest / dungeon / victory)

## Credits

Challenge contracts: [buidlguidl/ctf.buidlguidl.com](https://github.com/buidlguidl/ctf.buidlguidl.com)
("extension" branch). This repository only contains solutions.
