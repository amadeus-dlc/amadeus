# nfr-design memory — u5-ci-all-models-measure

## Interpretations

- 2026-08-01T21:55:00Z — scalability-design.md / logical-components.md は kind ゲート([service] / [service,ui,library])と比例原則により独立生成せず、SC-1/SC-2 の写像を performance-design.md §PD-4 へ、logical-components 非生成の根拠を reliability-design.md 末尾へ記載した;reliability-design.md は RR-1〜RR-5 が実質的な適用要件を持つため [service] ゲートに関わらず比例生成した
- 2026-08-01T21:55:00Z — QUESTION-ONLY/ARTIFACT-ONLY の分回しではなく Full mode で一括実施(per-unit iteration の委譲指示に基づく)

## Deviations

- 2026-08-01T21:55:00Z — Step 3-4 の questions ファイル(nfr-design-questions.md)は生成せず。nfr-requirements 5 artifact と functional-design が全ての裁定(D-U5-1〜6、BR 群)を確定済みで、設計上の未決事項が残っていないため。設計は全て上流機構の写像であり新規機構の発明なし

## Tradeoffs

- 2026-08-01T21:55:00Z — 5 produces 全生成 vs 3生成: scalability/logical-components は内容が performance の O(N) 記述と不変面の列挙に完全に吸収されるため、空に近い artifact を量産するより畳み込み + 非生成根拠の明示を選んだ(AGENTS.md Simplicity First)

## Open questions

- 2026-08-01T21:55:00Z — なし(code-generation への引き渡し禁止事項は reliability-design RD-4 と security-design SD-1 に固定済み)
