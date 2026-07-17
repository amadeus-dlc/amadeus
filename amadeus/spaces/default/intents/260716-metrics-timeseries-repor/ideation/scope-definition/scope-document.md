# Scope Document — metrics-timeseries-report

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`

## In スコープ(境界)

- **snapshot 読取**: `metrics/*.json`(schema_version=1)の全件読取と時系列ソート(ISO 日時プレフィクス単調性は feasibility で実測済み)
- **時系列整形**: collector 別(ccn/coverage/dist_size/loc/test_pyramid/tests)の主要値の時系列化
- **表形式出力**: 既習様式(兄弟 CLI の1行サマリ+表)に揃えた stdout 出力 — 定点観測の閲覧手段(#921 残余)を提供する
- **version 検査**: schema_version 不一致の loud 報告(C4 — fail-closed)

## Out スコープ(非目標)

- 新規メトリクスの追加・計測ロジック変更(metrics-snapshot.ts へ非干渉 — C1)
- CI job・トリガー変更
- グラフ画像・リッチ可視化(HTML/PNG 等)
- スキーマ変更・snapshot ファイルの書換え(読取専用)
- 外部依存の追加(C3 — Bun-only)

## 成功基準

- コマンド1回で 46+ snapshot の collector 別推移が表で読める
- schema 不一致・破損 JSON が無言スキップされず loud に報告される
- 既存 CI・テストスイートに影響ゼロ(読取専用の追加のみ)
