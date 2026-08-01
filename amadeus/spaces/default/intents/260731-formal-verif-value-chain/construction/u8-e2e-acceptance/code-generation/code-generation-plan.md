# Code Generation Plan — u8-e2e-acceptance(S1/S2 先行分)

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

u8 は検証専用 Unit(unit-of-work.md の u8、UG Q1=A ユーザー裁定)であり、新規挙動を追加しない(BR-U8-1)。したがって本ステージの「実装」は実測貫通そのものであり、成果物は実測記録である。実測の全結果は `e2e-evidence.md` に固定した。

## 実行した Step

| Step | 内容 | 結果 |
|---|---|---|
| S1 | advisory 到達の e2e(FR-E1) | 機構面は貫通。audit ステージイベントのみ未充足(権限外 — `e2e-evidence.md` S1-f) |
| S2 | チェックポイント両貫通(FR-E2) | CP1/CP2 とも `never-run` / `changed` の両コードで directive JSON への搭載を実測。ラッチ挙動も実測 |
| S3 | 新規モデル到達(FR-E3) | 範囲外(u7 Phase B 未着地 — 後続指示待ち) |
| S4 | glue 修正 | 発見4件を3値判定で分類。conductor 裁定(2026-08-01)により S4-1(spec watch root)を執行クラスとして実施し、S4-2(verdict 語彙)も同時是正。S4-3/S4-4 は記録のみ(`e2e-evidence.md` S4) |
| S5 | 実測記録の record 固定 | 本ディレクトリへ `e2e-evidence.md` を作成 |

## 変更方針

S4-1 は u6 の着地契約に触れる設計判断を要するため、BR-U8-3 (ii) と `cid:requirements-analysis:implementation-deviation-election` に従い実装前に停止して裁定へ回した。conductor 裁定により FR-B3 既決要件への回復 = 執行クラスとして u8 内で実施(方式は `specRoot = dirname(hostRoot)`、state と composition record は hostRoot 据置)。

修正は TDD で進めた — 実デプロイレイアウトの fixture で新規テスト `t382` を先に書き、空入力ハッシュに着地する挙動面の Red 2 件を実測してから最小実装で Green にした。欠陥前提レイアウトだった既存 fixture 5 ファイルは実レイアウトへ明示改訂した(根拠は FR-B3 の要件接地)。core 変更のため dist 7 ハーネス+self-install を同一コミット面で再生成した。

## 検証コマンド(BR-U8-4)

`bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / 対象 7 ファイルの `bun test` / `bash tests/run-tests.sh --ci` / `bun tests/coverage-patch-gate.ts --check` を、パイプを介さず個別に実行して exit code を直接読んだ。全て `0`。詳細と集計出力は `e2e-evidence.md` § 検証(実測)。
