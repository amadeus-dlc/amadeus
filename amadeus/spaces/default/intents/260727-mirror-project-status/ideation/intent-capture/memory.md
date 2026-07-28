<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-27T03:54:50Z — Issue #1560 が状態マッピング・失敗セマンティクス・受入条件15項目・非対象を規定済みのため、質問を未決の判断4問(顧客/成功指標/スコープ境界/トリガー)に絞った; cid:intent-capture:c1 の適用
- 2026-07-27T03:54:50Z — 成功指標の主軸を「収束性(手動編集ゼロで drift 0)」とし、安全性(close 阻止)と診断可能性(repair status)を支持条件として従属させる構造で intent-statement に固定した; Q2 裁定

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-27T03:54:50Z — Project 別 Status 名上書き・parked 明示マッピングの設定置き場所(auto-mirror と同じ3層 git 共有 config か、別ファイルか)は ideation では実装詳細のため未決のまま。requirements/design で既存 amadeus-mirror-config.ts の流儀を実測して固定する(cid:requirements-analysis:c5 — 既存の流儀に合わせ、真に新規の判断のみ質問)
- 2026-07-27T03:54:50Z — GitHub token の `project` scope 実測(現行 gh auth の scope に project が含まれるか)は feasibility 段で確認する
