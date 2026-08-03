# Reliability Design — u7-ci-stage1

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 故障契約

build失敗は後続testを開始せず、dist不在はloud fail、再現性差はjob赤とする。旧drift checksはu8切替まで並存し、検査空白を作らない。

## 復旧

同一SHAでjob全体を再実行する。生成済みdistの部分修正や差分無視は行わない。
