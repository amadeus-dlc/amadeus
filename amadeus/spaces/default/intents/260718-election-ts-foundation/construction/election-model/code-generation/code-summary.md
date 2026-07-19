# Code Summary — election-model(Bolt 1 walking-skeleton)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、logical-components.md、unit-of-work.md、requirements.md、bolt-plan.md

## 生成物(PR #1227、ブランチ bolt/walking-skeleton)

| ファイル | 内容 | 検証 |
|---|---|---|
| `scripts/amadeus-election-model.ts` | U1 核: branded Goa+Election.parse/Ballot.parse(fail-closed Result)+先勝ち tally 決定表(block→discussion-needed→quorum-short→多数決/tie — business-logic-model.md と 1:1) | t234 unit(7テスト: parse 型エラー・Goa 境界 0/9/"five"/2.5・tally 3分岐・決定性 deep-equal) |

## Bolt 1 完了状態と残余

- 完了: 型一式+parse+tally(zero-confirm 完走に足る核 — bolt-plan.md Bolt 1 宣言どおり。requirements.md FR-4a の GoA 側割当と FR-0 指令ループの U1 面を充足、配置は unit-of-work.md U1 行の scripts/amadeus-election-model.ts)
- Bolt 2 へ残余: 5クラス fail-closed 完全化(unknown-voter/reservation-missing)、shuffleView(fnv1a+mulberry32)、canEarlyTally、classifyLate、AmendBallot 受理ロジック(型は宣言済み)
- 検証実測: typecheck/lint/--ci(coverage)/patch gate 387/387 / complexity gate 新規違反 0(全 exit code 個別捕捉 — PR #1227 本文に記録)
