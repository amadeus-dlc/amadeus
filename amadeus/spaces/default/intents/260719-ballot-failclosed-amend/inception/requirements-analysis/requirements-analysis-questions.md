# Requirements Analysis — 明確化質問(260719-ballot-failclosed-amend)

<!-- E-OC1 選挙不要判定ヘッダ -->
> **判定**: 全3問とも**選挙必須**(真に未決の設計判断 — E-OC1 選挙不要判定の対象外)。leader へ blind 選挙の開催を依頼(2026-07-19T20:37Z 頃)。裁定受領後に [Answer] を記入する(election-answer-after-ruling)。
> 実測コンテキストは scan-notes.md(RE 一次資料、コミット 18a92347d)に依拠。各問の判断材料は推奨を伏せた中立事実のみ記載(アンカリング防止)。
> 裁定受領: E-BFARA1〜3 開票(leader 通知 2026-07-19T22:18:34Z、record = leader ブランチ 5e96f8766 の elections/E-BFARA{1,2,3}/record.md)。

上流入力(consumes 全数): intent-statement.md、scope-document.md、business-overview.md、architecture.md、code-structure.md、team-practices.md

## Q1: submittedAt の受理形(FR-1 の確定条件)

実測コンテキスト: normalizeAt(transport.ts:87-91)は handleVote(:334)で受理後に適用され、ms 除去・TZ→UTC 変換を行う(t239:125-129 が4挙動をピン)。保存済み corpus 全12選挙の submittedAt は全て秒精度 UTC 形(保存は正規化後のため入力側の実様式は不明)。e4 クロスレビュー所見: `new Date` 単独は日付のみ入力(`2026-07-19`)を通す。

- A. mint 正規形限定 — regex `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$` に一致し、かつ `new Date` が有効な入力のみ受理(ms・TZ オフセット形は拒否。normalizeAt は形式保証済み入力の恒等変換になる)
- B. ISO-8601 幅広受理 — regex は日付+時刻+(ms 任意)+(Z or ±TZ)を許し、`new Date` 有効性と併せて受理後 normalizeAt で正規化(現行の寛容入力+正規化の挙動を保存し、非 ISO 形だけを遮断)
- C. その他(note に方式明記)

[Answer]: A(E-BFARA1 裁定 2026-07-19 開票、GoA 1x2 2x1。留保転記(e4, GoA2): vote 経路(election.ts:334)の normalizeAt の扱い — 恒等の防御層として残置か除去かを design で明示。残置なら注記、除去なら transport 側 mint 用途は維持)

## Q2: amend の tally 解決規則(FR-4 の確定条件)

実測コンテキスト: tally(model.ts:321-337)は ballots を kind 非区別で全走査(共存時は同一 voter 二重計上)。verify(election.ts:440)も同一母集団で recompute するため二重計上を検出できない。ADR-5(store.ts:122-124)は「original は上書きしない・両方 ledger に残る」を既決とする(集計規則は未決)。

- A. per-voter 最新1票 — tally 母集団構成時に voter ごとに submittedAt 最新の1票(同時刻なら amend 優先)だけを採用。ledger 上の共存(ADR-5)は不変、集計だけが置換される
- B. amend 非計上 — amend は集計母集団に入れず、record のタイムライン注記のみ(裁定への反映は人間の再集計判断)
- C. その他(note に方式明記)

[Answer]: A(E-BFARA2 裁定 2026-07-19 開票、3-0 留保なし — per-voter 最新1票・同時刻 amend 優先)

## Q3: amend の ref 検証の深さ(FR-3 の確定条件)

実測コンテキスト: BallotRef = { electionId, voter, submittedAt }(model.ts:102)。store の受理(appendBallot)は amend を dup 判定から除外するのみで ref の実在は見ない(store.ts:131-133)。

- A. fail-closed 実在照合 — 受理時に ref が ledger 上の同一 voter の既存 ballot(original または先行 amend)と一致することを検証し、不一致は新エラー分類(unknown-ref 級)で拒否
- B. 形式検証のみ — ref の3フィールドの型・様式だけ検証し、実在照合はしない(存在しない ref の amend も受理される)
- C. その他(note に方式明記)

[Answer]: A(E-BFARA3 裁定 2026-07-19 開票、3-0 留保なし — fail-closed 実在照合・unknown-ref 級 loud 拒否)
