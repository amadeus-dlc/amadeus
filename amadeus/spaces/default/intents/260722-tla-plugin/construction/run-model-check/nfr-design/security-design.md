# Security Design — U3 run-model-check

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Isolation

- Darwinはnetwork-deny sandbox、Linuxは固定digest containerを`--network=none`で実行し、jarをchecksum検証後read-only mountする。
- model/cfg/outをrealpath検証し、argv配列でspawnする。shell展開、既存out、symlink outを拒否する。

## EnvReceipt schema

- schema `amadeus.env-receipt.v1`、runId、planner、固定inspection集合を持つ。各inspectionは`id`、`status: passed|failed|not-applicable|not-run`、`expected`、`observed`、`reason`を必須とする。
- inspection IDは`image-digest`、`jar-sha256`、`network-deny`、`jdk-snapshot`、`sandbox-profile`とし、全5 IDを常に出力する。

| Planner | passed必須 | not-applicable必須 |
|---|---|---|
| Docker | image-digest、jar-sha256、network-deny | jdk-snapshot、sandbox-profile |
| Darwin | jar-sha256、jdk-snapshot、sandbox-profile、network-deny | image-digest |

- passedではexpected/observedを非空string、reasonを空stringとする。not-applicableではexpected/observedを`null`、reasonを固定非適用理由とし、planner matrixで定めたplatform非該当IDだけに許可する。failedは検査実行済みIDだけで許容し、expected/observed/reasonを必須にして全体をHARNESS_ERRORにする。not-runは前段failureにより未実行の適用検査だけに許容し、expectedを非空、observedを`null`、reasonを`not run because <固定errorCode> occurred before environment verification`形式とする。
- receipt builderはdomain層、Darwin/Dockerの固定inspection matrixと未実行receipt factoryはplanner層が所有する。composition rootでprovider別配列を合成してはならない。
