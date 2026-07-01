# Ideation

## 実現可能性

| 観点 | 状態 | メモ |
|---|---|---|
| 技術 | feasible | 既存の steering layer、Discovery、Intent 成果物で記録先を表現できる。 |
| 運用 | feasible | `.amadeus/development.md` は GitHub Issue 起点と PR 準備条件を既に持っている。 |
| セキュリティ | feasible | この Intent は文書成果物の整理であり、秘密情報や外部認証情報を扱わない。 |
| 依存 | feasible | [PR #232](https://github.com/amadeus-dlc/amadeus/pull/232) と [PR #234](https://github.com/amadeus-dlc/amadeus/pull/234) の merge 後の `.amadeus/` を前提にできる。 |

## 体制

| 役割 | 種別 | 関心 |
|---|---|---|
| Maintainer | 判断者 | stage2 を次回 stage0 として採用するかを判断する。 |
| Agent | 作成者 | Intent 成果物を作成し、validator と PR 検証結果を記録する。 |
| Reviewer | 参照者 | stage 判定と workspace 対応記録が後続 Intent で読めるか確認する。 |

## 初期モック

| モック | 目的 | ファイル |
|---|---|---|
| 初期確認 | stage 判定、採用判断、workspace 対応記録の最小入力を確認する。 | [initial-confirmation.puml](mocks/initial-confirmation.puml) |

## 未確定事項

- stage0、stage1、stage2 を `CONTEXT.md` に確定語彙として追加するか。
- workspace 対応記録を `.amadeus/development.md`、Intent の `traceability.md`、Intent の `decisions.md` のどれに置くか。
- stage2 採用判断を PR merge 後だけで足りるとするか、人間の明示判断を必須にするか。
- 後続の example provenance と混入検出に、どの stage 判定を渡すか。

## 学習候補

- Rust bootstrap の stage0、stage1、stage2 の扱い。
- GCC の build、host、target の使い分け。
- Amadeus 自己開発で人間の採用判断を監査可能にする最小記録。
