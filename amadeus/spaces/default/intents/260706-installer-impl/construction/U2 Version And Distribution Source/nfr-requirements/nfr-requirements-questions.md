# NFR Requirements Questions — U2 Version And Distribution Source

> Stage: construction / nfr-requirements  
> Unit: U2 Version And Distribution Source  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Decision

追加の人間質問は実施しない。U2 の NFR は `requirements.md` の FR-007 / FR-012 / FR-013 / NFR-001 / NFR-004 / NFR-005、U2 functional design の `business-logic-model.md` / `business-rules.md`、reverse engineering の `technology-stack.md` で固定済みである。

## Fixed Answers

### Q1: GitHub access reliability

- [Answer]: A
- A. Archive fetch は `ArchiveSourcePort` / `GitHubArchiveAdapter` が exactly one retry を所有し、`loadDistribution` は二重 retry しない。

### Q2: Metadata integrity

- [Answer]: A
- A. Metadata が存在して有効なら採用、存在して無効なら hard error、存在しない first release のみ path policy fallback とする。

### Q3: Target safety

- [Answer]: A
- A. U2 は target project を読まない・書かない。source archive temp area と extracted distribution だけを扱う。

## Ambiguity Analysis

曖昧さは残っていない。`business-logic-model.md` は U2 が tag resolution、archive fetch/extract、source metadata reading に限定されることを定義している。`business-rules.md` は stable SemVer ordering、explicit prerelease、exactly one retry、metadata invalid hard error、no target writes を固定している。`requirements.md` は default latest stable tag、network retry、metadata fields、portability、dependency discipline を定義している。`technology-stack.md` は Bun/TypeScript と current CI baseline を示している。

## Upstream Coverage

- `business-logic-model.md`: Default Version Resolution、Explicit Version Resolution、Archive Loading、Source Metadata Reading を NFR 対象にする。
- `business-rules.md`: BR-U2-001..022 と Testable Invariants を pass/fail 条件へ展開する。
- `requirements.md`: FR-007 / FR-012 / FR-013 / NFR-001 / NFR-004 / NFR-005 を U2 の品質属性へ割り当てる。
- `technology-stack.md`: TypeScript/ESM、Bun 1.3.13、runtime dependency discipline、CI command を tech-stack decision に反映する。
