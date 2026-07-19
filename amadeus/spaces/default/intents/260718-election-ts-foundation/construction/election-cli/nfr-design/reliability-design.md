# Reliability Design — election-cli(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md、business-rules.md、frontend-components.md

## 出力契約の設計(中核)

reliability-requirements.md の stdout/stderr 分離を次で実現する:

- 指令 JSON は stdout 1行のみ・advisory は stderr(frontend-components.md 出力契約表が正本 — stdout-directive-stderr-advisory の写像)。機械実行器は stdout 限定 parse(consumer 契約テストを e2e に内蔵 — tech-stack-decisions.md の ADR-6 CI 層)
- exit code: next は hold 指令でも 0(指令発行自体は成功)、report 不整合・verb 失敗・未知 verb は 1(frontend-components.md 表の全行を e2e fixture へ写像 — security-requirements.md の loud エラー設計と同一面)

## 障害と復帰の設計

- hold は理由型付きの正常系(business-logic-model.md の hold-resolved 復帰表 — 全 hold 理由に定義済み復帰先。未定義遷移は report が invalid-transition で拒否)
- corrupt ストア(U2 StoreError "corrupt")は loud エラー+exit 1 へ写像(fail-fast — 無言初期化なし)。business-rules.md の verb 契約の失敗側を全 verb で統一
- observability は N/A(reliability-requirements.md — 単発 CLI。可視性は指令 JSON+U2 timeline)。性能面の O(1) 決定表(performance-requirements.md)・単発実行(scalability-requirements.md)と同一構造
