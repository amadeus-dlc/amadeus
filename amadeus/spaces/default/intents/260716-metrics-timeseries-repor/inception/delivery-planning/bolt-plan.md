# Bolt Plan — metrics-timeseries-report

上流入力(consumes 全数): `../requirements-analysis/requirements.md`、`../application-design/components.md`、`../units-generation/unit-of-work.md`・`unit-of-work-dependency.md`・`unit-of-work-story-map.md`、`../practices-discovery/team-practices.md`

## Bolt 列(1 Bolt)

| Bolt | Unit | 内容 | ゲート |
|---|---|---|---|
| Bolt 1 | metrics-timeseries-cli | scripts/metrics-timeseries.ts+unit テスト(M1→M2→M3 の walking slice、S1 --last 同乗) | walking-skeleton 相当だが後続 Bolt が存在しないため単独ゲート(PR レビュー+per-PR ユーザーマージ伺い)がそのまま終端ゲート |

## スケルトン方針

amadeus スコープはグリーンフィールド系の walking-skeleton 対象だが、本 intent は 1 Bolt 完結のため「Bolt 1 = 全体」— スケルトン→拡張の2段は発生しない。ラダープロンプト(Autonomy Mode)は Bolt 1 完了後に対象 Bolt が残らないため不要。

## 完了定義

PR マージ(ユーザー承認)→ 着地 grep → Issue #921 の証跡付きクローズ提案(leader ディスパッチ 20:58:16Z の (3))。
