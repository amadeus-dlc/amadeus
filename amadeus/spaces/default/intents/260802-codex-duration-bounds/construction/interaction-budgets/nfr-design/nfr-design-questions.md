# NFR Design — 質問票（0問様式、unit: interaction-budgets）

## 質問不要判定

`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`からstage-scoped budget、delivery state、HMAC capabilityへ一意に設計できる。

## 曖昧性分析

active interactionのmachine migrationは非対応とし、key loss時は人間再確認＋新revisionで閉じる。
