# Security Test Instructions — 260801-otel-meta-schema

上流入力(consumes 全数): 各 unit の code-generation-plan.md(全6 unit — 実行形態と経過の正本)と code-summary.md(全6 unit — 変更面・検証実測・PR 着地の正本)(落ちる実証の実施実績)、nfr-design security-design、project.md Mandated(export-boundary-redaction)— 対象変更の security regression に限定(repository 全体の依存 audit は別判定 — c1-doctor-seam)。

## 実施範囲

- 二層 redaction: credential 形値の bag 時点/store 時点 両層 assert(t-otel-resource)、span 文脈キーの admit 後 scrub(t-otel-span-attrs — env 供給 agent.id の外部自由文)、stacktrace の `<home>`/`<external>` マスク+絶対パス非出現(t-otel-stacktrace-redaction)
- 閉集合統制: supplier/計器/resolver の語彙外 throw(fail-closed)
- Purpose 統制: prompt 先頭1行+200字+scrub(t-subagent-purpose / t-log-subagent-start — AWS_SECRET 形値のシャード非出現 assert)
- DAST・依存更新は範囲外(実在境界に trace しないため不生成 — 根拠: 本 intent は外部ネットワーク面を追加しない)

## 判定

上記の全 assert は --ci スイートに包含され green(build-test-results.md 参照)。落ちる実証は各 Bolt で注入→赤→復元を実測済み(code-summary.md 参照)。
