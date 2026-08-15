# Risk & Sequencing Rationale — 260814-open-bug-batch-6

## 適用ヒューリスティック

**value-first(WSJF 簡易)+ トポロジー制約**。walking-skeleton-first は非適用(self-fix スコープ、org.md)。2.7 のトポロジカル順序からの逸脱はない(唯一の依存 U-2→U-3 をそのまま順序制約として尊重)。

## スコアリング(CD3 簡易: 遅延コスト ÷ 期間)

| Bolt | 遅延コスト(運用影響) | 期間(相対) | 優先 |
| --- | --- | --- | --- |
| B1 landed-finalization | 高 — 全 intent の pr-convergence 完了が merge queue 運用でデッドエンド化(現に手動逃がしが常態化するリスク) | M | 最上位 |
| B2 sensor-declaration | 中 — センサー不発火の継続と drift 検査の欠如 | S | 高 |
| B4 worktree-gc-determinism | 低 — transient の再実行コスト(P3/S4) | S | 中 |
| B5 audit-sink-investigation | 低 — 過去汚染2行の機序確定(新規汚染の観測なし) | M(調査) | 中 |
| B3 docs-sensors-sync | 中 — docs 信頼性(ただし B2 の裁定に従属) | S | B2 の後 |

## リスク論点

- B1 は blocking センサーと承認ゲートに触れる最大リスクの Bolt — 選挙裁定 A の留保(checkRollupState 非必須・converged 意味論維持・置換で二重経路なし)を DoD に織り込み済み。誤実装は他 intent の収束フローを壊しうるため、落ちる実証を最優先の検証に置く
- B5 は core(emit 経路)への条件付き変更 — bt-ledger-resync の台帳同期を DoD に含め、非再現時はコード変更 0 で閉じる(リスク自然消滅)
- 並行実装時の共有台帳(coverage-registry / model-map)は conductor 統合断面で直列化(unit-of-work-dependency.md)
- 並行 intent 260814-priority-bug-batch とのファイル交差は着手時に実測(requirements 制約)— 対象5ファイル面は現時点の Issue 記述上交差しない見込み(実測で確定)
