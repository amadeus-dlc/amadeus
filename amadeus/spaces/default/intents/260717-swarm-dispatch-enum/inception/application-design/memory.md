<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-18T00:08:30Z — 真の未決は Q1(C-16 実現形)のみと判定し E-SDE-AD へ(E-OC1 承認 00:04:32Z)。裁定依存欄は ruling-dependent-placeholder で【裁定待ち】運用し、裁定 A(00:05:37Z)後に一括反映
- 2026-07-18T00:08:30Z — reuse inventory は E-SMF-AD13 追補(対称 grep)を適用: 既存 resolver 0件・KNOWN_HARNESS_DIRS は意味論不一致(install dirs ≠ dispatch consumers)を実測し ADR-5 に記録
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-18T00:16:09Z — reviewer REVISE(Major 3/Minor 2)→ 全件是正: 【裁定待ち】見出し残存1(横断 grep 0 確認)/ ADR-3・ADR-5 へ第2代替案追記 / :293→:291 訂正(reviewer 指摘を自分の grep で再実測してから反映 — 承認済み requirements.md の同引用も事実訂正し本 diary へ記録。誤記の源は RE re-scan record で、そちらは着地済みのため次回 RE 差分で是正)/ Mermaid テキスト代替を図と一致化
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-18T00:08:30Z — components は新規サービスでなく「既存資産への変更セット」8件(C1〜C8)として定義 — brownfield の加算変更に新コンポーネント表現を持ち込むより変更影響面が読める。ADR 5件+規模数値表(inception.md 規模の正当化に準拠)
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-18T00:08:30Z — codex exec 撤去に伴う t-exec-codex-journey 系テストの扱い(置換 or 退役)は FD/units-generation で棚卸し(ADR-4 に明記)
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
