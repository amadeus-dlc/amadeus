# Tech Stack Decisions — harness-wiring(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 決定

- TSD-W1: 新規依存ゼロ — 配線は SKILL/onboarding の prose と既存 native subagent 機構(各 harness 固有)のみ(`technology-stack.md` の現行構成不変)
- TSD-W2: 正本は `packages/framework/harness/<name>/` の各表層。dist 反映は U3(c6 非交差)
- TSD-W3: テストは t181(unit・トークン検査)への追記を第一とし、新規テストファイルは journey 棚卸しの結果必要な場合のみ(reuse inventory — 既存で代替できない根拠を要する)

## 検証

- NFR-6 適用対象(既存 CI gate 継承で充足)。新規ツールチェーン導入判断のみ N/A
