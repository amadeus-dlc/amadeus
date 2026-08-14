# Requirements — copyTreeWithRetry ガード適用境界の是正(Issue #3014)

**Depth**: Minimal / **Scope**: self-fix / **Intent**: 260814-copytree-guard-boundary

## Upstream inputs

- 本 intent の実測事実は RE per-intent scan record `amadeus/spaces/default/codekb/amadeus/re-scans/260814-copytree-guard-boundary.md` と `code-quality-assessment.md`(本 intent の現在節)から引く。consumes 宣言面のうち business-overview / architecture / code-structure は本 intent の節を持たず一般前提のみ(`cid:requirements-analysis:c4`)。

## Intent analysis

`copyTreeWithRetry` の post-condition 契約(「partial copy を無音で通さない」fixtures.ts:633-637)の適用境界が原理を持たず、#2593 の置換述語(識別子 `AMADEUS_SRC` リテラル一致)の副作用として、同一関数内の同クラス面が素 `cpSync` のまま残っている(xrev-260814-3014 2名成立)。`setupTuiProject` では kiro/kiro-ide 分岐のハーネス木コピーそのものが未ガード。加えて `CopyTreeOps.exists` は copy 側で未消費の死んだメンバ。裁定(Q1-Q3): dest-fresh な再帰木 5 サイトへガードを適用し、適用不能面は帰属根拠つきで明文化、exists は除去、全域適用(b)は enhancement Issue へ分離。

## Functional requirements

- **FR-1: ガード適用(5 サイト)** — `tui-fixtures.ts:170/172/177/179/188` の素 `cpSync` を `copyTreeWithRetry` へ置換(memory 面 3 サイトは `if (existsSync(X)) copyTreeWithRetry(X, dest)` の合成形 — src 不在は正常系のため existsSync 事前条件を保持)。受け入れ: 置換後、次の述語のヒットが 0 件 — 「`copyTreeWithRetry(` 呼出を含む関数ブロック内(brace 深度追跡、コメント行除外)にある、第1引数が dist 由来(`[A-Z_]*_(SRC|DIST)` 定数または dist リテラル)の素 `cpSync(` 行のうち、src がディレクトリかつ dest-fresh の面」(実装 = RE record §pred-a2 の scratch スクリプト。除外 3 面は FR-2 の帰属コメントで識別)。
- **FR-2: 除外面の帰属明文化** — 単一ファイル 2 面(`tui-fixtures.ts:171/:178` — countFilesRecursive の ENOTDIR 非リトライで適用不能・実測)と `fixtures.ts:867`(dest-fresh 不成立 — seedWorkspaceShell が先に `<proj>/amadeus` を作成・seed し、素 cpSync の merge 意味論に意図的依存・実測)に、適用不能の帰属根拠を英語 doc コメントで明文化。受け入れ: 3 面すべてに、当該面固有の帰属理由(:171/:178 = countFilesRecursive の ENOTDIR 非リトライ、:867 = seedWorkspaceShell が先行 seed する dest への merge 意味論依存)を明記した英語 doc コメントが実在する(理由文言の内容照合まで行う)。
- **FR-3: exists 除去(c1)** — `CopyTreeOps.exists`(fixtures.ts:648)、`realCopyTreeOps.exists`(:657)、テスト opsRecorder の exists スタブ(:29-32)を削除。受け入れ: `git grep -n "ops\.exists" -- tests/harness/fixtures.ts` のヒットが :600(RemoveTreeOps 側)のみ、typecheck 緑。
- **FR-4: TDD(falling proof)** — TDD 既定(cid:code-generation:tdd-default-with-narrow-exceptions)を全面適用する(免除なし)。実装前に「5 サイトの各コピーが `copyTreeWithRetry` を経由する」ことを公開 seam で assert する失敗テストを追加し(現行コードでは素 cpSync のため赤 — 経路検証はモジュール seam のスパイ/モックで行う)、置換実装で緑にする。加えてエラーパス伝播(guard が throw した場合に呼出サイトから伝播すること)を 1 ケース以上検証する。既存 t-fixtures-copy-tree-retry 12/12・tui 系消費テストの前後緑を必須とする。
- **FR-5: 対象スコープ** — 変更は `tests/harness/fixtures.ts`(doc コメントのみ)・`tests/harness/tui-fixtures.ts`・`tests/integration/t-fixtures-copy-tree-retry.integration.test.ts`(exists スタブ削除)に閉じる。プロダクトコード非変更。
- **FR-6: (b) の分離起票** — 未ガード面全域(上界 35 サイト)への契約適用を enhancement Issue として起票し、#3014 クローズ時に行き先を明記。受け入れ: Issue 番号の記録。
- **FR-7: 検証セット** — 対象ファイルの単独テスト緑(t-fixtures-copy-tree-retry 12/12 + tui-fixtures 消費テスト)、`bash tests/run-tests.sh --ci` フルスイート、typecheck、lint すべて緑。

## Non-functional requirements

- **NFR-1: 契約維持** — copyTreeWithRetry 本体・リトライ回数・診断・エラーメッセージは不変(本 intent は呼出サイトと interface の整理のみ)。
- **NFR-2: Patch Coverage** — 変更行は既存テストの実行経路で被覆(tui-fixtures の置換行は kiro/kiro-ide 系テストが駆動)。allowlist 追加なし。

## Constraints

- surgical(P5)。後方互換シム禁止。コミット英語・PR 日本語・Bolt 単位 1 PR(record 同梱可)。PR マージ人間専権。実装は本 intent 専用 worktree(branch fix-3014-copytree-guard、origin/main 起点)。

## Assumptions

- tui-fixtures の 5 サイトの dest はすべて fresh(RE 実測)。kiro/kiro-ide 系テストが置換行を実行し coverage を賄う(実装時に単独実行で確認)。

## Out of scope

- スコープ (b) 全域適用(FR-6 の enhancement Issue へ)。c2(診断シーム化)。fixtures.ts:867 の seed 順序再設計。setupWorkspaceJourney(:1022-1070)等 pred-a2 外の面。担当外 codekb の stale 現在マーカー整理。

## Open questions

- なし(Q1-Q3 は full-autonomy 梯子で裁定済み)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-14T07:28:05Z
- **Iteration:** 1
- **Scope decision:** none

Q1-Q3 の裁定の反映・depth 帯・consume 引用規律は適合だが、FR-4 が TDD 既定からの免除を無申告で主張しており(テスト困難は免除理由にならない、置換は挙動変更でエラーパスも適用対象)、承認不能。

### Findings

- BLOCKER | amadeus/spaces/default/intents/260814-copytree-guard-boundary/inception/requirements-analysis/requirements.md: FR-4 の TDD 免除は cid:code-generation:tdd-default-with-narrow-exceptions の4免除のいずれにも該当せず、無申告の逸脱。seam 経由の falling-proof(経路検証)は実現可能であり、テスト追加か免除の裁定エスカレーションが必要
- FOLLOW-UP | amadeus/spaces/default/intents/260814-copytree-guard-boundary/inception/requirements-analysis/requirements.md: FR-2 の受け入れがコメント実在のみで内容照合がない
- FOLLOW-UP | amadeus/spaces/default/intents/260814-copytree-guard-boundary/inception/requirements-analysis/requirements.md: FR-1 の受け入れが pred-a2 述語を本文へ inline していない

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-14T07:29:00Z
- **Iteration:** 2
- **Scope decision:** none

全3件の iter1 指摘が是正された。FR-4 は TDD 免除を撤回し seam ベースの失敗テスト先行 + エラーパス伝播 1 ケース以上として全面適用へ、FR-2 は帰属理由の内容照合を AC 化、FR-1 は述語定義を本文へ inline。

### Findings

- None
