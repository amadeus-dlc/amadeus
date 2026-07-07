# NFR Requirements Questions — U1 Setup Package Shell

> Stage: construction / nfr-requirements  
> Unit: U1 Setup Package Shell  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Decision

追加の人間質問は実施しない。U1 の NFR は `requirements.md` の FR-001 / FR-002 / FR-003 / FR-004 / FR-011 / NFR-005、functional design の `business-logic-model.md` / `business-rules.md`、reverse engineering の `technology-stack.md` で十分に固定済みである。

## Fixed Answers

### Q1: Runtime target

- [Answer]: A
- A. Bun-first。Node-only 互換性は約束せず、`npx` は Bun が見つかる場合だけ best-effort delegation とする。

### Q2: U1 の性能対象

- [Answer]: A
- A. `--help`、invalid command、parser validation、Node/npm wrapper failure の起動時間と target no-touch を対象にする。

### Q3: U1 の security 対象

- [Answer]: A
- A. argv/env/process boundary、package contents allowlist、classified stderr、target filesystem no-access を対象にする。

## Ambiguity Analysis

曖昧さは残っていない。`business-logic-model.md` は U1 が version resolution、archive fetch、target detection、planning、apply を持たないと定義している。`business-rules.md` は command rejection、Bun requirement、no-write guarantee、package metadata を明示している。`requirements.md` は CLI contract と NFR-005 dependency discipline を定義し、`technology-stack.md` は TypeScript/ESM/Bun と root package の dev-only 境界を示している。

## Upstream Coverage

- `business-logic-model.md`: Startup Workflow、Command Parsing Workflow、Help Workflow、Delegation Workflow を NFR 対象にする。
- `business-rules.md`: BR-U1-001..020 と Testable Invariants を pass/fail 条件へ展開する。
- `requirements.md`: FR-001 / FR-002 / FR-003 / FR-004 / FR-011 / NFR-005 を U1 の品質属性へ割り当てる。
- `technology-stack.md`: TypeScript/ESM、Bun 1.3.13、root dev-only package、current CI command を tech-stack decision に反映する。
