# Requirements Analysis — Clarifying Questions

上流入力(consumes 全数): business-overview.md, architecture.md, code-structure.md

> 質問の前提事実の出典: D1/D2 の二重欠陥構造と identity 符号化の3所在は codekb `architecture.md`「receipt 信頼境界の二重欠陥」節から、変更面が plugin `plugins/formal-model-check/tools/` に閉じるという境界は `code-structure.md` から採った。循環が formal-model 対象 workflow の Construction を停止させる業務影響は Issue #2913 影響・価値節が正本(codekb 未記載)。`business-overview.md` からは `:227`(形式モデル検査の早期実行/リスク後送を人間が選べる状態を守る利用者価値)と `:13-19`(formal-model-check advisory の品質ゲート価値)を Q1 の重み付け根拠として採った — 検証価値の恒常性は専用実行面でも保たれる必要があり、日常 CI への組込み可否とは独立である。

> Intent autonomy `semi` 有効中のため、本ファイルの質問は stage-protocol.md §「question under semi」に従い `amadeus-bolt decide-question` の5段梯子で裁定する(cid:scope-definition:c1-semi-ladder-routing)。人間への直接提示は行わず、`human-required` 結果のみ人間へ回る。裁定成立後に [Answer] と裁定の記録を転記する。

## Q1: production toolchain を通す author-new 統合テストの CI 接続方式

Issue #2913 の完了条件は「production toolchain を使う author-new 統合テストを追加し、fake toolchain だけではこの境界を完了扱いにしない」。RE 実測(re-scans/260812-tla-proof-receipt.md)では tests/formal-verif/** は run-tests.ts のスコープ固定(:852/:909)+ .test.ts フィルタ(:754)により構造的に CI 除外で、既存 probe(tla-referee-real-toolchain-probe.ts)は JAVA_HOME と初回 jar 取得のネットワークを要求する。統合テストをどこで実行するか。

A. 実TLC を要する統合テストは formal-model-check 専用実行面(workflow_dispatch ジョブ/ローカル mise 実行)に置き、日常 CI には TLC 非依存の受理テスト(receipt 種別の判別・fail-closed 検証 — 実TLC不要)のみ追加する
B. tests/ 直下の integration 層へ実TLC テストを置き、日常 CI で毎回実行する
C. run-tests.ts に formal-verif スコープを新設して日常 CI へ組み込む

[Answer]: A — 自動裁定(AUTO_DECIDED `auto-decision-07dea08b833e6fe4e201cd2872db401f`、basis=agent-recommendation、cid:build-and-test:two-layer-verification-posture の既決姿勢から導出)。承認: 2026-08-12T00:29:47Z

X. Other (please specify)

## Q2: D2(identity 符号化分裂)の統一方向

referee は object 形 `{bytes: base64}`(tla-referee-toolchain.ts:47)、loader/toolchain バイト照合は decoded string 形(tla-model-loader-internal.ts:279 / fs-tlc-toolchain.ts:731)。どちらへ揃えるか。

A. referee 側(1箇所)を文字列形へ揃える — 多数派(2箇所)の既存流儀に合わせ、変更面を最小化する。登録済み model-map の既存 identity 値は文字列形で計算されており無変更で済む
B. loader/toolchain 側(2箇所+model-map 既存値)を object 形へ揃える — model-map の再生成が必要
C. 双方を残し受理側で両形式を許容する

[Answer]: A — 自動裁定(AUTO_DECIDED `auto-decision-0d99913a61852b9520eaad535a6ab24e`、basis=agent-recommendation、cid:requirements-analysis:c5 既存流儀+P5 surgical+org.md Forbidden(二重受理禁止)から導出)。承認: 2026-08-12T00:29:47Z

X. Other (please specify)

## 裁定の記録

- Q1 = A / Q2 = A。いずれも `amadeus-bolt decide-question` の5段梯子で AUTO_DECIDED(decider=agent-recommendation、reviewState=unreviewed — `list-auto-decisions` で後日人間レビュー可能)。solo-election 段は native 結果不在の loud degradation を記録済み(degradedCapability: solo-election)。
- 承認: 2026-08-12T00:29:47Z(INTENT_AUTONOMY_TRANSACTION_COMMITTED ×2、audit シャード実測)
- 適用ノルム: cid:scope-definition:c1-semi-ladder-routing(semi の質問は梯子経由・人間直接提示禁止)、cid:build-and-test:two-layer-verification-posture(Q1)、cid:requirements-analysis:c5 / P5 / org.md Forbidden 二重実装禁止(Q2)
