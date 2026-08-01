# Code Generation Plan — u8-e2e-acceptance(S1/S2 先行分)

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

u8 は検証専用 Unit(unit-of-work.md の u8、UG Q1=A ユーザー裁定)であり、新規挙動を追加しない(BR-U8-1)。したがって本ステージの「実装」は実測貫通そのものであり、成果物は実測記録である。実測の全結果は `e2e-evidence.md` に固定した。

## 実行した Step

| Step | 内容 | 結果 |
|---|---|---|
| S1 | advisory 到達の e2e(FR-E1) | 機構面は貫通。audit ステージイベントのみ未充足(権限外 — `e2e-evidence.md` S1-f) |
| S2 | チェックポイント両貫通(FR-E2) | CP1/CP2 とも `never-run` / `changed` の両コードで directive JSON への搭載を実測。ラッチ挙動も実測 |
| S3 | 新規モデル到達(FR-E3) | 範囲外(u7 Phase B 未着地 — 後続指示待ち) |
| S4 | glue 修正 | コード変更 0 件。発見4件を3値判定で分類(`e2e-evidence.md` S4) |
| S5 | 実測記録の record 固定 | 本ディレクトリへ `e2e-evidence.md` を作成 |

## 変更方針

コード変更なし。S4-1(spec watch root の乖離)は u6 の着地契約に触れる設計判断を要するため、BR-U8-3 (ii) と `cid:requirements-analysis:implementation-deviation-election` に従い実装前に停止し、Issue 起票文案を添えて裁定へ回した。S4-2(stage file の verdict 語彙反転)は docs 面の是正候補として記録に留めた。

## 検証コマンド(BR-U8-4)

`bun run typecheck` / `bun run dist:check` / 対象 6 ファイルの `bun test` を、パイプを介さず個別に実行して exit code を直接読んだ。全て `0`。詳細と集計出力は `e2e-evidence.md` § 検証(実測)。
