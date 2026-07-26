# Practices Discovery 質問 — 260725-kimi-harness

> E-OC1 証跡: ソロモード・選挙不要判定(根拠種別: 全1問ともユーザー本人の HUMAN_TURN 直接回答 — Guide me 対話で回答を受領)。ユーザー承認タイムスタンプ: 2026-07-25T07:37:19Z(「1」= A)
> モード: Guide me(対話式)
> ギャップ判定: 証跡スキャンは同日 RE codekb に代替(practices-discovery:c1)。affirm 済み team.md との差分ギャップは Walking Skeleton のみ(現行 block が過去 intent 固有の記述で陳腐化)。他4セクションは変更不要と判定し質問しない

## Q1. 本 intent の Walking Skeleton 方針(最初の Construction Bolt の形)

事実(自己調査): org.md は greenfield scope(mvp/enterprise/feature/poc/workshop/infra)で常に skeleton Bolt を最初に実行と定め、project.md は greenfield 要素(新パッケージ・新配布経路)を含む intent で最初の Bolt を小さな end-to-end スライス + ゲート確認と定める。本 intent は新ハーネス dist(新配布経路)を含む。

- A. skeleton あり(推奨): 最初の Bolt を小さな E2E スライス(M1 ハーネス定義 + `bun scripts/package.ts kimi` で `dist/kimi/` 生成 + `--check` 通過)として単独・ゲート付きで実行し、adapter 等の拡張前に人間が確認する
- B. skeleton なし: 最初の Bolt も通常どおり実行
- X. Other (please specify)

[Answer]: A — skeleton あり(M1 + package.ts kimi + --check 通過までを最初のスライスとし、単独・ゲート付きで実行)(2026-07-25, Guide me)
