# 設計過程分析 — なぜ 789行が 18,342行になったか(260713-swarm-driver-migration)

上流入力(consumes 全数): 本 record の `inception/units-generation/unit-of-work.md`・`inception/application-design/decisions.md`・`inception/requirements-analysis/requirements.md`・`ideation/scope-definition/intent-backlog.md`・audit シャード、PR #982(origin/codex/swarm-driver-integration)

実施: 2026-07-17、architecture-reviewer 委任分析+conductor(e1)による中核3主張の verbatim 追認。数値はすべて実行コマンド出力からの転記。

## 実測サマリ

- 対象: swarm 系正本 25ファイル / **18,342行**(dist コピー除く)vs 置換対象の現行 `amadeus-swarm.ts` **789行**(約23.2倍)
- うち**ライブ配線分 3,437行**(swarm finalize 経由で実働: amadeus-swarm.ts 1,131+referee-finalize 959+finalize-contract 487+canonical 81+operation-claim 102+armed-process 677)— 旧比4.4倍、ADR-003/004 の正当化あり
- うち**休眠分 15,582行(84.9%)**: driver スタック(contract 1,744 / lifecycle 1,550 / runtime 1,551 / store 870 / adapter-contract 670 / native-process 2,360 / native-resources 2,198 / native-capture 734 / native-disposal 882 / native-execution 1,345 / native-recovery 356 / operation-journal 346 ほか)— エントリ `amadeus-swarm-driver.ts` への import は **repo 全域で0件**(機械確認)。adapters 3種は全て `REGISTRATION_SLOT_UNIMPLEMENTED` の fail-closed プレースホルダ

## 問1: 規模決定点とガードレール不作動の機序

規模は `inception/units-generation/unit-of-work.md:20-27` の Unit 表で確定した。ただし規模欄の見出しは verbatim「**相対複雑度**」(S/M/L/XL)で、**数値見積は record 全体でゼロ**(行/LOC/規模 の grep 0件)。reuse inventory は `application-design/decisions.md:14` の1文のみで、既存789行の再利用/置換の棚卸し表は不在。さらに `ideation/scope-definition/intent-backlog.md:5` が規模バジェット未確定を明記しており、inception ガードレールの停止条件「(バジェット)超過は承認ゲートで停止する」は**前提不成立で構造的に不発火**だった。

## 問2: 過剰設計の導出元 — 要件は妥当、AD レビュー反復が超過を生んだ

`requirements.md:113-117` の FR-11〜FR-15(4ハーネス native driver 統合)はテスト可能な実要件で、要件段の膨張ではない。しかし着地物は FR 本体を**0行も実装せず**、足場(契約・型・ライフサイクル)だけが 15,582行を占めた。

発生源は application-design のレビューループ(`decisions.md:348-369`): reviewer の堅牢性指摘(lease・fencing token・process group・crash resume)への応答で機構を積み増し、**規模を問う観点がレビューに存在しない**まま、iteration 2 も NOT-READY(reviewer_max_iterations 到達)で「reviewer反復上限後の修正であるため、独立したREADY判定は追加していない」(`decisions.md:369` verbatim)と自認した状態で GATE_APPROVED(audit 実測: Awaiting 09:46:12Z → Human Turn 10:20:14Z → Approved 10:20:23Z)→ 次段へ伝播した。

## 問3: 適正規模の見立て

engine の invoke-swarm が今日必要とするのは「conductor の Task fan-out 後の finalize referee(収束判定・merge・監査)」であり、これは**ライブ配線分 3,437行に一致**。過大の実体は「使われる保証のないまま先行フル実装された native driver 統合の足場 15,582行」。

## 問4: プロセス教訓(E-PM9 候補 N1〜N3 として台帳収載済み)

- N1【units-generation】規模列に概算行数レンジ(S=~200/M=~500/L=~1000/XL=~2000 等)を必須併記し、バジェット未付与でも「合計見積 vs 直前正本行数」比をゲート報告に機械記載する
- N2【AD gate】reviewer_max_iterations 到達の NOT-READY 提出は残指摘を「未解消リスク」として明示し、規模拡張系ならユーザーへ追加ラウンドを諮る — 到達を自動承認対象から外す
- N3【CG approve】新規正本のうちエントリポイント到達不能行が追加行の~50%を超える場合、配線 intent の確約明記なしにゲートを通さない — 未配線体積の機械検出

既存ノルムとの差分: inception の規模正当化条項は存在したが「数値化の強制」と「バジェット前提」が抜けて実効せず、「未配線体積」を見る検査は存在しなかった(mirror-merge-before-approve は実装の本線実在は見るが配線は見ない)。
