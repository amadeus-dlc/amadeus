# Code Generation Plan — Bolt 2 budget-sensor(事後作成)

**Intent**: 260810-grilling-frontier-resync / **Stage**: code-generation / **Unit**: budget-sensor (library)

上流入力(consumes 全数): `bolt-plan.md`(Bolt 2 の Definition of Done)、`unit-of-work.md`(U2 完了条件 — 各 Step の AC 正本)、`business-rules.md`(BR-U2-1〜9)、`business-logic-model.md`(判定フロー Phase 1→4・cutoff 単一ゲート)、`domain-entities.md`(型・正本トークンの C1 参照規律)、`security-design.md`(検査モジュールの統制)、`logical-components.md`(C3/C4 の配置)、`requirements.md`(FR-CONTRACT-3/4/6・FR-PROTO-7/8 の AC 逐語)。

> 本 plan は swarm 経路の事後作成(cid:code-generation:swarm-unit-artifact-backfill — swarm worker は record を書かないため、conductor が finalize 後に実績へ基づき作成)。Step の述語は unit-of-work.md U2 完了条件の逐語(cid:code-generation:c3-260803-state-integrity — 縮小しない)。

## Steps(実績確定)

0. **ブロッカー裁定の反映(実装前停止 → 裁定 → 続行)**: builder が BR-U2-2b の検出対象(日本語見出し逐語)が着地 U1 正本に不在(出荷面 0 hit)であり、実装すると準拠ファイルが全件 FAIL する恒久赤になることを実装前に検知・停止。ソロ選挙 E-GFR-CG2 が choice B(言語中立マーカーへ統一して U1 へ追補)を 2-0 established(GoA 2x2)、ユーザー承認 2026-08-10 を得て続行。
1. **U1 正本への申告付き追補**: `grilling-protocol.md` §2.3(節規定)・§2.5(Recording obligations 箇条)・§4 表 Questions file 行、`stage-protocol.md` Step 3d・§8 接続段落の**4列挙面を同時に**追補し、`<!-- amadeus-grilling:deferred -->` を questions ファイル書き手義務として明記。刈り0件でも節+マーカー必須を本文に明記(FR-PROTO-7 の「空の明示は必要」)。骨格(§1)は不変。
2. **センサーの3トークン読取**(BR-U2-1 / BR-U2-2b): `detectGrillingMarker` の判別ユニオン3値、マーカー先頭10行窓、異形は malformed-marker warning。列挙節は本文全域でマーカー存在のみ判定(型 `{ present: boolean }`)。トークン様式の正本は C1 単一定義、センサー定数は C1 参照コメント付きの verbatim 参照。
3. **justification 検査への切替と fail-open 封鎖**(BR-U2-2 / BR-U2-3): 超過時に (a) 超過記録行 (b) 列挙節マーカー を検査し、欠落を `missing-justification` / `missing-deferred-list` の個別 error finding に。未知 depth を `unknown-depth` warning(pass 維持)へ。severity を導入し warning が pass を倒さないことを構成的に保証。
4. **cutoff の単一ゲート化**(BR-U2-8 / BR-U2-9): finding を候補として積み、`enforced` の1点で一括フィルタしてから verdict 化。`!enforced` では findings=[] かつ reason を現行語彙へ縮退。分岐途中 return を皆無にする。
5. **t415 の完全改訂**(BR-U2-6): 枝刈り表・§2.2 閾値・遮断器開示・§8 接続段落・semi 除外・SKILL の Free 既定の逐語 pin+復活禁止 pin。**対角実測**を実施。
6. **契約テストの新設**(BR-U2-4/5/7): `t530`(unit・純関数 in-process)= 3トークン述語・count 側 vacuity guard・`VALID_DEPTH_VALUES` 3値 assert / `t531`(integration・実 FS)= verdict 5態・cutoff 迂回路不在の9入力組合せ・answer-evidence 側 vacuity guard。**(ii)(iii) は落ちる実証**。TDD(公開 seam への失敗テスト1件 → Red 実測 → 最小実装で Green)を1件ずつ反復。
7. 検証: typecheck / lint / 対象テスト群 / protocol 消費テスト群 / `bash tests/run-tests.sh --ci` / `bun run build` 後の tracked 不変 / 骨格 digest 不変。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T14:02:04Z
- **Iteration:** 1
- **Scope decision:** none

実装・U1正本・新規テスト・改訂t415はマーカー方式で一貫し、cutoff 単一ゲート・fail-open 封鎖・vacuity guard 両方向・対角実測・9入力組合せの回帰不変も設計どおり実装・実測済み。ただし方式転換(BR-U2-2b 見出し逐語→言語中立マーカー)の裁定 E-GFR-CG2 が上流 FD 正本3成果物へ未反映で、FD が実挙動と矛盾した設計記述を提示し続ける。

### Findings

- BLOCKER | construction/budget-sensor/functional-design/business-rules.md:11 / business-logic-model.md:59-69 / domain-entities.md:13,17 | 刈りノード列挙節の検出述語を見出し逐語の完全一致として記述したままで、実装(amadeus-sensor-question-budget.ts:254-256 の detectDeferredSection = body.includes(DEFERRED_MARKER))および U1 正本(grilling-protocol.md §2.3)のマーカー方式と乖離。cid:code-generation:cg-invariant-conflict-explicit-revision が要求する上流 FD 正本節への申告付き改訂が未実施
- FOLLOW-UP | tests | t530/t531 が既存の別テストファイルと同一 tNNN を共有している — 改番または意図的併存の明記を申し送り
- FOLLOW-UP | reviewer | Bash 実行環境を持たないため bun test / git show による実行時再現は未実施。静的読解では claim と実装の整合を確認した(限界の開示)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T14:08:08Z
- **Iteration:** 2
- **Scope decision:** none

i1 BLOCKER(方式転換の上流 FD 未反映)の解消を確認。3成果物に同一文面の申告付き改訂ブロックが挿入され、出典・失効範囲・不変部分が一貫して明記され、実装(detectDeferredSection のマーカー方式)および着地済み U1 正本(§2.3/§2.5/§4表)と矛盾しない。非採用案トークンの無申告混入も検出されず。

### Findings

- FOLLOW-UP | code-generation-plan.md | t530/t531 の tNNN 共有は未改番のまま — 状態不変を確認
- FOLLOW-UP | reviewer | Bash 実行環境を持たないため実行時再現は未実施。静的読解(grep/git grep 実測)で対応関係を確認した限界を開示
