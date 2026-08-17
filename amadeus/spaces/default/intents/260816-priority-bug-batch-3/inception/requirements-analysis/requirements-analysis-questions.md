# Requirements Analysis — 明確化質問(intent 260816-priority-bug-batch-3)

> 裁定承認: 本ファイルの Q1/Q2 の回答は Intent Autonomy Mode = full の decide-question 梯子で AUTO_DECIDED され、2026-08-17T00:41:24Z の INTENT_AUTONOMY_TRANSACTION_COMMITTED(grant `intent-grant-ca040a2aad2575a37bc7452bfb9afa6a`)で監査へ確定済み。

対象 5 Issue はいずれもクロスレビュー2名成立済み(全件 ESTABLISHED_WITH_REFINEMENTS、2026-08-17、対象 SHA `89053172e`)で、期待結果・完了条件・実測証拠を本文に持つ。既決事項(Issue 本文・intent 発注文・ノルム)は再質問せず(cid:requirements-analysis:c5)、実質的な要件質問は以下の2件のみ。Intent Autonomy Mode = full のため、回答は `amadeus-bolt decide-question` の梯子で裁定した(cid:scope-definition:c1-semi-ladder-routing)。

## Q1: #3149 クラスB(rebase 孤児化 created)の要件射程

クロスレビュー reviewer-2(xr-260817-3149-904e57)は、クラスBの3実例(#3128 / #3130 / #3134 の孤児化 created epoch)が凍結 SHA では既に消滅している可能性を REFINED として報告した。機構ギャップ自体の実在は両レビュアー CONFIRMED。要件はどこまでを対象とするか。

A. 機構修正は両クラス(A: converged 最終化経路、B: 祖先孤児化 created の回復経路)を対象とし、intent 260815-rfc-autonomy-modes の実 unit 回復操作は本 intent のスコープ外(着地後の resume 作業)とする。クラスB実例の現存性は実装時に現行断面で再実測する。
B. クラスAのみ修正し、クラスBは再発時に別 Issue で扱う。
C. 両クラス修正に加えて rfc-autonomy-modes の resume 実施まで本 intent に含める。
X. Other (please specify)

[Answer]: A — AUTO_DECIDED `auto-decision-0968e3ed7df9b3c970b8295c50db4be0`(decider: agent-recommendation、grant `intent-grant-ca040a2aad2575a37bc7452bfb9afa6a`)。根拠: Issue #3149 完了条件が両クラスを名指しし再発性(「swarm 多 unit 配送 + レーン rebase を採る限り再発する」)を明記。resume は Issue コメント(2026-08-16)が「本 Issue の修正着地後」と規定しており消費側の別作業。intent 発注文も「着地後に resume を解除する」と同旨。

## Q2: 方式裁定(3件)の裁定時機

#3153(宣言と応答の結線方式)・#3152(冪等化方式)・#3149(CLI とセンサーのどちらを正とするか)は、いずれも Issue 本文が「方式は設計裁定」と明示する。どの段階で裁定するか。

A. application-design ステージで solo 選挙(2 fresh subagent voter)にかけ、requirements は期待結果(受け入れ条件)のみを固定する。
B. requirements 段階で方式まで仮決めする。
X. Other (please specify)

[Answer]: A — AUTO_DECIDED `auto-decision-615e7cd0b035254504a8a00b5b513cce`(decider: agent-recommendation、同 grant)。根拠: team.md P1(方式判断は選挙)、recompose 済みグリッドに application-design (2.6) が EXECUTE で存在、Issue 本文が期待結果と方式候補を分離記載。

## 質問予算の判定

上記2件以外に、6次元(機能・非機能・シナリオ・ビジネス・技術・品質)で実装を阻む要件欠落・矛盾は検出されなかった。各 Issue の期待結果・完了条件がそのまま受け入れ条件として測定可能(クロスレビューで再現手順まで確立済み)であるため、追加質問は生成しない(質問は矛盾か実装を阻む要件欠落に限る — cid:requirements-analysis:c5)。
