# Services — election-ts-foundation

> 上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

配布外のチームローカル CLI 群(scripts/ — architecture.md contrib overlay 節+team-practices.md Way of Working の正本/生成物分離に整合)であり、常駐サービスは持たない。「サービス」= 利用者(AI セッション/人間)から見た提供能力の単位。

## SV-1: 選挙実行サービス(C6+C1+C2+C5)

- 利用者: conductor/leader セッション(team)、solo セッション
- 提供: 選挙1件のライフサイクル完走(open→distribute→collect→tally→record)を指令ループで駆動
- 入口: `/amadeus-election` SKILL(C7)または `bun scripts/amadeus-election.ts next` 直叩き
- 人間判断点(C-01 保存): hold(tie/block/quorum-short/discussion-needed — E-ETF-FD Q1=A 裁定 2026-07-19 反映、FD reviewer Finding 5 の申告付き機械是正)指令は人間裁定を要求し、ツールは裁定の記録のみ行う

## SV-2: 記録・照合サービス(C3+C4)

- 利用者: leader(persist 文作成・ノルム PR)、ノルム PR レビュアー
- 提供: persist 文素案の生成(GoA 行・タイムライン込み)と、外部文書への照合検査(留保転記件数・票数・時系列)
- 下流互換: 生成 GoA 行は norm-metrics の蒸留ラウンド(parseGoaLine)がそのまま読める(C-08)

## SV-3: 受付台帳サービス(C2 status 面)

- 利用者: leader(未着の可視化 → 催促判断の材料)、投票者(自票の受理確認)
- 提供: 投票済み/未着一覧・後着/再審フラグの照会。ack プロトコル(dispatch-ack-required)の機械化代替(agmsg send.sh は未登録宛先でも成功を返し不達が無音になる — team.md cid:agmsg-recipient-typo の既決実測 — ため、受付台帳が配送確認の正本になる)

## 非提供(Won't 再確認)

- ノルム PR の作成・マージ(leader の既存 gh フロー — NFR-1)
- E-OC1 申告管理・Issue クロスレビュー・PM ラウンド(W-01〜W-03)
- 人間裁定の自動化(W-06)
