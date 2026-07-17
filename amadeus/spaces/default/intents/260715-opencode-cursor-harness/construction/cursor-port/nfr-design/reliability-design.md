# Reliability Design — U3 cursor-port

intent: 260715-opencode-cursor-harness / Unit: U3
上流入力: nfr-requirements(reliability-requirements.md RL-U3-1〜3)、functional-design(business-rules.md R-U3-1/6)。

## 設計

- RL-U3-1(前提: R-U3-1 再実測): fail-open は「EXIT_ADVISORY_FAIL(≠0,≠2)で終了し stdout に何も出さない」実装 — Cursor 契約の「その他 exit = fail-open」に一致。stderr へ1行の診断(観測可能性)
- RL-U3-2: 単体テスト3ケース以上(正常写像 / 不正 stdin / 未登録 tool_name)+ exit 値アサート — in-process seam(アダプタ本体を argv/stdin パラメータ化して export、seam-export-handler-amend 準拠)
- RL-U3-3: emit 面は U1 機構継承

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。
