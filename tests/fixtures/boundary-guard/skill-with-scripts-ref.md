---
name: amadeus-election
compatibility: Requires bun and this repository checkout (scripts/amadeus-election.ts).
---

# amadeus-election (fixture fragment)

This fixture reproduces the SKILL-fragment shape that carries a repo-local
`scripts/` reference — the exact class of distribution-boundary violation the
guard's predicate 1 must flag. Predicate 1 over this fixture (empty allowlist)
MUST return findings; that is the guard's falling-proof (BR-4).

```
bun scripts/amadeus-election.ts open --file <definition.json>
```
