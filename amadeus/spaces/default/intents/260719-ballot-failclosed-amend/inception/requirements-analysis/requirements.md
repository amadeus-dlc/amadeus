# Requirements — 260719-ballot-failclosed-amend

上流入力(consumes 全数): intent-statement.md、scope-document.md、business-overview.md、architecture.md、code-structure.md、team-practices.md

実測根拠は RE 一次資料 scan-notes.md(observed 6f2455c43、コミット 18a92347d)。裁定依存欄は E-BFARA1〜3 裁定(2026-07-19 開票、record = leader ブランチ 5e96f8766)で確定済み(起草時は ruling-dependent-placeholder 運用)。

## FR-1: submittedAt の受理段 fail-closed 検証(#1252)

`Ballot.parse`(scripts/amadeus-election-model.ts:184-204)の 5 分類に `invalid-timestamp` 分類を追加し、submittedAt が受理形に一致しない ballot を受理段で拒否する。検証は regex+`Date` の二段(e4 所見: `new Date` 単独は日付のみ入力を通すため)。

- 受理形: 【E-BFARA1 裁定 = A(2026-07-19 開票、GoA 1x2 2x1)】mint 正規形限定 — regex `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$` に一致し、かつ `new Date` が有効(実在日時)な入力のみ受理。ms・TZ オフセット形は `invalid-timestamp` で拒否。
- 【留保転記(e4, GoA2)】vote 経路(election.ts:334)の normalizeAt の扱い(A 採用により恒等変換となる — 防御層として残置か除去か)は **design で明示**する。残置なら恒等であることの注記を、除去なら transport 側の mint 用途(makeDeliveryRecord :101)は維持することを design 成果物に記載する。
- 受け入れ基準: (a) `__NOW__`(Date NaN)が exit 1 (b) 「Date が NaN にならない ISO 風でない文字列」(e1 所見の例: 日付のみ `2026-07-19`)が exit 1 (c) エラー分類は既存 BallotError union の様式に整合し、CLI は `vote: <分類>` の loud エラーを返す (d) 正当な受理形は引き続き exit 0(後方互換 — R-2)。

## FR-2: 落ちる実証と遡及 sweep(#1252)

- 落ちる実証: FR-1 (a)(b) の両ケースをテストで固定し、修正前コードへの注入で赤を実測してから完成扱いにする(落ちる実証は実行時に消費される行へ — inject-runtime-consumed-lines)。
- 遡及 sweep(corpus-sweep-for-new-guards): leader worktree の elections/ 配下に**実装時点で存在する全 election ディレクトリを glob で列挙**し、全 ledger の全 ballot(保存済み submittedAt)へ新検証述語を適用して正当データが赤にならないことを実測する(両側実証)。件数は固定しない — RE 観測時点(scan-notes.md、コミット 18a92347d)で 12 件だったが選挙実施のたび増加する(レビュー時点実測 20 件)。固定件数ループでの取りこぼしを禁止する。

## FR-3: amend ballot の提出経路(#1253)

`Ballot.parse` を kind 対応に拡張し、`kind:"amend"` +`ref`(BallotRef = electionId/voter/submittedAt、model.ts:102)を受理して `AmendBallot` を生成する。vote verb(handleVote、election.ts:320-338)経由で amend が store に到達し、original と共存記録される(ADR-5 不変 — store.ts:122-124)。

- ref 検証: 【E-BFARA3 裁定 = A(2026-07-19 開票、3-0 留保なし)】fail-closed 実在照合 — 受理時に ref(electionId/voter/submittedAt)が ledger 上の同一 voter の既存 ballot(original または先行 amend)と一致することを検証し、不一致は `unknown-ref` 級の新分類で loud 拒否する。
- 受け入れ基準: (a) kind 省略・kind:"original" の既存 ballot 挙動は完全不変 (b) kind:"amend" が vote verb で受理され ledger に kind=amend で記録される(閉包テスト — 現状は model.ts:194 の kind 固定により構造的不可能であることの反転) (c) timeline に `ballot amendment: <voter>` が記録される(store.ts:167 既存分岐の疎通) (d) 手書き `kind:"amend"` 入力が original に落ちる現行動作(e4 所見)の消滅をテストで固定。

## FR-4: amend の tally 解決規則(#1253)

- 解決規則: 【E-BFARA2 裁定 = A(2026-07-19 開票、3-0 留保なし)】per-voter 最新1票 — tally 母集団構成時に voter ごとに submittedAt 最新の1票(同時刻なら amend 優先)だけを採用する。ledger 上の共存(ADR-5)は不変で、集計だけが解決される。
- 受け入れ基準(裁定に依存しない部分): (a) 同一 voter の original+amend 共存時に票が二重計上されないことをテストで固定(現状 model.ts:321-337 の kind 非区別全走査の反転) (b) verify(election.ts:440 recompute)と tally が同一の解決済み母集団を使い、乖離が生じない (c) classifyLate(model.ts:296-298)との整合は裁定形に応じて design で確定。

## FR-5: 検証 green 維持(M-5)

`bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` green。PR 前 deslop+lcov 実測(local-lcov-pre-push)。修正面は scripts/amadeus-election-*.ts+tests のみ(dist 投影 0件 — RE 実測により dist:check/promote:self:check 非該当)。t238 は触らない(W-1)。

## NFR

- NFR-1(エラー様式): 新分類のエラー文字列は既存 5 分類の命名様式(kebab 小文字)に従い、fail-closed の分類順序を Ballot.parse 内で明文コメント化する。
- NFR-2(テスト層): 新規テストは実 FS を使う検証を integration 層(t235 系)、純関数検証を unit 層(t234 系)に置く(fs-tests-integration-first)。in-process 駆動で lcov 有効化(spawn 盲点回避)。
- NFR-3(互換): 受理拡大・受理厳格化のいずれも、既存 12 選挙の保存済みデータの load/verify を壊さない(FR-2 の sweep で実証)。

## トレーサビリティ

M-1/M-2→FR-1/FR-2、M-3→FR-3、M-4→FR-4、M-5→FR-5。W-1〜W-6(scope-document)は本要件のスコープ外を確定する。intent-statement の Success Metrics 1→FR-1/2、2→FR-3/4、3→FR-5。
