# NFR Design 質問 — intent-autonomy-runtime

## 裁定結果

追加のユーザー裁定は不要である。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceであり、`functional-design/business-logic-model.md`の#2067 mode / grant / decision / park契約をNFRオラクルとする。

## 矛盾・抜け漏れ確認

Intent-scoped grantはTTL・usage budget・bearer secretを持たず、legacy standing grantはnon-authoritativeであるというIssueの確定方針を維持する。PR、外部runner、completed review、terminal live completionは他Issue / Unitのため追加しない。

