# Requirements Analysis — 明確化質問

Intent: `260814-autonomy-stop-fixes`(scope self-fix, depth Minimal)

対象 Issue: [#3016](https://github.com/amadeus-dlc/amadeus/issues/3016)(park 一律拒否)、[#2974](https://github.com/amadeus-dlc/amadeus/issues/2974)(error 受領時の発明質問。クロスレビュー収束 REFRAME_REQUIRED)

承認エビデンス(E-OC1): 2026-08-14T08:04:12Z — Q1〜Q3 は semi 梯子 AUTO_DECIDED(決定 Id は各 Answer 行に記載)、Q4 は本セッションの実 HUMAN_TURN によるユーザー裁定。ゲート承認はユーザーが Approve を選択(同セッション)。

質問は「矛盾または実装を阻む要件欠落」に限定した(`cid:requirements-analysis:c5`)。既決事項(Issue 本文・クロスレビュー確定リフレーム・grant 不変条件)は再質問しない。前提事実は RE 成果物 `codekb/amadeus/re-scans/260814-autonomy-stop-fixes.md` の実測に基づく。

## Q1: #3016 の修正方式(park の human provenance 検証の置き所)

RE 実測: 患部は `amadeus-state.ts:1579` `handlePark` のガード1点(判定入力は `Construction Autonomy Mode` のみ)。fresh 判定の既成部品として `freshHumanRetryTurn` / `latestHumanTurnId` / `AutonomyProvenanceScope` が `amadeus-intent-autonomy-production.ts` に存在。Abort park / REPAIR_STALLED park はこのガードを通らない経路非対称が既にある。

A. `handlePark` に provenance 検証を追加する — orchestrate `park` 経路が本 intent shard の未消費 fresh HUMAN_TURN を実測し、その識別子を state 層へ渡して検証する(fail-closed: turn 不在・消費済み・使い回しは従来どおり拒否)。既存部品を再利用し、認可判定を Intent 監査由来の事実へ寄せる
B. `handlePark` 内で暗黙に presence ledger を読み fresh 判定する — 引数追加なし。呼出面の変更は最小だが、Stop hook 等の他経路から呼ばれた場合も同じ暗黙判定が走り、経路の意図(unattended か否か)を区別できない
C. ガード自体を Intent 監査の authorization へ付け替える — `Construction Autonomy Mode`(派生投影)を判定入力から外し、grant の authorizeInteraction 系で判定する。最も規範整合だが変更範囲が広く self-fix の surgical 原則と緊張する
X. Other (please specify)

[Answer]: A — semi 梯子 AUTO_DECIDED `auto-decision-ad565eecaf98dc889c37b77f19c66840`(decider: agent-recommendation)。orchestrate `park` 経路が本 intent shard の未消費 fresh HUMAN_TURN を実測し、識別子を state 層へ渡して fail-closed 検証する。

## Q2: #2974 の修正範囲(どの面まで本 intent で修正するか)

RE 実測: (i) `error` アーム文言は core に正本なく 8 ハーネス表層で 3 系統に drift(完全形5 / 短縮形2 / 逐語指示なし1)。(ii)「approval boundary」の定義は全域に存在しない。(iii) 破られた条項は `cid:scope-definition:c1-semi-ladder-routing` で、梯子実装は `amadeus-bolt.ts:1019-1035` に既存。

A. 3面すべて — (1) error アーム文言を core 正本化または 8 面同期で強化(「message 逐語出力して停止。新規質問を発明しない」)、(2) approval boundary の定義と Intent grant との優先順位を文書へ明文化、(3) full/semi 下の remote write 可否判断を decide-question 梯子へ流す配線
B. (1)+(2) のみ — 文言強化と boundary 定義。梯子配線は別 intent へ先送り
C. (1) のみ — 表層文言の同期強化に限定
X. Other (please specify)

[Answer]: A — semi 梯子 AUTO_DECIDED `auto-decision-4f410adfe2c0d87c86b5991208b28fb8`(decider: agent-recommendation)。3面すべてを本 intent で修正する。ただし (2)(3) の内容は Q4 のユーザー裁定(C 案)に従う。

## Q3: #3016 のクロスレビュー未成立の扱い

team.md: Issue-first の Issue は起票者以外2名の独立クロスレビュー成立まで実装バッチへ組み込まない。#3016 はコメント0件(gh 実測)。

A. 本 intent 内で実施 — 2体の独立レビュアー(fresh subagent)で検証し、コメント投稿は人間承認を得てから行う。成立後に #3016 の実装へ着手する
B. ユーザーが別途実施 — 本 intent は #2974 のみ先行し、#3016 は成立後に着手
C. 今回に限り免除して実装へ進む(ノルム逸脱のため明示裁定が必要)
X. Other (please specify)

[Answer]: A — semi 梯子 AUTO_DECIDED `auto-decision-bd29ce7481091ebc50ad86aea5eac2ab`(decider: agent-recommendation)。本 intent 内で2名独立クロスレビューを実施し、GitHub へのコメント投稿は人間承認後(Q4 裁定成立までは現行契約どおり)。成立後に #3016 実装へ着手。

## Q4: remote write(push / PR create)の effect 分類(#2974 の修正 A 面の前提)

`docs/reference/24-intent-autonomy.md:79-84`: grant は `new-permission` / `irreversible` を認可できない。push・PR create をどの分類に置くかで、full grant 下の unattended 到達性が決まる。`pr-convergence.md` の「Ask before writing to the remote」という既存のユーザー可視契約に触れるため、変更すれば仕様変更に該当しうる。merge は人間専権のまま(不変)。

A. push / PR create / レビュー返信・resolve / Issue 起票は grant の scope 内で自律実行可能な分類とし、decide-question 梯子の裁定で実行する(human-required が返る場合のみ人間へ)。pr-convergence の Guardrail 文言もこれに合わせて改訂する(仕様変更を含む)
B. 従来どおり human-required を維持 — full grant でも remote write は人間承認。代わりに engine/契約側で「typed halt(発明質問ではなく型付き停止)」として一貫させる
C. 二値にしない — remote write のたびに decide-question 梯子へ流し、裁定結果(auto/human)を監査に残す。Guardrail の「ask」を「梯子へ諮る」と再定義する(クロスレビュー reviewer-2 の提案)
X. Other (please specify)

[Answer]: C — ユーザー裁定(2026-08-14 本セッション HUMAN_TURN、「自動判定に任せる (推奨)」を選択)。remote write(push / PR create / レビュー返信・resolve / Issue 起票)は毎回 decide-question 梯子で裁定し、監査に記録する。human-required が返る場合のみ人間へ。Guardrail の「ask」は「梯子へ諮る」と再定義する。merge は人間専権のまま不変。
