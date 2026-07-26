# Evidence — practices-discovery(metrics 可視化)

上流入力(consumes 全数): code-structure.md, technology-stack.md, dependencies.md, code-quality-assessment.md, architecture.md, business-overview.md

## 証跡の出所(practices-discovery:c1 — RE codekb 代用)

| スキャン面 | 代用した codekb 証跡(いずれも observed 1c43438df) |
|---|---|
| CI | architecture.md「metrics サブシステムの現況」節の CI job 実測(ci.yml:398-480、bot PR + auto-merge、ci-success 集約外) |
| テスト | code-structure.md のテスト8ファイル配置表(unit/integration 分割、AMADEUS_METRICS_ROOT seam、落ちる実証4パターン) |
| コードスタイル | code-quality-assessment.md Q-M1(既存 metrics 3スクリプトの品質水準: fail-closed・パーサ共有・アトミック書込) |
| 依存・セキュリティ | dependencies.md(依存追加ゼロ方針、amadeus-lib 非依存の実測)、technology-stack.md(Bun 1.3.13 / lizard ピン留め) |
| 価値面 | business-overview.md(docs 言及0件 — ドキュメント新規追加の必要性) |

## 差分ギャップ判定の実測

- affirmed 済み team.md(2026-07-09 以降の全 affirm)・project.md(Testing / Deployment / Code Style / Mandated / Forbidden)と本 intent の作業面を突き合わせ、未カバーの慣行は0件
- 判定根拠: 本 intent の作業面(scripts/ 追加・ci.yml 同乗・tests 追加・docs 追加)はすべて既存規則の適用対象であり、新しい種類の運用(新配布経路・新外部サービス・新リリース面)を導入しない
