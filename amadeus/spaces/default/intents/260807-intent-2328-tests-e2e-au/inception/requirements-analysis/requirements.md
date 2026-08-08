# Requirements — 260807-intent-2328-tests-e2e-au（Issue #2328）

上流入力(consumes 全数): business-overview（e2e 監査テストの偽 green と検証信頼性）、architecture（v1/v2 二重スキーマとリーダー面の構造）、code-structure（リーダー面の二分とテスト層配置）

## Intent analysis

対象は [#2328](https://github.com/amadeus-dlc/amadeus/issues/2328)（クロスレビュー2名成立 — REFINED×2、target-sha 75a1c198d）。本文の性格づけ（間欠フレーク・WORKTREE_DISCARDED 行欠落・CI 偽赤）は両 verdict で CONTRADICTED であり、確定した実態は:

- **決定的な常時赤**: tests/e2e の自前 audit パーサが v1 形（トップレベル `event`/`fields`、748e693e3 #1645 導入）を pin したまま、正準 emit の v2 移行（`eventName`/`attributes`、771afe2a2 #1850、2026-08-01）へ未追随。writer は正常（fail-closed 経路も無傷）
- **CI 死角で不可視**: `--ci` は e2e 層を実行しない（tests/lib/run-tests-args.ts:95-100、ci.yml:224-227 逐語）。CI 上の e2e は t341 の1本のみ
- **患部は 17 e2e ファイル**（RE で全数単独実行し fail 実測 — 3ファイルではない）。なお t378/t380/t382/t388（`tests/integration/` 配置）は v1 不在 assert が設計意図で、非 e2e 再棚卸し（FR-4）の母集団から除外する独立ドメイン
- **正解形は共有ハーネス** `tests/harness/audit-records.ts`（v1/v2 両対応正規化、59 ファイルの既習消費、ヘッダコメントが本欠陥クラスを予告）。**v2 キーへの機械置換は誤り** — v1 writer が3箇所現役（amadeus-audit.ts:534 / :597、amadeus-state.ts:3193）

クロスレビューが未解決とした t258 仮説（--ci で通る理由 = lifecycle writer が v1 シリアライザ使用）は RE が2層で実測確定済み（(a) amadeus-audit.ts:534 の v1 emit 実測 (b) t258:59-77 の自作 v1 fixture — re-scans §4）。

裁定系譜: Q1〜Q4 を decide-question で確定（questions ファイル参照）。RE 正本 = `codekb/amadeus/re-scans/260807-intent-2328-tests-e2e-au.md`（observed a5621236c、review..observed 区間で tests/e2e/ 無変更）。

## Functional requirements

### FR-1: 患部 19 e2e ファイルの audit リーダーを共有ハーネスへ寄せる（Q1=A、E-ASD-CGDEV 裁定で改訂）

自前 `JSON.parse ... as AuditRecord`（v1 形 pin）を `tests/harness/audit-records.ts` の正規化 API（`normalizeAuditRecord` / `auditRowsFrom` / `countAuditEvent`）の消費へ置換する。**e2e の audit reader は例外なく共有ハーネス経由へ統一する**（E-ASD-CGDEV 裁定 choice:1 — 本文言が統一要件の明示宣言）。

**患部集合の申告付き改訂（E-ASD-CGDEV 問B）**: RE の17列挙は述語の `\.event\b` 連言が「fields のみを pin する」変種を構造的に取りこぼしており、builder の広げた述語（`.event` | `.fields` | `["Bolt slug"]`）での再測により **t02.test.ts:116 / t06.test.ts:179 の2件を追加した計19件**が正（追加候補はちょうど2件のみと実測確定）。same-root-inventory（同根は同一変更で修正）に従い同一 unit で修正する。

- **AC-1a**: 患部19ファイルのうち **t113 を除く18件**が単独実行で green（各ファイルの pass/fail と exit code を記録）。修正前の Red は RE/builder 実測済み（既存テストの現失敗がそのまま TDD Red）。**t113 の患部分類（E-ASD-CGDEV 問A — 免責でなく分類）**: t113 の inline パーサは元から両スキーマ対応で、その赤の実因は本欠陥クラス（リーダーの schema drift）でなく **emit 順序契約の破れ**（INTENT_AUTONOMY_TRANSACTION_COMMITTED が WORKFLOW_COMPLETED の後に emit — FR-1 変換前後で失敗署名 byte 同一を実測）。リーダー統一の変換は t113 にも適用し（統一要件）、順序欠陥は**未改変 base の分離 worktree で失敗集合一致を実測したうえで別 Issue 起票**（cid:build-and-test:c4-260805-subagent-type-guard 準拠）。順序契約の出典は t113 自身のピン（:8-14/:255-257）+ 12-state-machine.md:32 の terminal 宣言であり、独立仕様文書の dead-last 明文は無い — Issue 本文へこの出典限界を明記する（s1 留保）
- **AC-1b**: **writer 側は無改変**（packages/framework/core/ の audit emit 経路に diff ゼロ）。修正は読み手のみ
- **AC-1d**: 既存の共有ハーネス消費59ファイルの回帰なし（`bun run test:ci` の該当 tier green で確認 — 個別再実行は不要）

### FR-2: vacuity guard — 負方向 assert 3件の落ちる実証（Q1 派生）

壊れたリーダーでは「0件期待」assert が行の実在に依らず通る（偽 green）。修正後、以下3件について「対象行が実在する状態で赤くなる」ことを落ちる実証で固定する:

- t09-halt-and-ask-preservation.test.ts:206（WORKTREE_DISCARDED = 0 期待。修正前断面では :211 — import 追加の行シフトで改行）
- t07-audit-fork-merge.test.ts:361（AUDIT_MERGED = 0）/ :520（AUDIT_FORKED = 0）（修正前断面では :371/:530）

- **AC-2a**: 各 assert について注入→赤→復元→残渣ゼロの不可分1セット（falling-proof-injection-one-set）。注入はテストが実際に読む面へ（injection-surface-verify）

### FR-3: dist 依存の実装時実測（Q2=A）

共有ハーネスは EVENT_HEADINGS を dist から import する（:18）。e2e 実行経路（run-tests の e2e tier / ci.yml:252 の t341）が build 済み dist を保証するかを実装時に実測し、保証される場合はそのまま採用する。

- **AC-3a**: e2e tier の実行前提（build の有無）の実測結果を code-summary に記録（実測コマンドと結果）。保証されない経路が実在した場合は実装を停止し裁定（deviation-stop-before-implement）

### FR-4: 非 e2e 自前パーサの述語記録付き再棚卸しと Issue 化（Q3=A）

- **AC-4a**: 検索述語（パターン・対象集合・除外条件）を記録した再棚卸しで件数を確定（E-ASD-RES13 追補準拠 — 14 vs 29 不一致の解消）
- **AC-4b**: 「v2 移行時に壊れる latent クラス」として Issue-first 起票し、Issue 番号を record へ残す。**本 intent では修正しない**
- **AC-4c**: t378/t380/t382/t388（いずれも `tests/integration/` 配置 — e2e 患部17とは独立ドメイン）は v1 不在 assert が設計意図のため、再棚卸しの母集団から除外し無改変とする（re-scans §6 の除外条件）

### FR-5: CI 死角の別 Issue 化と表題再定義（Q4=A）

- **AC-5a**: e2e 層の PR CI 非実行（同種 drift の再不可視化リスク）を別 Issue として起票し、Issue 番号を record へ残す
- **AC-5b**: #2328 の表題を実態（決定的常時赤 + CI 死角）へ再定義してからクローズ（クローズは着地実測後 — close-after-landing-verification）

## Non-functional requirements

- **NFR-1**: `bun run typecheck` / `bun run lint` exit 0。テストのみの変更のため coverage patch gate の対象行は原則生じない（tests/ は計測対象外）が、CI のブロッキング集合全体の green を最終判定とする
- **NFR-2**: tests/harness/audit-records.ts 自体の変更が必要になった場合は消費59ファイルへの波及を grep 棚卸ししてから行う（原則は無改変での採用）
- **NFR-3**: 新規テストファイルを作る場合の採番は t484 以降（t483 使用済み — マージ直前に固定 base SHA で再確認）

## Constraints

- 修正は読み手（tests/）のみ — writer（packages/framework/core/）への diff はゼロ（AC-1b）。v1 writer 3箇所が現役のため v2 キーへの機械置換は禁止（RE 実測）
- 共有ハーネスは原則無改変で採用（NFR-2）。dist import の扱いは FR-3 の実装時実測に従う
- t378/t380/t382/t388（`tests/integration/` 配置）は v1 不在 assert が設計意図 — **非 e2e 再棚卸し（FR-4）の母集団からの除外**であり、e2e 患部17（FR-1）とは独立ドメイン（AC-4c）
- grant prohibitedEffects: scope-out / norm-waiver / quality-waiver — 非 e2e 修正・CI 変更の同梱は不可（Q3/Q4 で Issue 化へ裁定済み）

## Assumptions

- e2e tier の実行環境は build 済み dist を持つ（根拠: 共有ハーネス消費59ファイルが --ci を通る実測。ただし e2e 経路自体は FR-3 の実装時実測で確定する — 仮定と実測を区別）
- ~~RE の患部17ファイル列挙は完全~~ **（E-ASD-CGDEV で訂正）**: RE 述語（re-scans §記載の `\.event\b` 連言）は fields-only pin 変種を構造的に取りこぼす — 完全性主張は誤りで、正しい患部集合は builder の広義述語による19件（FR-1 改訂参照）。当初の根拠記述「共有ハーネス import の有無で機械抽出」も実際の RE 述語と食い違っていた（s1 留保による訂正）

## Out of scope（根拠付き）

1. **非 e2e 自前パーサの修正** — Q3=A。現状 green の latent 債務であり FR-4 の Issue へ委譲
2. **CI への e2e 層追加** — Q4=A。実行時間・flake 面の独立判断であり FR-5 の Issue へ委譲。**残余リスク明記**: 本修正着地後も e2e は PR CI で回らないため、同種 drift は再び不可視になりうる（検出は当該 Issue の解決に依存）
3. **v1 writer の v2 統一** — writer 3箇所（amadeus-audit.ts:534/:597、amadeus-state.ts:3193）の移行は #2328 の完了条件外。共有ハーネスが両対応のため読み手側は移行に中立
4. **e2e 98ファイル中、自前パーサ非該当の80ファイルの健全性監査** — 判別子非該当（RE 実測）
5. **#2397/#2382（真のフレーク群）** — クラスが異なる（本件は常時赤、あちらは実行されるが不安定）。別 intent

## Open questions

- なし（Q1〜Q4 はすべて decide-question で確定済み。FR-3 の dist 前提と FR-4 の件数確定は「実装時実測で確定する条件」として AC 化済み — 未決の設計判断ではない）

## Traceability

全 FR は #2328 の完了条件（「決定的に観測されること（または flaky 原因の機序確定と是正）」— 機序確定済み・是正が本 intent）と Q1〜Q4 の decide-question 裁定へ遡る。user stories は scope SKIP のため intent 直結。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-07T22:27:38Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜5 の AC はテスト可能で検証手段バインド済み。RE 正本の数値・file:line 引用を全数 spot 照合で実在確認。decide-question 4裁定と FR の1:1対応、無断の構造追加なし。FOLLOW-UP 2件（除外4ファイルのドメイン誤記 = AC-1c を FR-4 側 AC-4c へ移設して是正済み / t258 仮説の吸収確認 = RE §4 の2層実測で確定済みを Intent analysis へ明記）は conductor が是正適用済み。

### Findings

- FOLLOW-UP | requirements.md AC-1c/Constraints | 除外4ファイル(t378/t380/t382/t388)は tests/integration/ 配置で e2e 患部17とは独立ドメイン — FR-4 側の除外(AC-4c)へ移設(是正適用済み)
- FOLLOW-UP | requirements.md Intent analysis | t258 仮説はクロスレビュー未解決だが RE §4 の2層実測で確定済み — 吸収を明記(是正適用済み)
