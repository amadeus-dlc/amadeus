# Performance Requirements — gh-optional-runtime-norm

> 上流: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Targets

- U1はdocumentation/norm変更のみでruntime処理を追加しない。
- 規範検査は対象CID一件へのbounded searchで、repository-wide generated tree scanを要求しない。
- CI検証は既存lint/check pipeline内で完了し、daemon、polling、background processを追加しない。

## Verification

対象CID count、legacy clause absence、canonical全文一致、`git diff --check`を個別に計測し、application runtime benchmarkへのregressionを0件とする。
