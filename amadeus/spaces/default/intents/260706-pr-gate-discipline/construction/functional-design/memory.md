<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T01:43:00Z — units-generation SKIP（refactor scope）のため unit 名は Intent slug と同じ `pr-gate-discipline` とした（前例: 260706-docs-lang-guide の `docs-lang-guide`）。aidlc-state.md の Per unit: [TBD] は record 整合として後続で手動更新する（project.md Corrections の前例 e10f8294）。
- 2026-07-06T01:43:00Z — 設計細部 4 問（ファイル名、stage-protocol 挿入位置、construction.md 追記形式、ポインタ検証方法 = requirements.md の未解決事項 3 件に対応）は team.md 質問プロトコルの「小さな構造判断」に該当と解釈し、ピア協議にかけず自己判断（理由付き）で回答した。gate の人間承認で確定する。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T01:58:00Z — requirements.md FR-5.1 / FR-5.2 の記載を設計段階で精密化した（reviewer iteration 1 の指摘 + parity-map.json 実測）。①reason 統合先は engineFileExceptions（path 文字列配列）ではなく exceptions[]（{target, reason} 型）の #531 エントリ。②skills/ 側正準ソースへの同一反映は不適用（amadeus-common / knowledge に skills/ 対応ファイルは存在せず、references/aidlc-v2/ は上流スナップショット）。承認済み requirements.md 本文は書き換えず、設計側で補正して gate 承認で確定する。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-06T01:43:00Z — 知識文書は gate 文言・エラーメッセージを含めない設計にし、NFR-1 のカーブアウト発動を避けた（全文英語で完結。混在は将来の対訳・同期コストになるため）。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-06T01:43:00Z — leader の一時停止指示（01:41:42Z 受信）: main の parity-baseline / parity-map / runner-gen 依存の編集（stage-protocol.md 追記、parity 宣言）は engineer1 の followup PR merge 後に着手する。code-generation 着手時に merge 状況を確認する。→ 解除済み（01:49:20Z、followup PR #542 merge。現 origin/main の実形 = 108 mappings、engineFileExceptions 33 件を基準にする。code-generation 前に origin/main へ再追従する）。
- 2026-07-06T01:43:00Z — skills/ 正準ソース側の知識文書の実配置（skills/amadeus/knowledge/... か否か）は、followup merge 後の parity-map mapping 実形で確定する（engineer1 申し送り 01:40:53Z）。
