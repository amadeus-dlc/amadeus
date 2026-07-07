# NFR Requirements Questions — U3 Target State And Manifest

> Stage: construction / nfr-requirements  
> Unit: U3 Target State And Manifest  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Decision

追加の人間質問は実施しない。U3 の NFR は `requirements.md` の FR-006 / FR-011 / FR-013 / NFR-002 / NFR-003 / NFR-004、U3 functional design の `business-logic-model.md` / `business-rules.md`、reverse engineering の `technology-stack.md` で固定済みである。

## Fixed Answers

### Q1: Target access boundary

- [Answer]: A
- A. U3 は target を read/snapshot してよいが、write、backup、apply、manifest write sequencing は行わない。

### Q2: Invalid manifest behavior

- [Answer]: A
- A. `readManifest(): InstallerManifest | null` contract に従い、invalid/unreadable manifest は `manifest-installed` ではなく sentinel fallback へ流す。

### Q3: Ambiguous `kiro` / `kiro-ide`

- [Answer]: A
- A. Prompt が許可されている場合のみ `detectTarget` 内で解決し、非対話では `ambiguous-harness` no-write とする。

## Ambiguity Analysis

曖昧さは残っていない。`business-logic-model.md` は manifest-first detection、sentinel fallback、snapshot、manifest write ownership を分離している。`business-rules.md` は manifest schema、sentinels、classification、snapshot unknown md5、manifest write ownership を固定している。`requirements.md` は target state table、manifest minimum fields、non-interactive no-write、portability、安全性、traceability を定義している。`technology-stack.md` は Bun/TypeScript と CI baseline を示している。

## Upstream Coverage

- `business-logic-model.md`: Manifest-First Detection、Sentinel Fallback、Target State Classification、Snapshot Workflow、Manifest Write Contract を NFR 対象にする。
- `business-rules.md`: BR-U3-001..022 と Testable Invariants を pass/fail 条件へ展開する。
- `requirements.md`: FR-006 / FR-011 / FR-013 / NFR-002 / NFR-003 / NFR-004 を U3 の品質属性へ割り当てる。
- `technology-stack.md`: TypeScript/ESM、Bun 1.3.13、CI command を tech-stack decision に反映する。
