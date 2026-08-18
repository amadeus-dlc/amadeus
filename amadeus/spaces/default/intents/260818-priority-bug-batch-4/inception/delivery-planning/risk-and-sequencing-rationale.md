# Risk and Sequencing Rationale

Intent: 260818-priority-bug-batch-4

上流: `bolt-plan.md`、`../units-generation/unit-of-work-dependency.md`(トポロジ)、`../requirements-analysis/requirements.md`(優先度)。

## 採用 heuristic: priority-queue(優先度キュー順)

- 依存 DAG は空(依存 0 本)のため、トポロジはどの順序も許す — 順序決定は純粋に経済判断
- team.md § Issue 運用「着手順は優先度をキュー順」を適用: **Bolt 1 = #2837(P2/S3) → Bolt 2 = #3106(P3/S3)**。優先度差(P2 > P3)が一意に順序を定めるため、WSJF スコアリングは不要(2 項目・単一軸で決定可能な局面にスコアモデルを持ち込まない)
- トポロジ順からの逸脱: なし(トポロジが順序を制約しないため逸脱概念が空)

## 直列実行の根拠(並行の棄却)

- 両 unit が `packages/framework/core/tools/amadeus-orchestrate.ts` を変更する(関数単位では非交差だが同一ファイル)。並行 worktree 実装は後着側の rebase + 台帳 3 面(model-map / allowlist / registry)の再 resync + intents.json 再構成を**確実に**発生させる
- 2 unit 規模(各 ~1 Bolt 日未満)では並行化の wall-clock 利得が直列化の統合コストを下回る。record 同梱 PR の直列着地は並行実装でも必須(既存ノルム)であり、並行の利得はさらに縮む
- リスク面: settle 台帳(U2)と emit 境界(U1)は同一関数を触らないため、直列なら Bolt 2 の rebase は機械的(競合予想: なし〜軽微)

## 最先着手すべきリスク項目

1. **U1 の pool identity 設計**(ADR-1 契約2〜3): prepare 受理形と join 全数整合が最大の設計リスク — Bolt 1 の Red 先行(failed-terminal 再提示回帰)で最初に潰す
2. **U2 の failed arm 到達可能性**(ADR-2 契約5): 到達不能なら arm を実装しない分岐が設計済み — Bolt 2 冒頭の Red 実証で確定
3. **配送リスク**(両 Bolt): CI の Review Thread Gate stale fail・coverage 母集団膨張などの既知クラスは norms に回復手順あり — 新規リスクとしては扱わない
