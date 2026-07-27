# Requirements — 260726-mirror-state-split(Issue #1547 + #1534)

上流入力(consumes 全数): business-overview.md(auto-mirror 状態追跡の構造的不成立の事業影響)、architecture.md(mirror write⇔read 経路の Interaction 図)、code-structure.md(患部配置と配布13コピーの増幅構造) — いずれも `amadeus/spaces/default/codekb/amadeus/` の 260726-mirror-state-split 断面(observed `f9a0fb86a`)を本文の各 FR の根拠引用に使用。

## Intent 分析

mirror の状態表現が2系統に分裂している(write = `amadeus:mirror-state:v1` ブロック / read = legacy「Mirror Issue」フィールド)。このため guarded create が成功しても status・orchestrate 境界判定・重複 create ガードは「ミラー無し」と誤読し、(a) `mirror-missing` 偽陰性 (b) 重複 create ガード素通り→provenance 拒否による誤診 (c) legacy 世代 10 record の恒久 safety-blocked、を生む。**目標は状態表現の単一権威(v1 ブロック)への統一**であり、新機能の追加ではない(バグ修正 = 文書化済み仕様への回復)。

- 種別: バグ修正 / スコープ: amadeus-bugfix / 深度: Minimal
- 対象: `packages/framework/core/tools/amadeus-mirror.ts`・`amadeus-orchestrate.ts`(読み手3箇所)+ 対応テスト + 配布同期
- 裁定: Q1 = A(requirements-analysis-questions.md「裁定の記録」参照 — 復旧 verb なし、legacy デッドコード削除、#1534 は文書化クローズ)

## 機能要件

### FR-1: status 読取の v1 権威化
`buildSnapshot`(`amadeus-mirror.ts:169` `const mirrorRaw = getField(stateContent, "Mirror Issue");`)を廃し、snapshot の mirrorIssue を v1 ブロック(`parseMirrorStateDocument` / `readMirrorState` — `amadeus-mirror-state-codec.ts:1301`、`amadeus-mirror-state-store.ts:91`)の `issueNumber` から導出する。
- 受け入れ基準: guarded create が v1 ブロックへ issueNumber を永続化した record に対し `status` が `mirror-missing` を報告しない(FR-5 の e2e で実測)。
- 受け入れ基準: v1 ブロック不在、または `issueNumber:null`(create 未完/失敗)の record では従来どおり「ミラー未作成」扱い(`mirror-missing` 系 finding)となる — **v1 ブロック在 = ミラー在ではない**(クロスレビュー 1/2 留意点1)。
- status の exit code 契約(0 clean / 1 divergence / 2 precondition|usage — `amadeus-mirror.ts:282-286` `exitOfStatus`)と findings 語彙(`stale-status-line | mirror-missing | issue-drifted`)は不変。

### FR-2: orchestrate 境界判定の v1 権威化(同根全数)
legacy フィールドの読み手は status 以外に `amadeus-orchestrate.ts:314`(`const hasMirrorIssue = (getField(stateContent, "Mirror Issue") ?? "").trim().length > 0` — boundary auto-sync 判定)と `:3522`(同型 — boundary report 経路)の2箇所(scan-notes §4 の独立 grep 全数再列挙)。**3箇所すべて**を v1 権威へ統一する。部分修正(status のみ)は境界判定の非対称を残すため不可(cid:code-generation:same-root-inventory)。
- 受け入れ基準: 実装時に `getField(stateContent, "Mirror Issue")` 系読取が repo 正本から 0 hit になる(grep 全数確認。実装時の第3再列挙 — cid:requirements-analysis:enumeration-reverify-at-implementation)。
- 受け入れ基準: v1 ブロックに issueNumber を持つ record では boundary が sync 系を提示し、持たない record では create 系を提示する。

### FR-3: 重複 create 拒否の誤診解消
CLI 層の重複 create ガード(`amadeus-mirror.ts:386-391` `mirror issue already exists: #N (duplicate create is refused; run sync instead)`)を v1 の issueNumber で判定させる。これにより「既存ミラーあり」が provenance 異常(`marker identity does not match provenance`)ではなく正しい拒否メッセージで報告される(#1547 症状 (b) の解消)。
- 受け入れ基準: v1 に issueNumber が永続化済みの record への再 create が exit 非0+`mirror already exists: #<N>` 文言で拒否され、lifecycle の provenance 検証まで到達しない。

### FR-4: legacy デッドコードの削除(裁定 A)
CLI 実行時不到達の legacy 経路 — `handleCreate`(`:379`)/`handleSync`(`:425`)/`handleClose`(`:450`)/`writeMirrorIssueField`(`:363`)— を削除して置き換える(org.md トランクベース原則: 古い挙動は削除、互換シム禁止)。これらを直接呼ぶテスト(t232 の legacy 直呼びテスト・legacy field seed fixture `makeWorkspace` :61)は v1 ブロック seed へ書き換えるか、実挙動(FR-5)のテストへ置換する。
- 受け入れ基準: 削除後 `grep -rn "writeMirrorIssueField\|handleCreate\|handleSync\|handleClose" packages/framework/core/tools/amadeus-mirror.ts` の定義が残存しない(mirror.ts スコープ。`amadeus-worktree.ts:249` の同名 `handleCreate` は別物 — 誤削除禁止、scan-notes §5)。
- 受け入れ基準: 既存テストスイートはグリーン維持(org.md bugfix 姿勢)。

### FR-5: リグレッションテスト(regression-first)
起票症状を貫通する e2e/integration テストを**修正前に赤**で固定してから修正する(落ちる実証):
1. **real-create → status**: 実 lifecycle(gh 境界のみ gateway stub)で create を完走させ v1 ブロックが永続化されたワークスペースに対し、`status` が mirror-missing を報告せず issueNumber を認識する(現行コードでは赤 = #1547 症状 (a) の再現)。
2. **重複 create**: 同ワークスペースへの再 create が `mirror already exists: #<N>` で拒否される(現行コードでは provenance 経路へ落ちるため赤)。
3. **v1 不在/issueNumber:null**: 従来どおり mirror-missing となる負の対照(FR-1 第2基準の固定)。
- 受け入れ基準: 3ケースとも修正前に対象分岐へ実際に到達して赤になることをログ実文で確認(cid:code-generation:injection-surface-verify / cid:build-and-test:error-path-reach-lcov — 到達は lcov の DA で確認)。修正後グリーン。

### FR-6: #1534 の文書化クローズ(裁定 A)
- v1 統一後、legacy 10 record(全ミラー Issue CLOSED 済み・全 intent 完了済み)は「guarded ミラー未作成」へ自然降格し、恒久デッドロック(engine が create 非提示 × executor が sync/close 拒否)は解消される — boundary は create を提示するようになる(FR-2 第2基準)。
- 受け入れ基準: #1534 へ「復旧 verb は不要化した(全 legacy ミラー Issue closed・intent 完了、v1 統一で deadlock 解消)」の帰結と、legacy intent を将来再開して新規ミラーを作る場合は旧 CLOSED Issue と別 Issue になる既知事項を記録してクローズ(close-after-landing 準拠 — 修正 PR の main 着地実測後)。

### FR-7: 対象語彙の docs/knowledge 棚卸し
「Mirror Issue」フィールド語彙を持つ文書面を repo 全域 grep(docs/ + 正本知識 + skill)で棚卸しし、v1 権威へ記述を更新する(cid:requirements-analysis:enumeration-completeness-review E-SDE-FD 追補 — 正規文書起点でなく語彙 grep 起点)。
- 受け入れ基準: 棚卸し一覧(grep 出力からの転記)が実装成果物に含まれ、更新要否の判定が per-file で記録される。

## 非機能要件

- **NFR-1 配布同期**: 正本変更後 `bun scripts/package.ts` + `bun run promote:self` を実行し、`bun run dist:check` / `bun run promote:self:check` グリーン(mirror スタックは13コピーへ増幅 — code-structure.md 断面)。
- **NFR-2 検証ゲート**: `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` グリーン。push 前にローカル lcov で diff 追加行の未カバー 0 を実測(cid:code-generation:local-lcov-pre-push)。coverage patch / complexity / drift の blocking gate 維持。
- **NFR-3 CLI 公開契約の不変**: verb 集合(create|sync|close|status)、`--instance`/`--intent` 契約、exit code 契約は不変。変わるのは重複 create 拒否メッセージの文言のみ(誤診解消のための是正であり仕様変更に該当しない — 文書化済み仕様「重複 create は refused」への回復)。

## 制約

- amadeus-bugfix スコープ: 新 verb・新機能・互換シム・二重表現の導入禁止(裁定 A で B/C 案は棄却)。
- 変更は surgical に読み手3箇所+デッドコード削除+テスト+配布同期+文書棚卸しへ限定。
- lifecycle スタック(write 側)は無変更 — write 側は正しく、read 側が欠陥(クロスレビュー確定)。

## 前提

- v1 ブロックの codec 契約(v1 不在 = EMPTY_MIRROR_STATE = ミラー未作成)は設計どおりであり変更しない(#1534 クロスレビュー §2)。
- 区間内の mirror 正本変更は gateway のみ(#1537)で、本修正面とファイル非交差(scan-notes §1)。

## Out of scope

- adopt/migration verb の新設(Q1 裁定で棄却 — 案B)。
- read fallback の二重表現(Q1 裁定で棄却 — 案C)。
- gateway/envelope 系(#1498 → PR #1537 で解消済み)。
- t258 p95 フレーク(#1511 — 別 intent)。
- 「settled 前の prepared receipt 残存」の一般調査(#1547 副次観測。クロスレビューで committed 木では裏取り不能なライブ観測と確定 — 現象が再実測されたら別 Issue で起票)。

## Open questions

- なし(Q1 裁定済み。residual は設計判断でなく実装時実測 — FR-5 の gateway stub 境界の具体形は t232 既習様式(DI シーム `main(argv, projectDir, run, runLifecycle)` — scan-notes §7)に倣う)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-26T14:46:23Z
- **Iteration:** 1
- **Scope decision:** none

requirements.md は #1547/#1534 の同根バグを FR-1〜FR-7 で完全カバー。file:line 引用は全数 verbatim 一致(スポット6件)、読み手3箇所の全数性を独立 grep で再検証、上流3成果物は実参照、Q1=A 裁定は無申告逸脱なく反映、org.md Forbidden 整合(B/C 案の明示棄却+regression-first の落ちる実証契約)。

### Findings

- None
