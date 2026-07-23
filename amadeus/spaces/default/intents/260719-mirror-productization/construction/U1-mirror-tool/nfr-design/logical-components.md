# Logical Components — U1-mirror-tool

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## モジュール内構成(amadeus-mirror.ts 単一ファイル内)

| 論理部品 | 種別 | 対応 |
|---|---|---|
| parseArgs / usage | 既存(status 追加) | CLI 境界 |
| buildSnapshot | 既存(不変) | 決定的状態源 |
| renderExpectedBody(既存レンダラの関数化 — 必要なら抽出) | 既存ロジックの seam 化 | create/sync と status の共通正本(オラクル非分離) |
| runStatus | 新規(純関数+GhRunner 注入) | StatusOutcome 導出(business-logic-model) |
| exitOf(StatusOutcome) | 新規(純関数) | exit 写像 0/1/2(tech-stack-decisions のテスト配置で unit 検証) |
| main の status 分岐 | 新規(配線) | in-process seam として export(spawn 盲点回避 — seam-export-handler-amend) |

## 抽出時の制約

renderExpectedBody の抽出は「既存 create/sync の出力バイト不変」を t232 で担保しながら行う(挙動不変面 — 抽出は関数化のみで文言変更ゼロ)。
