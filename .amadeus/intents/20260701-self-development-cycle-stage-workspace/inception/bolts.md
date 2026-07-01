# ボルト

## 一覧

| 識別子 | 概要 | ユニット | 設計 | 依存 | 詳細 |
|---|---|---|---|---|---|
| B001 | stage 判定語彙と stage0 採用条件を記録する。 | U001 | [design.md](units/U001-stage-adoption/design.md) | なし | [B001-stage-policy-record.md](bolts/B001-stage-policy-record.md) |
| B002 | workspace 対応記録と検証証拠を記録する。 | U002 | [design.md](units/U002-workspace-provenance/design.md) | B001 | [B002-workspace-provenance-record.md](bolts/B002-workspace-provenance-record.md) |

## 依存関係

| ボルト | 依存 | 理由 |
|---|---|---|
| B001 | なし | stage 判定方針は workspace 対応記録の前提であるため。 |
| B002 | B001 | workspace 対応記録には stage 判定の根拠を含めるため。 |
