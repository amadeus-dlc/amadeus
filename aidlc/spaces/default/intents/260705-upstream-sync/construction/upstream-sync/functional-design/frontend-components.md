# Frontend Components — upstream-sync

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 適用判断

UI は存在しない。本 Intent の変更対象はエンジン CLI、hooks、skill 文書、パリティ基準データであり、frontend component は生じない。本文書は不適用の判断と根拠を記す簡潔な文書として残す（Testing Posture の規約: 不適用の成果物は空ファイルにせず適用判断を記す）。

## 根拠

- 取り込む Adaptive Workflows の利用面は `/aidlc compose` の CLI 対話と AskUserQuestion gate であり、いずれも既存の会話 UI 上で動く。新規の画面・コンポーネント・視覚資産はない。
- 上流 16 ファイルにも frontend 資産は含まれない（tools / hooks / agents / knowledge / skills / CLAUDE.md のみ）。
