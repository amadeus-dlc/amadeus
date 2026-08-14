# Requirements — t245 leader-sync テストの origin 依存除去(Issue #2971)

**Depth**: Minimal / **Scope**: self-fix / **Intent**: 260814-t245-origin-fixture

## Upstream inputs

- 本 intent の実測事実は RE の per-intent scan record `amadeus/spaces/default/codekb/amadeus/re-scans/260814-t245-origin-fixture.md` と `code-quality-assessment.md`(本 intent の現在節)から引く。
- consumes 宣言面のうち `business-overview.md` / `architecture.md` / `code-structure.md` は本 intent の RE で「レビュー済み・本 intent の節なし」(code-structure は team-up 節の履歴降格のみ)。これらからは一般記述(リポジトリの目的・構成・テスト層)だけを前提として受け取り、本 intent の主張は引かない(`cid:requirements-analysis:c4-consume-header-is-not-citable-content`)。

## Intent analysis

`tests/integration/t245-amadeus-leader-sync.integration.test.ts` の 1 テスト(`sweeps every origin/main election file through real selfCheck and exclusions`、`:208-226`)だけが、実在する `origin` リモートへの `git fetch` を無条件実行し(`:213-215`)、リモートなしクローンで構造的に赤くなる(exit 128 → `gitStdout` の `expect(result.kind).toBe("ok")` が失敗、`:78-83`)。これはテストの環境前提の欠陥であり(クロスレビュー xrev-260814-2971 2名 CONFIRMED)、プロダクトコードの欠陥ではない。目標は、このテストを同ファイル `:106-133` の shallow-origin テストと同じ自己完結 fixture 様式へ揃え、実 corpus 掃引の検出力を保持したまま環境依存を除去すること。

## Functional requirements

- **FR-1: fixture 化(方針1)** — 対象テストから実 `origin` への `git fetch`(`:213-215`)と `process.cwd()` の実クローンへの `git worktree add`(`:216`)を除去し、`mkdtempSync` で構築するローカル bare repo を origin とする自己完結 fixture へ置き換える。構築様式(mkdtemp + `git init --bare` + source repo + `remote add origin` + push、`roots.push` → `afterEach` 一括 rmSync)は同ファイル `:106-133` に合わせる。受け入れ: 修正後の対象テスト本体に `process.cwd()` と実 origin 参照が残らない(`git grep` で確認)。
- **FR-2: 実 corpus の seed** — fixture の bare origin の main には、実 checkout の `amadeus/spaces/default/elections/` 配下 corpus 全体を seed する(裁定 `seed-real-checkout-corpus`)。受け入れ: テスト実行時に掃引される electionPaths 件数が 1 以上かつ実 corpus のファイル群に一致する(最低限 `expect(owned.electionPaths.length).toBeGreaterThan(0)` の維持と、seed 元との件数一致の検証)。
- **FR-3: origin なしクローンで緑** — `origin` リモートを持たない隔離クローンで対象ファイル単独の `bun test` が 24/24 pass。受け入れは配送先実測(`cid:requirements-analysis:c2-acceptance-at-delivery-tree` 同旨): repo 外 scratch に origin なしクローンを作り実行して確認する。
- **FR-4: プロジェクト git 状態への書込ゼロ** — 修正後のテストは本体リポジトリの git dir に一切書き込まない(現行の `refs/remotes/origin/main` 上書き・worktree 台帳変更を除去)。受け入れ: テスト前後で本体 `.git` の当該 ref と `git worktree list` が不変。
- **FR-5: TDD(falling proof)** — 実装前に「origin 不在で赤」を repo 外 scratch で実測し(再現手順は RE record F3)、修正後に同一条件で緑を実測する。落ちる実証は注入→赤→revert の 1 セット規律に従う(今回は環境条件が注入に相当)。
- **FR-6: skip 分岐を導入しない** — 明示 skip/N/A(Issue 完了条件2)は不採用。fixture 化により全環境で常時実行する。受け入れ: 対象テストに skip 系 API・環境検知分岐が存在しない。
- **FR-7: プロダクトコード非変更** — `scripts/amadeus-leader-sync.ts` は現役ツールであり変更しない(xrev C7 反証済み)。受け入れ: diff が `tests/` 配下(および必要なら fixture ヘルパ)に閉じる。
- **FR-8: 検証セット** — 対象ファイル単独 24/24、`bash tests/run-tests.sh --ci` フルスイート緑(テストファイル変更のため絞り込み実行では完了としない — `cid:code-generation:c3-conductor-runs-full-suite`)、`bun run typecheck`、`bun run lint` すべて緑。

## Non-functional requirements

- **NFR-1: timeout 契約維持** — `scaleTestTime(120_000)` は維持(実 corpus 掃引 + 実 git I/O は fixture 化後も残る)。コメント文言は実態(fixture 化)に合わせ更新してよい。テスト実行時間は現行から顕著に増加しない(corpus copy + commit の追加コストは timeout 内)。
- **NFR-2: 隔離規律** — 実装は Bolt worktree 分離で行い、fixture は `mkdtempSync`(repo 外 tmpdir)のみを使う。

## Constraints

- surgical: 触るのは対象テスト(と同ファイル内で必要な最小ヘルパ)だけ。後方互換シム・フォールバック分岐の追加禁止(org.md Forbidden)。
- コミットは英語、PR 本文は日本語。PR は Bolt 単位 1 件、自 intent の record checkpoint 同梱可(E-260813-RECORD-BUNDLING-NORM)。
- PR マージは人間専権(`cid:requirements-analysis:no-ai-merge`)。CI green とレビュー READY を実測した状態で停止・報告する。

## Assumptions

- 実 checkout の elections corpus(HEAD 断面 4150 ファイル / 8,015,636 bytes、RE record P 述語より転記)の fixture への copy + commit は `scaleTestTime(120_000)` の時間内に収まる。実装時に単独実行時間を実測して確認する。
- 掃引対象が「origin/main 断面」から「checkout の working tree 断面」へ変わることは検出力の等価以上(これから push される corpus を検証する)とみなす。

## Out of scope

- 同型の環境前提(実 origin / ネットワーク依存)を持つ他テストの全数監査(RE 実測で自動テスト中の実 origin fetch は t245 の 1 件のみ — `git grep -n 'refs/heads/main:refs/remotes/origin/main' -- tests scripts packages plugins` は 2 hit で他方はプロダクトコード)。
- `scripts/amadeus-leader-sync.ts` 本体の変更、CI tier 再配置、coverage allowlist の変更。
- xrev-scan-mode cid 空洞化のノルム蒸留裁定(PR #2998 で Inbox 記録済み、次回蒸留ラウンド)。

## Open questions

- なし(材料上の未決事項はゼロ。Q1 は full-autonomy 梯子で裁定済み — questions file 参照)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-14T00:57:10Z
- **Iteration:** 1
- **Scope decision:** none

8 件の FR は Minimal depth の 5-10 件バンド内に収まり、各々に実測可能な受け入れ基準(git grep 確認、24/24 pass、.git 不変等)が付与されている。Issue #2971 の完了条件への対応、decide-question 梯子での corpus 裁定の反映、consume 面からの装飾引用回避が確認でき、無申告の逸脱やスコープ膨張も見当たらない。

### Findings

- NIT | amadeus/spaces/default/intents/260814-t245-origin-fixture/inception/requirements-analysis/requirements.md: FR の多くが目安 3-6 行より密な単一長文パラグラフ(depth-budget は advisory のため非ブロッキング)
