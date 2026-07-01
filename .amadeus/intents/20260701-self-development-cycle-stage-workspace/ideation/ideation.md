# Ideation

## 実現可能性

| 観点 | 状態 | メモ |
|---|---|---|
| 技術 | feasible | 既存の `.amadeus/glossary.md`、`.amadeus/steering/policies.md`、`.amadeus/development.md` に stage と workspace の初期語彙がある。 |
| 運用 | feasible | GitHub Issue 起点、PR 準備条件、merge 後の stage0 採用判断は `.amadeus/development.md` に記録済みである。 |
| セキュリティ | feasible | 文書成果物の定義が中心であり、秘密情報や外部認証情報を追加しない。 |
| 依存 | feasible | 既存 Intent `20260629-self-dev-steering-layer` の D002 と Discovery が、Issue #233 を後続 Intent として扱う根拠になる。 |

## 体制

| 役割 | 種別 | 関心 |
|---|---|---|
| Maintainer | 判断者 | stage2 を次回 stage0 として採用するかを判断できること。 |
| Agent | 作成者 | build workspace と target workspace を混同せず、利用した skill、validator、開発用スクリプトを追跡できること。 |
| Reviewer | 参照者 | Issue、Intent、PR、検証結果、stage 判定の対応関係を追えること。 |

## 初期モック

| モック | 目的 | ファイル |
|---|---|---|
| 初期確認 | stage 判定と workspace 対応記録を、後続 Intent の PR 準備条件として確認する。 | [initial-confirmation.puml](mocks/initial-confirmation.puml) |

## 未確定事項

- User Stories が必要な人間アクター価値として、Maintainer の stage0 採用判断を扱うか。
- Unit を stage 判定と workspace 対応記録に分けるか、自己開発 cycle 記録として一つにまとめるか。
- 対応記録先を `traceability.md`、`decisions.md`、または専用の evidence 形式のどれに寄せるか。
- `CONTEXT.md` への stage0、stage1、stage2 の追加は、この Intent の対象外として後続判断に残す。

## 学習候補

- 自己開発 cycle の stage 判定を、後続 Intent の provenance とどう接続するか。
- 人間による stage0 採用判断を、どの成果物で追跡するか。
- build workspace と target workspace の対応を、PR と Intent のどちらで主に読むか。
