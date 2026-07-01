# Ideation

## 実現可能性

| 観点 | 状態 | メモ |
|---|---|---|
| 技術 | feasible | `README*.md`、`skills/amadeus-*`、`.agents/skills/amadeus-*`、設定ファイルを確認すれば対象を整理できる。 |
| 運用 | feasible | Issue #284 を根拠にし、PR 説明で対象外候補を明示できる。 |
| セキュリティ | feasible | 暗黙起動を抑える設定は、内部 skill の意図しない起動を避ける運用上の制約として扱える。 |
| 依存 | feasible | 既存 Intent の完了を前提にせず、現在の target workspace のファイル状態から判断できる。 |

## 体制

| 役割 | 種別 | 関心 |
|---|---|---|
| ACT001 Maintainer | 判断者 | 内部 skill と公開入口 skill の境界、README の掲載範囲、PR の merge 可否を判断する。 |
| ACT002 Agent | 実行者 | 対象ファイル、設定配置、検証結果を追跡可能にする。 |
| ACT003 Reviewer | 参照者 | Issue #284、Intent、PR の対応関係と検証結果を確認する。 |

## 初期モック

| モック | 目的 | ファイル |
|---|---|---|
| 初期確認 | README 一覧と暗黙起動ポリシー設定の対象範囲を確認する。 | [initial-confirmation.puml](mocks/initial-confirmation.puml) |

## 未確定事項

- Codex 向けの `policy.allow_implicit_invocation = false` 設定がどの生成物または設定ファイルで管理されるかは、Inception の Codebase Analysis で確認する。
- Claude Code 向けに同等の暗黙起動抑制設定が存在するかは、Inception の Codebase Analysis で確認する。
- `amadeus-grilling` と `amadeus-domain-modeling` を Internal Skills 一覧に残すか、公開入口または横断的補助 skill として再分類するかは Inception で確認する。

## 学習候補

- `follow_up_issue_candidate`: Discovery の Intent 候補に安定した候補 ID がないため、ユーザーがコマンドや短い自然文で候補を指定しにくい。
  `Intent 候補` 表に `候補ID` 列を追加し、`IC001` のような識別子で recommended 候補を指せるようにする改善を検討する。
