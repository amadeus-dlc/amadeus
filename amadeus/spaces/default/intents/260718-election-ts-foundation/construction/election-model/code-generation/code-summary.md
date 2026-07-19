# Code Summary — election-model(Bolt 1 walking-skeleton)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、logical-components.md、unit-of-work.md、requirements.md、bolt-plan.md

## 生成物(PR #1227、ブランチ bolt/walking-skeleton)

| ファイル | 内容 | 検証 |
|---|---|---|
| `scripts/amadeus-election-model.ts` | U1 核: branded Goa+Election.parse/Ballot.parse(fail-closed Result — security-design.md の parse 境界設計どおり)+先勝ち tally 決定表(block→discussion-needed→quorum-short→多数決/tie — business-logic-model.md と 1:1、単一走査 O(n) — performance-design.md の中間コレクション非生成) | t234 unit(7テスト: parse 型エラー・Goa 境界 0/9/"five"/2.5・tally 3分岐・決定性 deep-equal) |

## Bolt 1 完了状態と残余

- 完了: 型一式+parse+tally(zero-confirm 完走に足る核 — bolt-plan.md Bolt 1 宣言どおり。requirements.md FR-4a の GoA 側割当と FR-0 指令ループの U1 面を充足、配置は unit-of-work.md U1 行の scripts/amadeus-election-model.ts)
- Bolt 2 へ残余: 5クラス fail-closed 完全化(unknown-voter/reservation-missing)、shuffleView(fnv1a+mulberry32)、canEarlyTally、classifyLate、AmendBallot 受理ロジック(型は宣言済み)
- 検証実測: typecheck/lint/--ci(coverage)/patch gate 387/387 / complexity gate 新規違反 0(全 exit code 個別捕捉 — PR #1227 本文に記録)

## Bolt 2 追記(model-complete、PR #1231)

- U1 完全化: 5クラス fail-closed(unknown-voter/reservation-missing 追加・判定順序 FD 固定)、shuffleView(fnv1a+mulberry32+Fisher-Yates — ADR-4)、canEarlyTally(BR-8 境界)、classifyLate(BR-9 reexam フラグ)。Ballot.parse は構造/意味の2段分割(complexity gate)
- テスト: t234 拡張(business-rules.md BR-1/2/3/5/6/7/8/9 の全到達 — blind キー全数 assert・決定表全分岐・early tally 境界・後着2ケース)
- 検証実測: typecheck/lint/dist/promote/coverage:ci 全 exit 0、patch gate 72/72、complexity gate 新規違反 0(PR #1231 本文に記録)
