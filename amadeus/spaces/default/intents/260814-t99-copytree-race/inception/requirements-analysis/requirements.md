# Requirements — copyTreeWithRetry の非収束リトライ修正(Issue #3003)

**Depth**: Minimal / **Scope**: self-fix / **Intent**: 260814-t99-copytree-race

## Upstream inputs

- 本 intent の実測事実は RE per-intent scan record `amadeus/spaces/default/codekb/amadeus/re-scans/260814-t99-copytree-race.md` と `code-quality-assessment.md`(本 intent の現在節)から引く。
- consumes 宣言面のうち `business-overview.md` / `architecture.md` / `code-structure.md` は本 intent の RE で「レビュー済み・本 intent の節なし」。一般記述のみ前提として受け取り、本 intent の主張は引かない(`cid:requirements-analysis:c4-consume-header-is-not-citable-content`)。

## Intent analysis

`tests/harness/fixtures.ts` の `copyTreeWithRetry`(:633-661)は、コピー後の count 等値 post-condition(:644)を持つが、attempt 間で dest を消去しないため `cpSync` の merge 累積により **dest が src の真の上位集合になると 3 回のリトライ全てが構造的に失敗**する(xrev-260814-3003 両レビュアーが repo 外注入再現で実証、RE が制御フロー実読で構造根拠を確認)。実観測(t99 の transient 赤、src 562 / dest 563)はこの機序による。原因プロセスはスイート外の並行変異(in-suite writer は棚卸しで 0 件)であり、修正はコピーの収束性の回復と診断の観測性強化で行う(裁定 Q1 = A+C)。

## Functional requirements

- **FR-1: attempt 毎の dest クリア(方式 A)** — `copyTreeWithRetry` の各 attempt でコピー前に dest を除去する(`CopyTreeOps` へ `remove(path): void` を追加、default 実装は既存の削除機構に合わせる)。受け入れ: dest>src 状態からの attempt 2 で収束する(FR-4 の注入テストが緑)。宣言済み設計意図(:614-616 の partial-copy 無音通過防止、:716-718 の undercount→赤)は変更しない。
- **FR-2: dest-fresh 契約の明文化** — 「dest は呼出時点で非存在であること(attempt 毎に除去される)」を helper の doc comment に明文化する。受け入れ: doc comment の存在(全6呼出サイトが fresh であることは RE 実測済み)。
- **FR-3: 診断の集合差分強化(方式 C)** — count mismatch 時の診断出力に src/dest のファイル集合差(src にのみ存在 / dest にのみ存在するパス、上限件数つき)を追加し、次回発生時に「何が消えた/増えたか」を同定可能にする。受け入れ: 注入テストで差分パスが stderr 診断に現れる。
- **FR-4: TDD(falling proof)** — 実装前に `t-fixtures-copy-tree-retry.integration.test.ts` へ **dest>src 方向の count 注入テスト**(現状 0 本)を追加して現行実装で赤を実測し、FR-1 実装後に緑を実測する。既存の dest<src ケース(:107-127)は回帰ガードとして赤のまま維持されることを確認する。
- **FR-5: 対象スコープ** — 変更は `tests/harness/fixtures.ts`(helper 本体)と `tests/integration/t-fixtures-copy-tree-retry.integration.test.ts`(テスト)に閉じる(裁定 Q2)。プロダクトコード(`packages/` / `scripts/` / `plugins/`)は非変更。
- **FR-6: 残余の follow-up 起票** — fixtures.ts:784 姉妹面(素 cpSync)・未ガード素 cpSync 面(述語依存 19〜89 サイト)・`CopyTreeOps.exists` の copy 側未消費を 1 件の follow-up Issue として起票する(§14 経路、修正はしない)。受け入れ: Issue 番号の記録。
- **FR-7: 検証セット** — 対象2ファイル単独の `bun test` 緑、`bash tests/run-tests.sh --ci` フルスイート、`bun run typecheck`、`bun run lint` すべて緑。t99 単独(17 テスト)も緑を確認。

## Non-functional requirements

- **NFR-1: 契約維持** — リトライ回数(3)・backoff(50ms×attempt)・`isRetryableCopyError` の分類・エラーメッセージの既存 assert 面は変更しない(既存テストの sleep 系 assert :107-127 が回帰ガード)。
- **NFR-2: Patch Coverage** — `fixtures.ts` は計測対象。新設分岐(remove 経路・診断差分経路)は注入シームで driver を書き、allowlist 追加なしで gate を通す。
- **NFR-3: 新設定数の命名** — `TIMEOUT|DEADLINE|POLL|WAIT|SLEEP|SETTLE` を含む定数名を新設しない(test-time-factor-guard の timing-constant パターン回避、RE NIT)。

## Constraints

- surgical(P5)。後方互換シム・フォールバック分岐の追加禁止。コミット英語・PR 本文日本語・Bolt 単位 1 PR(自 intent record 同梱可)。PR マージは人間専権。
- Bolt 実装は本 intent 専用 worktree(branch `fix-3003-t99-copytree`、origin/main 起点)で行う。

## Assumptions

- 全6呼出サイトの dest は事前非存在(RE 全数実測)のため、attempt 毎の dest 除去は既存データを破壊しない。
- attempt 毎の再コピー最悪コスト(3× 562 files)は既存の失敗経路と同等であり実行時間への影響は無視できる。

## Out of scope

- 未ガード素 cpSync 面の置換(件数が述語依存で AC 化不適 — RE UNMEASURED-3。FR-6 の follow-up Issue へ)。
- `CopyTreeOps.exists` の整理(同上)。
- 並行変異プロセスの同定・排除(スイート外要因。FR-3 の診断強化が次回発生時の同定を可能にする)。
- 方式 B(src スナップショット化)・方式 D(包含判定)は不採用(Q1 裁定 — D は宣言済み設計意図の書き換えを伴うため)。

## Open questions

- なし(Q1/Q2 は full-autonomy 梯子で裁定済み — questions file 参照)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-14T05:24:06Z
- **Iteration:** 1
- **Scope decision:** none

7件のFR(Minimal帯適合)はIssue #3003の欠陥機序とxrev refinement(A+C裁定)へ過不足なくトレースし、各FRに検証可能な受け入れ基準とTDD(FR-4 falling proof)を備える。consumesヘッダの引用規律も遵守し、無申告のスコープ膨張なし。

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260814-t99-copytree-race/inception/requirements-analysis/requirements.md: FR-2 の受け入れが doc comment の存在のみ — 実装 Bolt 側チェックリストで契約文言の内容照合を行うこと
- NIT | amadeus/spaces/default/intents/260814-t99-copytree-race/inception/requirements-analysis/requirements.md: FR-1 の remove デフォルト実装が非存在パスで例外を出さない(冪等除去)ことを design/code-generation 段の確認事項として引き継ぐ
- NIT | amadeus/spaces/default/intents/260814-t99-copytree-race/inception/requirements-analysis/requirements.md: FR-1 本文が 3-6 行バンドよりやや厚め(advisory)
