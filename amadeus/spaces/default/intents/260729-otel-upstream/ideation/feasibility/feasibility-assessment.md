# Feasibility Assessment — OTel Upstream 統合

上流入力（consumes 全数）: `intent-statement.md`（参照済み）、`competitive-analysis.md`（market-research SKIP のため不存在）、`market-trends.md`（同）、`build-vs-buy.md`（同）

## 技術的実現性

`intent-statement.md` の成功指標（因果の正確性・基盤単一化・耐性維持）に対し、実現可能性上の不確実性は4点に絞られる。いずれも Phase 1（#1678 walking skeleton）で実測検証する方針が確定しており、本評価時点で実現不能と判断する根拠はない。

| 不確実性 | 前提（仮説ラベル付き） | 検証方法 | 不成立時の影響 |
|---|---|---|---|
| OTel Logs API の安定性 | **仮説**: Development 相当の API でも、独自 Provider が依存するのは API 形状のみなので採用可能。採否は未決 | Phase 1 で `@opentelemetry/api-logs` 利用案と最小 EventRecord 独自 Interface 案を実測比較し ADR で確定 | 中。独自 Interface への切替で吸収可能 |
| Bun での Context 維持 | **仮説**: `@opentelemetry/context-async-hooks`（AsyncLocalStorage ベース）が Bun で動作する | Phase 1 の最初の検証項目（await、Promise.all、timer、callback、例外境界） | 大。自前 Amadeus Adapter 実装が必要（工数増） |
| 配布制約との整合 | bun build の単一 bundle へ依存を取り込むため、利用者側の Bun-only 前提は変わらない。追加理由は ADR に文書化（project.md Forbidden の要件を満たす） | Phase 1 で単一 bundle 成立と API singleton を検証 | 中。vendoring への切替が必要になりうる |
| 同期 I/O 性能 | 現行 `appendAuditEntry` と同等（lock＋sync append）のため回帰なしとみなせる | Phase 1 で cold/warm 実測し予算を数値化 | 小〜中。予算超過ならバッチ戦略の見直し |

## リスク分析

最大の実現性リスクは Bun Context Manager の未検証性であり、これは #1678 が hard gate として最初に潰す設計になっている。次点は Logs API の stability で、独自 Interface への退路があるため致命的ではない。約1600 call site の移行は規模のリスクだが、reader-first・mixed schema merge・削除ゲートの移行設計（#1672）で制御可能と判断する。

## 結論

**実現可能（条件付き）** — 条件は Phase 1 walking skeleton の合格。不合格なら #1678 の hard gate どおり撤回し #1628 方式へ戻す。feasibility 上の新たな阻止要因は検出されなかった。
