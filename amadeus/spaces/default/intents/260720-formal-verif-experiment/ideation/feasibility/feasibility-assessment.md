# Feasibility Assessment — 260720-formal-verif-experiment

## 上流入力(consumes 全数): intent-statement.md

intent-statement.md の問題定義(仕様の穴クラスのバグに対する停止条件の確立)と成功指標(6×2 検出マトリクス+採否判定)を前提に、技術的実現性を実測ベースで評価する。測定 ref: worktree HEAD(team/20260719-231310-08a0/engineer-6、2026-07-20T04:47Z 時点)。

## 技術的実現性(実測)

| 前提 | 実測結果 | 判定 |
|---|---|---|
| Java ランタイム | OpenJDK 26.0.1(Temurin、mise 管理)が導入済み — `which java` 実測 | ✅ TLC 実行の土台あり |
| TLC / Apalache | **未導入** — `which tlc` / `which apalache-mc` とも不在 | ⚠ 要取得(tla2tools.jar のダウンロード。mise/直接配置は construction 時判断) |
| fast-check | `package.json:33` に `"fast-check": "^4.9.0"` 実在。PBT テスト3本の既習様式あり | ✅ TS アームの土台あり |
| 選挙 CLI 対象面 | `scripts/amadeus-election-*.ts` 5ファイル実測(model/store/record/transport/本体) | ✅ 対象面確定 |
| バグ修正コミットの実在(再注入の材料) | #1261→PR#1268、#1262→PR#1277、#1252/#1253→PR#1273(merged、gh 実測)。PR#1273 は invalid-timestamp/amend 経路/per-voter resolution の3欠陥を同梱 | ✅ 修正 diff の revert で欠陥再注入が可能 |
| 「6件」の欠陥台帳 | issue 実測で確定できた欠陥は5件(#1261、#1262、#1252、#1253、per-voter resolution[#1273 同梱、単独 issue なし])。6件目は計数差 — **requirements-analysis で台帳確定が必要**(推定確信度: 中) | ⚠ RAID へ計上 |

## リスク分析(要旨 — 詳細は raid-log.md)

1. **共通モード故障**: TLA+ スペックも TS 判定器も同一 AI が書くと、概念混同がスペックごと持ち込まれ実験が両アーム偽陰性になりうる(6体グリリングの一致知見)。緩和: アーム別に独立エージェント(blind)で起草する実験プロトコルを design 段で固定する
2. **TLC 導入コスト**: jar 取得+JVM 実行の CI 配線は Q2 裁定(repo ローカル限定)の枠内だが、初回導入の摩擦は実験工数に計上する
3. **注入ブランチの交差**: scripts/amadeus-election-*.ts は e2/e4 の in-flight intent と交差しうる — construction 進入時に非交差実測(leader 前提条件)

## 総合判定

**GO(ideation 続行・park 後の construction 判断に足る実現性あり)** — 全ての hard 前提(Java、fast-check、対象面、修正コミット)が実測で確認済み。⚠ 2点(TLC 未導入、欠陥台帳の計数差)はいずれも construction 前に解消可能なクラスで、実験設計自体を脅かさない。
