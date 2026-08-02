# Reliability Design — U3 exception

上流入力(consumes 全数): reliability-requirements ほか performance-requirements / security-requirements / scalability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)— 信頼性要件は requirements.md NFR-1(fail-open)+ NFR-3(TDD・落ちる実証)から代替導出。business-logic-model.md(実在)の fail-open 分岐(Error 以外・stack 不在)を消費。tech-stack 前提は codekb technology-stack.md 260801 現在節に依拠。

## 失敗面の分類

- **Error 以外の throw 値**: type/stacktrace を省略し message のみで記録継続(fail-open — 例外報告自体は失われない)
- **err.stack 不在**: stacktrace 属性を省略(fail-open)
- **redactStacktrace 内部の予期しない失敗**: redaction に失敗した stack を**素通ししない** — stacktrace 属性を省略へ降格する(fail-open だが「漏洩方向へは開かない」— セキュリティ統制の欠落を silent pass にしない方針。security-design の統制と対)
- retry / circuit breaker は非適用 — 外部呼出しが存在しない純関数+ローカル追記のみ(nfr-design:c1)

## 例外報告経路自体の信頼性

- recordException は「例外を報告する」経路であり、この経路内での二次例外がワークフロー本体へ再伝播しない構造とする(内部 try で遮断し、最低限 message のみの event 記録へ縮退)。telemetry の欠陥が本体を落とすことは構造的にない(NFR-1)

## 検証(落ちる実証)

- 非 Error 値・stack 不在・redaction 内部失敗(注入)の3経路それぞれで「emit が継続し、省略/縮退が期待どおり」を assert。経路到達は lcov の DA で実測確認する(error-path-reach-lcov — 偽経路 green の排除)
