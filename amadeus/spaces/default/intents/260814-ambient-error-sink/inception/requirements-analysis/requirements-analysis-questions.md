# Requirements Analysis — 質問(260814-ambient-error-sink)

> Issue #3004(改訂済み本文)とクロスレビュー xrev-260814-3004(2名 ESTABLISHED_WITH_REFINEMENTS)、RE(re-scans/260814-ambient-error-sink.md)で大半は既決。既決事項は再質問しない(cid:requirements-analysis:c5)。Intent autonomy = full のため回答は decide-question 梯子で裁定(cid:scope-definition:c1-semi-ladder-routing)。

> 承認: Intent autonomy `full` グラント(intent-grant-ab1af9250c0907bad4e3359d4f4f81a8、実 HUMAN_TURN 由来、2026-08-14T03:20:00Z 頃付与コミット)に基づく AUTO_DECIDED 裁定。Q1 = auto-decision-da2eb78a8d8aaad340a368144b1dfe51、Q2 = auto-decision-25cf19b07d985cf5838383fb3b41fc78。

## Q1: 修正方式(Issue 期待結果1「方式は設計裁定」の裁定)

- A. RE 候補 A: main が dispatch 前に `resolveProjectDir` で解決(CLI の ambient 解決は意図挙動として不変)+ in-process 入口は `projectDir === undefined` を検出し ambient に触れない拒否(`emitStateNeutralError` 形、`recordError=false`)で early return。t214/t258 の契約7条を green のまま満たし、`resolveProjectDir(projectDir)` 直接解決の22面を入口で一括に閉じる。#839 契約不変(推奨)
- B. 候補 B(判別ユニオン化のみ)— emit 集約点しか閉じず完了条件1を満たさない
- C. 候補 C(recordEngineError の explicit-only 化)— t214 T1/T2 を赤にする契約変更(仕様変更としてユーザーエスカレーション事項)
- X. Other (please specify)

[Answer]: A(AUTO_DECIDED auto-decision-da2eb78a8d8aaad340a368144b1dfe51)

## Q2: handlePark(非 export、main 経由のみ)の扱い

- A. main の事前解決で undefined 到達経路が消えるため、シグネチャを `string` へ狭めて無効状態を表現不能化(ランタイムガードは export 済み3入口のみ)(推奨)
- B. handlePark にもランタイムガード(非到達コードの防御分岐)
- X. Other (please specify)

[Answer]: A(AUTO_DECIDED auto-decision-25cf19b07d985cf5838383fb3b41fc78)
