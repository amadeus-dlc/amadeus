# Reverse Engineering Timestamp

## 実施記録

| 項目 | 値 |
|---|---|
| 実施日 | 2026-07-06(Developer Code Scan)/ 2026-07-07(Architect Synthesis) |
| Intent | 260706-amadeus-grilling(scope: grilling-integration, Standard depth, Brownfield) |
| リポジトリ | /Users/j5ik2o/Sources/j5ik2o.github.com/amadeus-dlc/amadeus |
| スキャン時コミット | 14c40c9c(main, clean) |
| 統合時 HEAD | e2c28731(2026-07-07 鮮度リフレッシュ後) |
| フレームワークバージョン | AMADEUS_VERSION = 1.1.0 |

## 鮮度リフレッシュ記録(2026-07-07)

| 項目 | 値 |
|---|---|
| 実施日 | 2026-07-07 |
| 差分範囲 | 8d73e463..e2c28731(10コミット) |
| 実施 intent | 260706-installer-impl(scope: feature) |
| 主要変更 | grilling 統合(PR#601)/ promote-self の composed-scope 保持(PR#602)/ dist 4ツリーのコミット化 / ライセンスのデュアル MIT + Apache-2.0 化 |

## 分析スコープ

- **対象**: リポジトリ全体 — `core/`(tools 27 / hooks 11 / agents 11 / sensors 4 / skills 3 / amadeus-common / knowledge / scopes / memory / templates)、`harness/` ×4、`scripts/`(package.ts / promote-self.ts)、`dist/` ×4、`tests/`(4層 293 テスト)、セルフインストール(`.claude` / `.codex` / `.agents`)、`amadeus/spaces/default/`、`docs/`
- **重点**: grilling-integration Intent の統合面 — stage-protocol.md §3 対話モード契約、Stop フックの human-wait 判別規約、amadeus-log.ts 在席ゲート、read-only スキル配布パターン、監査イベント型ホワイトリスト
- **非対象**: dist/ 内生成物の逐次レビュー(core との機械的パリティが保証済みのため)、e2e テストの個別内容

## 成果物一覧

`amadeus/spaces/default/codekb/amadeus/` 配下: business-overview.md / architecture.md / code-structure.md / api-documentation.md / component-inventory.md / technology-stack.md / dependencies.md / code-quality-assessment.md / reverse-engineering-timestamp.md(本ファイル)
