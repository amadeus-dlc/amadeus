# RAID Log — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../market-research/competitive-analysis.md`(closed-enum 業界標準の確認)、`../market-research/market-trends.md`(面数拡大トレンド)、`../market-research/build-vs-buy.md`(完全自作の継承)、feasibility-assessment.md。

## Risks

| # | リスク | 影響 | 緩和 | 現存確認(2026-07-16) |
| --- | --- | --- | --- | --- |
| R-1 | 並行 intent との installer ファイル交差(e1 の codex-teamup 系が packages/setup を触る可能性) | 直列化コスト | 着手前に実 diff 目録で交差判定(c6) | e1 の #1089 は scripts/team-up.sh+utility.ts 面で packages/setup 非接触を PR files で確認済み — 現時点交差なし |
| R-2 | ローカル coverage:ci の負荷起因間欠 FAIL(#1085 open)による検証ノイズ | 切り分けコスト | 静穏時実行+rerun-red-reattribution、failed 実文捕捉 | #1085 open を gh 実測(unit 1 候補 = t163 特定済み) |
| R-3 | 全数性テストの設計が dist ツリー集合と共変し偽 green 化 | 検証劇場 | t149 前例(モジュールスコープ定数、manifest 非導出)の同型設計を requirements で固定 | 該当設計は未着手(requirements で扱う) |

## Assumptions

| # | 前提 | 検証 |
| --- | --- | --- |
| A-1 | dist/opencode・dist/cursor の harness.json が installer の読む形で実在 | ls+JSON 実測済み(t149 が存在面を恒久ピン) |
| A-2 | npm publish 経路は前 intent のまま稼働 | release.yml 変更なし(C-4) — requirements の c4 チェックリストで npm pack 実検証を再固定 |

## Issues(現存 open のうち本 intent 関連)

- なし(#1085/#1061/#1001 は open だが installer 面非接触 — gh 実測)

## Dependencies

- dist ツリー(#626 着地済み)/ Issue #1048 のクロスレビュー2名(済み)— 依存はすべて充足済み
