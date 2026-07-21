# Security Design — full-matrix-suite

## 上流と same-condition boundary

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。baseline/manifest order/input identity/runner/resource/network profileを両armへ同一に渡す。

## SchedulePolicy

`SchedulePolicy` はInputSetIdentityをpreimageにしたhash bitだけでfirst armを決め、12 entriesを開始前にsealする。operator override、開始後変更、arm別subject orderを拒否する。arm sandboxは他arm/evidence/fixture expectationを不可視化し、metadataはopaque aliasだけを使う。

## CostIntegrity

`GitCostAdapter` はfrozen executable realpath/version/content identityを使い、empty isolated system/global config、closed local config、hooks disabled path、`--no-ext-diff --no-textconv`、`LC_ALL=C`、closed environmentをarray argvへ強制する。実効config key/value列とcommand identityをreceiptへ保存する。numstatはarm-owned path manifestへ限定し、binary/rename/shared/unknown pathを拒否する。elapsedはU1 events、suite timeはU3 monotonic receiptsだけを使いmtime/commit/conversation timeを拒否する。

## Verification

arm別input/order、schedule drift/manual first arm、sandbox escape、shared LOC、Git config/ext-diff、evidence hash driftをred fixtureにする。credential/network/external election store read=0である。
