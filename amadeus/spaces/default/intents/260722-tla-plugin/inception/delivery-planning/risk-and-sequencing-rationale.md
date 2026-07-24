# Risk & Sequencing Rationale — 260722-tla-plugin

上流入力(consumes 全数): requirements、components、unit-of-work、unit-of-work-dependency、unit-of-work-story-map、team-practices

## Sequencing の根拠(risk-first + dependency)

- **Bolt 1 = U1+U3(R4 潰し)**: モデル外部化のバイト同一性と TLC ツールチェーン一般化は本intentの検証価値の根幹。ここが壊れると以降の全価値が無効。最薄 E2E(完全探索1回)で最初に実証する
- **Bolt 2 = U5**: U2 の compile 前提(sensors 宣言の loud reject — UG レビュー確定)であるため U2 より先行必須。sensor 単独でも spec ドリフト検出の価値が立つ
- **Bolt 3 = U2(R3 潰し)**: plugin compose→compile→実行の E2E は本intentの供給形態の実証。walk 拡張(コア変更・dist 6面再生成)を含むため、依存が揃った時点で単独 Bolt として隔離
- **Bolt 4 = U4**: CI 統合は全機能着地後の外部実証面。A2(Linux 完走時間)をここで実測

## scope-document からの sequencing 変更(申告)

scope-document は skeleton = P1+P2(externalize+plugin)を想定していたが、UG レビューで U2←U3+U5 の真の依存が確定したため、skeleton は U1+U3 へ再編(Q1 ユーザー裁定 2026-07-22T13:22:07Z)。risk-first の本質(R4 を Bolt 1、R3 を Bolt 3 で早期実証)は維持。

## リスク対応の Bolt 帰属

| リスク | 対応 Bolt | 閉包条件 |
|---|---|---|
| R1(fail-closed 劣化) | Bolt 1(planner 抽象)+ Bolt 4(Docker 経路実測) | 両 planner の落ちる実証 |
| R2(イメージ供給) | Bolt 4 | temurin digest+jar チェックサムの実測固定 |
| R3(plugin E2E 未実証) | Bolt 3 | compose→compile→--single green+drop baseline 一致 |
| R4(モデル同一性) | Bolt 1 | バイト一致+完全探索1回(既知欠陥再現は build-and-test) |
