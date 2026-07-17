# Performance Design — eoc1-gate-guard

## 上流入力(consumes 全数)

`../nfr-requirements/reliability-requirements.md`(RR-2 規模実測)、`../functional-design/business-logic-model.md`、`../nfr-requirements/security-requirements.md`、`../nfr-requirements/tech-stack-decisions.md`(追加依存ゼロ)。

## 設計(層別保証 — c4)

| モジュール | 保証機構 |
|-----------|---------|
| checkQuestionsEvidence | 単一ファイル readFileSync 1回+行走査 O(n)、n は questions 実測 2KB 級 — gate-start 全体(state 読み書き・audit lock)に対し無視可能な追加コスト。タイムアウト機構は不要(RR-2 根拠) |
| handleGateStart 配線 | 検査1回のみ(ループなし)— 呼び出し頻度は gate-start と同一 |
