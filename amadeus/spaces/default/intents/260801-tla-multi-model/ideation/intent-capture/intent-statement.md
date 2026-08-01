# Intent Statement — 260801-tla-multi-model

上流入力(consumes 全数): `intent-capture-questions.md`(Q1=A / Q2=C / Q3=A、ユーザー承認)。参照: Issue #1921・#1920(クロスレビュー2名ずつ成立)

## Problem Statement

model-map v2 は「モデル名から `specs/tla/<name>.tla`/`.cfg` の2ファイルを機械導出して identity ピンする」単一モジュール世界観で設計されており、意味論の本体を持つ補助モジュール(`MirrorLifecycleCore.tla` 648行)が drift 監視から漏れている(#1921 — 遷移定義本体の改変でもガードが沈黙することを独立2名が scratch 再現で確認)。同じ世界観の下で、TLC の run/verify 実行経路は FormalElection 専用に固定されており、登録済みの MirrorLifecycle を恒常 CI ジョブで検証できない(#1920)。**同根の欠陥のため、片方だけの修正は非対称を残す**(Core 未ピンのまま TLC が走る / ピンしても実行系が載らない)。

## Target Customer

- 第一の受益者: Amadeus 開発チーム自身(self-development)。drift ガードの保証が「モデル意味論が実装と無関係に変わることの検出」として実質を伴うこと、および TLA モデルの検証が CI 恒常証跡として残ること。
- 間接の受益者: formal-model-check plugin の将来の利用者(第3モデル追加時に同じ落とし穴に遭遇しない)。

## Success Metrics(Q3=A の3点)

1. CI の formal-model-check ジョブ(workflow_dispatch)が MirrorLifecycle AsIntended を完全探索で green(completion marker + state 統計付き、cid:application-design:finite-exploration-not-detected-proof 準拠)
2. drift ガードが `MirrorLifecycleCore.tla` への意味論編集を赤で検出する(落ちる実証)
3. FormalElection 側の検証結果・frozen model receipt identity が不変

## Initiative Trigger

intent 260731-formal-verif-value-chain u7 で model-map v2(複数モデル drift 監視)が着地し、MirrorLifecycle が登録された。その際のユーザー裁定(2026-08-01、案1: drift 監視まで + 別 Issue)で切り出された残件が #1920 であり、u7 実装中に発見されたピン漏れが #1921。クロスレビューで両者が同根(単一モジュール世界観)と確定したため、バッチで対応する。

## Initial Scope Signal

self-feature(ユーザー明示指示「まとめて対応してほしい」による。#1921 bug + #1920 enhancement の混在バッチ)。brownfield 既存 plugin の拡張で、新規パッケージ・新配布経路は伴わない。

## 確定した境界(Q1=A / Q2=C)

- `tla-arm.ts:322-332` の `TLA_NAMED_INVARIANTS`(FormalElection 固有 frozen 集合)の unpin を本 intent に含める(#1920 AC「両モデルで落ちる実証」の充足条件)
- #1921 の方式: 明示宣言(モデルエントリに補助モジュール identity 配列)を正とし、EXTENDS/INSTANCE の静的推移解決で宣言漏れを検出して赤にする併用案(宣言漏れによる無音化の再発を構造的に塞ぐ)
