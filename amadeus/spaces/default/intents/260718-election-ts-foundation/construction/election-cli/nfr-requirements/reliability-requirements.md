# Reliability Requirements — election-cli(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 出力契約(エンジン既習の stdout/stderr 分離)

- **stdout = 指令 JSON / stderr = advisory** の分離契約(stdout-directive-stderr-advisory ノルムの写像 — amadeus-orchestrate の既習様式を requirements.md FR-0 の指令ループ同型性から継承)。指令 JSON を消費する機械実行器(ADR-6 CI 層)は stdout 限定 parse とし、stderr への advisory 追加が consumer を壊さないことをテストで固定
- exit code 契約: 正常指令 = 0、拒否・不正 = 非0+理由(business-logic-model.md の verb 表)。exit code はパイプ越しに捕捉しない検証設計(no-exit-capture-through-pipe — テスト側規律)

## 障害耐性と復旧

- hold は障害でなく正常系の人間判断点(requirements.md FR-4b — 理由型付き)。hold-resolved の復帰表(business-logic-model.md — 理由別 resume 先)により、どの hold からも定義済みの復帰経路を持つ(未定義状態への遷移不能)
- 壊れたストア(U2 の corrupt reject)は U5 で loud エラー+exit 非0 に写像し、無言の初期化・続行をしない(fail-fast — 回復は人間の裁定事項)
- 可用性 SLO・observability 要求は N/A(反証可能な根拠: U5 は常駐プロセスを持たない単発 CLI。実行可視性は U2 timeline の記帳列+指令 JSON 自体が担う)。ランタイム障害面は既存スタック(technology-stack.md)の Bun/TS に閉じる
