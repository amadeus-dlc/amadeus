# Requirements Analysis 質問（260706-engine-consistency）

対象 Issue: [#547](https://github.com/amadeus-dlc/amadeus/issues/547)、[#548](https://github.com/amadeus-dlc/amadeus/issues/548)、[#555](https://github.com/amadeus-dlc/amadeus/issues/555)

回答は各 Issue の確定記載と leader ディスパッチ（2026-07-06 14:42 JST）からの出典付き転記である。新規の人間質問はない。

現行構造の前提は上流入力の [codekb/amadeus/architecture.md](../../../../codekb/amadeus/architecture.md)、[codekb/amadeus/api-documentation.md](../../../../codekb/amadeus/api-documentation.md)、[codekb/amadeus/code-quality-assessment.md](../../../../codekb/amadeus/code-quality-assessment.md) に依る。

---

## Q1. 束ねの単位と実行順序は？

A. 1 Intent に束ね、Bolt 3 本直列（B001=#547 → B002=#548 → B003=#555）
B. Issue ごとに別 Intent
X. Other (please specify)

[Answer]: A（ディスパッチ承認要旨の転記。3 件とも「完了処理と hooks の整合」に属するエンジン整合系 bug）

## Q2. #547 の修正方式は？

A. complete-workflow に (a) Current/Next Stage = none の設定、(b) 全 [S] phase の Progress = Skipped 化 + PHASE_SKIPPED emit を追加（Issue 実施候補の転記。finalize 経路の既存規約 = amadeus-state.ts:1243 付近と同じ終端形へ揃える）
B. validator 側の期待を緩める
X. Other (please specify)

[Answer]: A（B は #546 で実測された不整合を正当化するだけで、手動整合の手戻りが残る）

## Q3. #548 の修正方式は？

A. validator の RE produces 判定へ #501 の参照解決型判定の適用範囲を拡大し、「record stub がなくても共有 codekb の実在で pass」へ追従（stub は引き続き許容 = 後方の record を壊さない）
B. stub 9 件の要求を維持し契約として明文化
X. Other (please specify)

[Answer]: A（#498 修正後はエンジンが codekb 直接解決で成立するのに validator だけが record 実ファイルを要求し続けるのは seam の残り = Issue 背景の転記。既存 stub 付き record は従来どおり pass させる互換動作とする — これは「実行時参照の構造検証」という validator の責務内の判定拡張であり、後方互換層の新設ではない）

## Q4. #555 の修正方式は？

A. PR #479 が mint-presence に入れた完了ガード（registry complete / WORKFLOW_COMPLETED で skip）と同等判定を log-subagent へ適用し、判定は lib の共通ガード関数（activeIntentIsComplete = #479 で導入済み）へ寄せる。audit へ書く他 hook にも同判定の適用可否を実測して判断
B. log-subagent 個別に判定を複製
X. Other (please specify)

[Answer]: A（Issue 実施候補 + ディスパッチ「可能なら lib へ共通ガード関数化」の転記。#479 で activeIntentIsComplete が lib に既存のため、複製ではなく共有が正）
