# Security Requirements — fix-1172-skip-denominator(nfr-requirements)

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 要件

| # | 要件 | 根拠 |
|---|---|---|
| S-1 | 新規入力面なし — 関数シグネチャ不変(business-logic-model)、入力は既存の state 文字列のみ | requirements FR-2a |
| S-2 | 認証情報・外部送信なし(gh 呼び出し面は本 unit の変更外 — amadeus-mirror の gh 境界は既決 gh-scripts-boundary のまま不変) | 変更は純関数 countStageProgress のみ |

## 前提(technology-stack 由来)

technology-stack.md のローカル CLI 構成 — ネットワーク面の新規要件は N/A(反証可能: 変更 diff に fetch/socket なし)。
