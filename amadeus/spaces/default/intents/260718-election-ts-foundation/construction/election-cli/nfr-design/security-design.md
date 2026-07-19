# Security Design — election-cli(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md、business-rules.md、frontend-components.md

## 実行境界の設計

security-requirements.md の要件を次で実現する:

- vote verb は U1 Ballot.parse を唯一の受理経路として配線(バイパス API なし — business-logic-model.md の verb 表で vote の入力は raw→parse→appendBallot の単線)
- 状態遷移は report のみがコミット(next は読取専用 — business-logic-model.md)。状態の直接書換 verb を設けない(迂回経路の構造排除)
- 引数なし実行は usage+exit 1(frontend-components.md 出力契約表 — no-help-probe-on-mutating-verbs の設計回避)。--help フラグ非実装(tech-stack-decisions.md の却下判断)

## 秘匿と blind

- 開票前に票内容を出力する verb なし(security-requirements.md — status は投票済み/未着の voter 名のみ。business-rules.md の verb 契約)。資格情報なし(gh 非依存)。性能面(performance-requirements.md の読取専用 next)・信頼性面(reliability-requirements.md の fail-fast)と同一の単線フローで、検査追加の負荷なし(scalability-requirements.md)
