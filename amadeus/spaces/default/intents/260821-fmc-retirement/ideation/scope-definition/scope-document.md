# Scope Document — 260821-fmc-retirement

上流入力: `ideation/intent-capture/intent-statement.md`(削除対象の全数 10 項目)、`stakeholder-map.md`、`intent-capture-questions.md`(Q1〜Q4 裁定)、`scope-definition-questions.md`(Q1〜Q3 裁定)。

## In Scope(削除・整理対象)

| # | 対象 | 基準・受け入れ条件 |
|---|---|---|
| 1 | `plugins/formal-model-check/` 全体 | ディレクトリ消滅。`git grep -i "formal-model-check"` が本線コード面 0 hit |
| 2 | `amadeus/config.json` の activation.names / scope-bindings の fmc 項 | 次 compile で 2 ステージが graph 不在(0-plugin baseline) |
| 3 | ci.yml の formal-model-check job | 集約 require_result 除去 + job 削除、除去後 CI green(Q2=A) |
| 4 | 参照テスト 153 ファイル | FMC 専用は削除・混在は依存部分除去(Q1=A、機械分類)+ coverage-registry regen + patch-allowlist 整理 |
| 5 | 生成 runner skill 2 種 | runner-gen 再生成 + drift guard green |
| 6 | `amadeus/spaces/default/specs/tla/` 全体(7 .tla + cfg + model-map.json) | 削除(intent-capture Q2=A、git 履歴が保存) |
| 7 | self-install / 全ハーネス dist 投影 | `bun run build` + 隔離2回再現性 + source-only + グラフ不変量 green |
| 8 | docs 対訳(FMC 記述) | t3028 docs-sync green |
| 9 | ノルム整理(team.md 二層検証の形式面 / project.md の fmc・tla 系 cid) | 単独ノルム PR(intent-capture Q4=A、蒸留手順) |
| 10 | FMC 系 open Issue のクローズ | intent-capture Q3=A(理由コメント付き、削除着地後に実行) |

## Out of Scope

- 新 FMC の再設計・実装(将来 intent)
- `github-pr-convergence` プラグイン(#3382 別エージェント対応中 — 非接触。ただし model-map 削除に伴う同プラグイン側参照の不在は requirements で実測確認)
- リリース・publish 等の不可逆外部操作
- FMC と無関係な既存テスト・ノルムの変更

## 制約

- 配送: 単一 Bolt 志向、分割時も各 PR 単独 green(Q3=A)。walking-skeleton gate は最初の Bolt に維持
- 検証: remote-first(リモート CI 正本)。隔離2回ビルド・source-only・グラフ不変量・plugin-conformance-e2e は同一成果物で確認
- 並行作業: plugins/github-pr-convergence は別エージェントが作業中 — 本 intent は同ディレクトリへ書き込まない

## 成功基準(intent-statement から継承)

次 intent の compile で FMC 2 ステージ不在 / CI green / 本線 0 hit / ビルド系ゲート全 green。
