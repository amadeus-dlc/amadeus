# Reliability Requirements — gh-optional-runtime-norm

> 上流: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Fault Isolation

`gh`不在・未認証・API/rate-limit/command faultは当該direct CLI invocationをexit 1で終了させる。phase boundaryではU6がretry/skipを提示し、workflow全体を恒久停止しない。

## Recovery and Durability

規範変更はdraft、independently-reviewed、user-approved、mergedの証跡を順に要求する。merged前はU1をrelease-readyと判定しない。規範はversion controlで永続化し、database/backup subsystemを追加しない。
