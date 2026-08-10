# Requirements — 260809-report-done-kind-split

上流入力(consumes 全数): business-overview(プロダクト文脈)/ architecture(orchestrator の forwarding loop と directive 契約の位置づけ)/ code-structure(core/tools の directive/orchestrate 配置)。非条件付き optional consumes(intent-statement / scope-document / team-practices)は self-fix スコープの上流 SKIP により本 intent に不在 — Issue #2762 のクロスレビュー実測が代替正本。一次入力: RE 正本 `codekb/amadeus/re-scans/260809-report-done-kind-split.md`(7サイト分類・多義2サイト・方式比較)/ Issue #2762(クロスレビュー2名 ESTABLISHED_WITH_REFINEMENTS)。裁定は `requirements-analysis-questions.md`(Q1〜Q3、semi 梯子)。

## Intent analysis

`amadeus-orchestrate.ts` の `report` 成功 ack が terminal `done` と同じ `kind:"done"` を返し、forwarding loop 契約(SKILL.md:22「report の返す directive を loop step として扱い done なら stop」)と非整合。RE で `done` は7サイト、うち `:5382`/`:5849` は**多義**(terminal/非terminal を単一 emit から出す)と確定。目標は `done` directive に `terminal:boolean` を足して terminal/非終端を機械判別可能にし、conductor 契約を同期すること。方式は Q1 で terminal フラグ(A)を裁定。

## Functional requirements

### FR-1: done directive への terminal フィールド追加

- **Behavior**: `amadeus-directive.ts` の `DoneDirective`(:332-335)へ `terminal: boolean` を追加。`DONE_FIELDS`(:474)/ `FIELD_CHECKS_BY_KIND` の done row / golden sample(:1201 近傍)を同期。validator rule 3(unknown key strict 拒否、:590-594)と整合させ、`terminal` が必須フィールドとして検査される
- **Acceptance**: `terminal` 未指定の done directive が validator で拒否される(落ちる実証)。既存の `kind:"done"` 部分文字列 assert は不変で green

### FR-2: 多義2サイトの isFinal 分岐

- **Behavior**: `:5382`(handleAuthorizedApprovalReport)と `:5849`(handleReport 通常 commit ack)を、スコープ内に既存の `isFinal`(:5298-5299 / :5674)で分岐し `terminal` を設定する。`:5849` の reason が terminal 時に `State advanced. Run next to continue.` と誤って言う点も terminal/非終端で文言を分ける
- **Acceptance**: gated 最終(approve→complete-workflow 自己委譲)/ 非gated 最終(complete-workflow)は `terminal:true`、非gated 途中(advance)は `terminal:false`。`committed` 配列でなく `isFinal` を判別子に使う(gated 最終の committed が approve のため配列は不十分 — RE 実測)

### FR-3: 純サイトの terminal 設定

- **Behavior**: 終端4サイト(`:2987` read-only latch / `:3582` 完了 / `:4933` single-stage / `:5744` already-Completed)= `terminal:true`。非終端 `:5765`(stale re-report guard)= `terminal:false`
- **Acceptance**: 7サイト全てが `terminal` を明示する(未設定サイト 0 を grep で確認)

### FR-4: Stop hook の terminal 参照化

- **Behavior**: Stop hook が `done` を allow(stop 許可)する判定(`amadeus-stop.ts:932` 近傍、`runEngineNextKind` が返す kind ベース)を、非終端 done では stop を許可しないよう `terminal` を参照する形へ改訂する。ただし現状 Stop hook は report 出力でなく**再 spawn した next の kind** で判定しており、report 後の next は run-stage を返すためバックストップとして既に機能している(RE/レビュー実測)— この不変条件を壊さないこと
- **Acceptance**: 「非終端 done ack を stop と誤認しない」ことをテストで固定(t121 系のスタブ engine 経路へ注入)。既存の Stop hook 挙動(read-only latch・真の完了での stop)は不変

### FR-5: conductor 契約(SKILL.md / docs)の同期

- **Behavior**: SKILL.md 6面(逐語同一5面+pi 別文言)の directive 表 `done` 行と forwarding loop 停止規則を「`done` は `terminal:true` で STOP、`terminal:false`(report/advance 成功 ack)で continue」へ改訂。docs/reference 17-skill-system(英日 :38 の契約行含む)を同期
- **Acceptance**: `done` を stop 集合に無条件で挙げる旧記述の残存 0(核心トークン grep)。件数語(ten/nine/seven)は**触らない**(FR-7)

### FR-6: 落ちる実証

- **Behavior**: terminal 判別を固定するテスト(既存最大 t523 の次 = t524)。CLI 契約ポート(t115 系、プロセス境界 spawn で自己参照から隔離)へ「非終端 ack が terminal:false で terminal 完了と区別可能」を追加 assert
- **Acceptance**: 修正前コードで赤(terminal フィールド不在 / 多義サイトが terminal 未分岐)→ 修正後緑。既存 directive 系テスト(t135 等)全 green

### FR-7: スコープ外の不変(negative)

- **Behavior**: 件数語ドリフト(SKILL.md「ten」/ 17-skill-system「nine」「seven」vs VALID_KINDS 実数13)は**触らない** — 本 intent の患部外の既存欠陥(RE 仮説C)。他の directive kind(await-completion/parked 等)も変更しない
- **Acceptance**: 件数語を含む行の diff 0。VALID_KINDS の要素追加・削除なし

## Non-functional requirements

- 追跡ファイルの生成物 drift なし(`bun run build` 後 porcelain 0)— directive/orchestrate/SKILL は全ハーネス dist へ投影
- 既存 CI ブロッキング集合(typecheck / lint / 再現性 / source-only / graph invariants / test:ci)全 green
- coverage: patch gate green(新規行は既計測モジュールの in-process seam で計測)

## Constraints

- 判別子は `isFinal`(既存)を使い新規状態読取をしない(RE 実測: committed 配列は gated 最終で不十分)
- 自己参照: 本修正は実行中の report ループが使う契約。固定は t115(隔離 state のプロセス境界ポート)で行い、実行時の自己参照とは独立にする(RE 調査項目4)
- 新規テスト番号は **t524 から**(RE 予約 — PR 発行前・マージ直前に固定 base SHA の tests/ で再確認)

## Assumptions

- Stop hook が next 再 spawn の kind で判定する構造は不変(FR-4 はこれを壊さず terminal 参照を足す)
- `deferWorkflowCompletion` 経路(await-completion / mirror boundary を先に return)は本修正の対象外 — 既に「done から切り出した別 kind」の設計先例(RE 実測)

## Out of scope

- **件数語ドリフト**(nine/ten/seven/13)の是正 — 患部外の既存欠陥。別 Issue 候補として記録(RE 仮説C・同根棚卸し)
- `:2987` の SKILL.md「completion summary」文言の精密化 — 軽微事項(Q3 裁定で Open questions へ)
- 別 kind 新設案(Q1 で不採用)/ 他 directive kind の変更

## Open questions

- `:2987` read-only latch の SKILL.md 文言(「completion summary を提示」)は read-only 完了には過剰 — 別途精密化候補
- 件数語ドリフトの別 Issue 化(方式 A では巻き込まないため本 intent 完了後にユーザー判断で起票)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-09T23:31:38Z
- **Iteration:** 1
- **Scope decision:** none

FR/節構成・深度バンド・裁定整合は適合だが、questions 承認行が完全 ISO 8601 でなく answer-evidence 述語違反。

### Findings

- BLOCKER | requirements-analysis-questions.md:41 — 承認行が日付のみで parseable ISO 8601 タイムスタンプ欠落(c4-answer-evidence-approval-vocab)
- FOLLOW-UP | requirements.md:3 — optional consumes(intent-statement/scope-document/team-practices)未明示 — 不在なら一言
- NIT | requirements.md:65 — Out of scope と Open questions の重複

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-09T23:31:38Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER(承認 TS)+FOLLOW-UP(optional consumes)が閉包、新規違反なし。READY。

### Findings

- FOLLOW-UP | requirements.md:3 — optional consumes 不在明記で閉包(upstream-coverage は宣言分母のまま — 経過観察)
