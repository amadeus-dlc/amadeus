# Initiative Brief — 260801-tla-multi-model

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../scope-definition/scope-document.md`、`../scope-definition/intent-backlog.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`(optional consumes のうち実在分)

## 概要

model-map v2 の単一モジュール世界観に起因する同根の2欠陥をまとめて解消する: (1) `MirrorLifecycleCore.tla` 等の補助モジュールが identity ピン対象外で drift ガードが空洞化(#1921)、(2) TLC run/verify が FormalElection 専用で MirrorLifecycle を恒常 CI に載せられない(#1920)。クロスレビュー独立2名ずつで実在確認済み(#1921 ESTABLISHED / #1920 ESTABLISHED_WITH_REFINEMENTS)。

## スコープ

- S1: model-map v2 へ補助モジュール identity 配列(optional)追加 + EXTENDS/INSTANCE 静的推移解決による宣言不一致の赤化 + MirrorLifecycle への Core 宣言(Q2=C 併用)
- S2: tlc-toolchain / tla-arm(`TLA_NAMED_INVARIANTS`、Q1=A 包含)/ loader / CI port の複数モデル対応、CI で MirrorLifecycle AsIntended 完全探索(SD Q1=A 既定=全登録モデル逐次)
- S3: FormalElection 側の結果・receipt identity 不変の pin(成功3点 (iii))
- Out: AsImplemented/Vacuity 恒常化、第3モデル登録、CI トリガ変更、v3 スキーマ

## 実現性・制約

実現性 高(toolchain 実績済み・変更面限定)。主要制約: C1(receipt 不変)/ C2(workflow_dispatch 維持)/ C4(TLA_NAMED_INVARIANTS unpin)/ C5(loader 無引数ピン :10-13 の改訂裁定)。主要リスク: R1(CI 完全探索の時間超過 → まず実測、超過時のみ time-box 後続裁定 FE Q1=A)、R2(推移解決の偽赤 → 抽出規則固定+偽赤テスト)。

## 成功3点(Q3=A)

1. CI formal-model-check が MirrorLifecycle AsIntended を完全探索で green(completion marker + state 統計)
2. drift ガードが Core への意味論編集を赤検出
3. FormalElection 側の検証結果・receipt identity 不変

## 体制・進行

ソロモード + 常任グラント `3364aa0b`(stage-gates + phase-boundary、12h、2026-08-02T03:15Z まで)。self-feature 18 ステージ。Brownfield、変更面は plugins/formal-model-check/ + scripts/formal-verif/ + .github/workflows/ci.yml + tests/。
