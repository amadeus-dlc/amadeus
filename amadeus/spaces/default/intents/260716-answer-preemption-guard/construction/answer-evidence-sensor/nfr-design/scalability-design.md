# Scalability Design — answer-evidence-sensor

上流入力(consumes 全数): `../nfr-requirements/performance-requirements.md`(P-1/P-2)、`../nfr-requirements/security-requirements.md`(S-1〜3)、`../nfr-requirements/scalability-requirements.md`(SC-1/2)、`../nfr-requirements/reliability-requirements.md`(R-1〜3)、`../nfr-requirements/tech-stack-decisions.md`、`../functional-design/business-logic-model.md`(純関数2段パイプライン)。

## 設計

- SC-1 実現: corpus sweep テストは Bun.Glob で全 questions を列挙し、evaluateAnswerEvidence を in-process 逐次適用(単一プロセス・spawn なし — bun-coverage-spawn-blindspot 対応を兼ねる)。
- SC-2 実現: 32 stage 宣言は frontmatter データのみ — 実行構造は stage 数に非依存(hook が current stage の sensors_applicable を読む既存経路)。

## 制約

sweep の対象母集団は測定 ref(HEAD SHA)とともにテストログへ記録する(measurement-ref-in-artifacts)。
