# Requirements — 260720-ballot-received-at(Issue #1262)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md

> 測定 ref: 本書の file:line は observed HEAD `37f8cf5e6`(RE 鮮度ポインタと同一)。一次資料 = `amadeus/spaces/default/codekb/amadeus/re-scans/260720-ballot-received-at.md`。
> business-overview.md: 通読のうえ本文裏付けには**不参照(N/A)** — 同文書は過去 intent の業務境界履歴で選挙 CLI 言及 0件(grep 実測)。本 intent の文脈は Issue #1262+E-BFARA1 実データ+RE record が一次資料。architecture.md(選挙 parse 資産・配布境界)と code-structure.md:427(「`scripts/` と `tests/` は dist へ一切コピーされない」verbatim)は §2/§5 で実参照。
> consumes 宣言の残り3点(intent-statement / scope-document / team-practices): **N/A** — bugfix degrade により ideation・practices-discovery が SKIP、当該成果物は本 record に不在(find 実測)。

## 1. Intent 分析

[Issue #1262](https://github.com/amadeus-dlc/amadeus/issues/1262)(bug / P2 / S3-MAJOR、クロスレビュー成立)の修正。agmsg 中継票の受理時刻がどこにも記録されず、timeline の ballot イベント `at` が自己申告 `submittedAt` のため、中継遅延で timeline が非単調になり `verify`(timeline-order 検査)が**正当な選挙を完走不能**にする。本日の実運用で E-BFARA1〜3 が実際に停止し、leader の手正規化+ユーザー承認で回避した(コミット 5e96f8766「re-sorted by 'at' ascending; no timestamp values changed」)— この回避運用の恒久解消が目的。

原因の所在: intent 260718-election-ts-foundation の**設計**(中継/直接混在の受理順が要件・テストで未固定。申告時刻と受理時刻の2軸が単一 `at` に畳まれた — distributed/tallied は機械時刻を使う非対称 = symmetric-pair-review クラス)。

## 2. 現状の実測(RE 確定事実)

- `store.ts:156`(late)/`:166`(normal)= verbatim `at: ballot.submittedAt`。受理側機械時刻の記録は全域 0件(`grep -rc receivedAt` = 0、反証確認済み)。
- 対称面: distributed = election.ts:304(配信側機械時刻)、tallied = store.ts:228(受理側機械時刻 `talliedAt`)。
- verify 経路: verifySelf(record.ts:179-183)が隣接 at の辞書式単調を検査 → handleVerify(election.ts:456-457)fail → exit 1 → 状態機械が recorded へ遷移不能。
- classifyLate(model.ts:296-297)= `ballot.submittedAt <= tallyTime`(申告軸)。
- 回帰実データ: E-BFARA1 ledger 受理順 `[e1@22:10:03Z, e4@22:10:42Z, e3@22:10:29Z]`(e3 が agmsg 中継遅延)→ at=submittedAt 直列で非単調。非単調は E-BFARA1/2/3 に限局。
- テスト: ballot 同士の非単調型は未固定(t238:169-176 は tallied-before-ballot 型のみ)。receivedAt 系テスト 0件。
- e2 交差: 同一3ファイル(election.ts handleVote / store.ts appendBallot / model.ts)で高交差 — **直列合意済み(e2 先行着地 → e1 再接地)**。

## 3. 機能要件

- **FR-1(受理時刻の記録と検査軸)**: 【E-BRARA1 裁定 = A(00:33:48Z 開票、3-0)】TimelineEvent に **receivedAt フィールドを追加**し、verifySelf の単調性検査を受理軸へ移行する。`at` は申告値のまま表示用に保存(FR-6 と整合)。【留保転記(e3, GoA2)】フィールド追加は **canonical 1定義(TimelineEvent — E-ETF-BT で canonical lift 済み)への追加1点から導出**し、描画側は単調性検査と遅延可視化に必要な面のみ更新する(不要な renderer への一律表示展開はしない — 波及最小化)。いずれの方式でも受け入れ基準: E-BFARA1 の受理順実データ([e1@22:10:03, e4@22:10:42, e3@22:10:29])で verify が **pass** すること(現行コードでは timeline-order fail — 回帰の固定点)。
- **FR-2(受理時刻の採取点)**: 受理時刻は distributed(transport.ts:148)/tallied(election.ts:354)の既習機械時刻様式に揃えて mint する(採取点の関数配置は plan で確定 — 様式の新規発明禁止)。Date.now 直呼びは既存の normalizeAt funnel 経由の seconds-ISO に正規化。
- **FR-3(classifyLate 軸)**: 【E-BRARA2 裁定 = A(00:33:48Z 開票、3-0)】classifyLate も**受理軸へ移行**する(late = 受理が tally 後)。e2 の per-voter 最新解決(submittedAt 軸)は独立に維持。【留保転記(e4, GoA2)】store.ts:146-150 の null-fallback(classifyLate が null でも late 扱い)は移行後に死码化しうる — **design で机上トレースし、死码化する場合はコメント化でなく削除まで含めて裁定**する(消費されない分岐の残置は検証劇場 Forbidden の隣接クラス)。
- **FR-4(既存 record 互換)**: 【E-BRARA3 裁定 = A(00:33:48Z 開票、3-0)】**遡及なし・シムなし** — 既存 record は完了済み監査記録として再検証対象外とし、根拠を NFR-4 に明文化。【留保転記(e4, GoA2)】**移行窓(修正着地前に open し着地後に verify へ到達する in-flight 選挙)の扱いを design で明示**し、transient-state-fixtures 準拠の fixture を置く。『新規選挙にのみ新軸適用』の判別(receivedAt フィールドの有無等)は事実上1点の読み分岐であり、**その1点に限り** NFR 根拠を明文化する(それ以上の fallback シムは書かない)。
- **FR-5(テスト)**: (a) E-BFARA1 実データを verbatim 転写した回帰 fixture(中継遅延順の受理)で「修正前 fail / 修正後 pass」の両側を実証(落ちる実証は E-GMECG 追補準拠 — fix コミット後・SHA 明示復元) (b) 既存 t238 timeline-order(tallied-before-ballot 型)のグリーン維持 (c) 閉包: 起票の完走不能経路(verify exit 1)が実データで解消することを in-process 実測。
- **FR-6(申告値の保存)**: submittedAt は申告値として ballot 上の保存を維持する(改変・破棄しない — 監査 trail)。

## 4. 非機能要件

- **NFR-1(決定性)**: verify の recompute 経路は同一 store に対し決定的。受理時刻 mint は受理操作の1回のみ(再実行で変わらない — store 永続値を正とする)。
- **NFR-2(fail-closed 維持)**: timeline-order 検査は撤廃しない方向を既定とし(Q1=C は非推奨提示)、検査の意味(改竄・破損検出)を保つ。
- **NFR-3(CI)**: typecheck / lint / tests --ci green。配布面なし(scripts/tests は dist 非対象)。
- **NFR-4(遡及なしの根拠 — E-BRARA3=A)**: 既存選挙 record を verify し直す運用は存在しない(完了済み選挙は recorded 状態で終端し、E-BFARA1〜3 の手正規化はユーザー承認済みの是正として正)。よって読み側 fallback シムは書かず、新軸適用の判別は「receivedAt フィールドの有無」の1点の読み分岐に限定する(移行窓の in-flight 選挙の扱いは design で明示+transient fixture — FR-4 留保)。

## 5. 制約

- 修正面: scripts/amadeus-election-{model,store,record,transport}.ts+election.ts+tests/。**e2 先行着地 → 本 intent は e2 PR 着地後に base-advance-regrounding で CG 着手**(直列合意済み)。
- Bolt 単一・スカッシュ・no-AI-merge。

## 6. 前提

- E-BFARA1〜3 の手正規化済み record は正(FR-4 の裁定に依らず書き換えない)。
- e2 の 6分類化・resolveBallots・SUBMITTED_AT_RE が先に main へ入る前提で設計する(再接地時に実 diff で統合)。

## 7. スコープ外

- e2 管轄(#1252/#1253: 受理検証・amend)。tie 語彙(#1267)。蒸留系(#1254/#1255/#1257)。
- 過去 record の書き換え(Q3=C 裁定の場合を除く)。

## 8. 未決事項

なし — Q1〜Q3 は E-BRARA1〜3(2026-07-20 開票 00:33:48Z、各 3-0 採用)で全て裁定済み。留保3件(Q1/Q2/Q3 各1件、全て GoA2)は questions の [Answer] と FR-1/FR-3/FR-4 へ verbatim 転記済み。
