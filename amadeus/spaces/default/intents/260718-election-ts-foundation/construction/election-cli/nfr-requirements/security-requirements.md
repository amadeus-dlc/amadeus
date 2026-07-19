# Security Requirements — election-cli(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、frontend-components.md、domain-entities.md、requirements.md、technology-stack.md

## 入力検証と実行境界

- vote verb の票入力は U1 `Ballot.parse` の fail-closed 5クラス検証を通してのみ受理(requirements.md FR-3b — U5 は検証をバイパスする経路を持たない)。verb 引数の不正(未知 verb・引数不足)は stderr usage 1行+exit 1(**frontend-components.md 出力契約表が正本** — 実引用。なお next は hold 指令でも exit 0 = 指令発行自体は成功、拒否 exit 1 は report 不整合と verb 失敗の経路)
- 状態遷移は `report` のみがコミットし(business-logic-model.md — next は読取専用)、指令をスキップした遷移・状態の直接書換 API を持たない(遷移の単線化 — 検証劇場 Forbidden と同族の迂回経路排除)
- mutating verb への --help プローブ問題(no-help-probe-on-mutating-verbs ノルムの実測)を設計で回避: 引数なし実行は usage 表示+exit 非0 とし、既知 verb が余剰引数を無視して実行される経路を作らない(business-rules.md の verb 契約)

## 秘匿情報

- 資格情報を扱わない(gh 非依存 — requirements.md NFR-1)。開票前の票の blind 性は U2/U4 の構造(D-09 単一書込主体+ShortNotification)に委ね、U5 は開票前に票内容を出力する verb を持たない(technology-stack.md の既存 Bun/TS 構成の範囲内で新規攻撃面なし)
