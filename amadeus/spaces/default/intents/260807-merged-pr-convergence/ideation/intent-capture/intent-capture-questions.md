# Intent Capture Questions — 260807-merged-pr-convergence

上流入力(consumes 全数): なし(本ステージは consumes 宣言なし — 入力は intent 記述と Issue #2401 本文・クロスレビュー2名の verdict)。

> 既決事項は質問しない(`cid:intent-capture:c1`): Issue #2401 の課題実在・機序(CLEAN 要求・mergeable 恒久 UNKNOWN・GraphQL が state を読まない)はクロスレビュー2名の独立実測で確定済み。ビジネス問題(毎 intent の override 人間裁定往復の解消)・トリガー(260807-failclosed-recovery-path での実測)・顧客(PR 先行マージ運用の Amadeus チーム)も Issue 正本に確定済み。以下は真に未決の判断のみ。

## Q1. report の方式 — マージ済み PR に何を記録するか

Issue は2案を併記し未採否。クロスレビューの設計申し送り: レビュー B は「マージ時実績の導出」の限界3点(review threads のマージ時点スナップショット不能・required/optional 区別が branch-protection 依存・admin merge で不成立)を指摘し、事実記録型が `evaluateConvergence` 単一定義(FR-3b)を保つと分析。

- A. **事実記録型 verdict `landed`**(ベース記述から縮小・レビュー B 推奨): state=MERGED を検出したら「マージ着地の事実」(mergedAt・merge SHA 等)を記録する landed report を書く。収束の遡及判定はしない
- B. **マージ時実績の導出**(ベース記述を拡大): mergeCommit の checks・threads からマージ時点の収束を再構成して converged/landed を判定(required checks の個別照合 = branch-protection 照会の実装が必要)
- C. **両対応**(拡大): landed を既定とし、導出可能な範囲で実績を付記
- X. その他

[Answer]: A(事実記録型 verdict landed)

## Q2. MERGED 検出の適用面 — どの verb が検出するか

- A. **report + status の両方**(推奨): status も state=MERGED を先行検出して landed を返し(リトライ約50秒を短絡 — レビュー B 申し送り)、report は landed report を書く
- B. **report のみ**(縮小): status は現状維持(MERGED でも unknown-exhausted)、report だけが検出
- X. その他

[Answer]: A(report + status の両方が MERGED を先行検出)

## Q3. landed report のマージ時 checks 情報の扱い

- A. **informational 記録のみ**(推奨・維持): `mergeCommit.statusCheckRollup` を参考値として report に記録するが、landed の成立条件にはしない(rollup は required/optional を区別しない弱い主張 — predicate 設計 :176-178 と整合)
- B. **記録しない**(縮小): マージの事実(人間承認済み)のみを記録し checks 情報は持たない
- C. **required checks の個別照合を成立条件にする**(拡大): branch-protection 照会を実装し、照合失敗時は landed を拒否
- X. その他

[Answer]: A(informational 記録のみ — landed の成立条件にしない)

## 裁定の記録

Q1=A / Q2=A / Q3=A — AskUserQuestion による人間回答(推奨案どおり)。
ユーザー承認: 2026-08-07T10:04:51Z
