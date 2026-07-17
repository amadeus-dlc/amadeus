# Re-scan 記録 — 260717-codekb-diff3-cleanup(Issue #1129)

## Base / Observed

- **Date**: 2026-07-18(Asia/Tokyo)
- **Scope / project type / repository**: `amadeus` / Brownfield / `amadeus`
- **手法**: diff-refresh(cid:reverse-engineering:c1)。既存 CodeKB のフルスキャンは行わない。
- **base**: `6495e03a12d9e7149c2e80b59f171a90607a2d2c`
  - `git merge-base --is-ancestor 6495e03a12d9e7149c2e80b59f171a90607a2d2c HEAD` → exit 0。
  - `git rev-list --count 6495e03a12d9e7149c2e80b59f171a90607a2d2c..HEAD` → 126。
  - 次点祖先 `cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5` は距離191。日付が新しい `46f51091f0c8d5d39dc9790a218d03293ffdf060` はHEADの非祖先(exit 1)であり、cid:reverse-engineering:rescan-base-ancestryに従い除外した。
- **observed**: HEAD `0b5e24f8ffeecb6648639adf4a8b1a257084efac`(`git rev-parse HEAD` 実測)。比較時の `origin/main` は `67d10420bc149647a8353d2fe736912bde40d701`。
- **branch差**: `git rev-list --left-right --count origin/main...HEAD` → `3 7`。
- **実施体制**: Developer(スキャン)→Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)。Architectが同じrefとコマンドで独立再測定し、重大な反証はなかった。
- **Baseの真実源**: 本ファイルを含む per-intent `re-scans/*.md` の到達可能なObserved commit。共有`reverse-engineering-timestamp.md`はrepo-level freshness pointerであり、次回差分baseの真実源にはしない。

## Focus と測定方法

対象は次の2ファイルだけである。

1. `amadeus/spaces/default/codekb/amadeus/code-structure.md`
2. `amadeus/spaces/default/codekb/amadeus/reverse-engineering-timestamp.md`

件数は各refについて `git show "<ref>:<file>" | awk` を実行し、行頭の4語彙 `<<<<<<<` / `|||||||` / `=======` / `>>>>>>>` と `^## .*最新` を全数走査した。件数表は `code-structure.md / reverse-engineering-timestamp.md` の順である。

| 測定ref | `<<<<<<<` | `|||||||` | `=======` | `>>>>>>>` | 「最新」H2 | refの意味 |
|---|---:|---:|---:|---:|---:|---|
| `9313fae4c7acc4b38d3acf87b9af76f324dbafda` | 0 / 0 | 1 / 1 | 0 / 0 | 0 / 0 | 2 / 2 | 修正前。孤立base sentinelと二重「最新」を再現 |
| `5e92d1516ba44856f1ec039e7b1eadebbfb4c8c0` | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 1 / 1 | 修正commit自身 |
| `origin/fix/1027-state-set-fail-closed`=`7276236efae0c301e4f5c5992bd7fb49489e7cc7` | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 1 / 1 | 修正系統の現remote tip |
| observed HEAD `0b5e24f8...` | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 1 / 1 | 本scanの作業tree |
| `origin/main`=`67d10420...` | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 1 / 1 | 比較時main |

`git diff --exit-code HEAD origin/main -- <対象file>` は2ファイルともexit 0であり、observed HEADとorigin/mainの対象内容は同一である。

## Fix 系統と Content Clean の分離

- **fix系統**: `git show --stat 5e92d1516...` は2ファイル・4 deletions。`git merge-base --is-ancestor 5e92d1516... origin/fix/1027-state-set-fail-closed` はexit 0だが、HEADとorigin/mainに対してはいずれもexit 1。したがってfix commitの履歴上の着地はfix branchだけで確認できる。
- **content clean**: HEAD / origin/main / origin/fix / fix commit自身は対象2ファイルで4語彙0件・「最新」H2各1件。cleanな内容は確認できるが、fix commitの祖先性を意味しない。
- **Issue state**: `gh issue view 1129 --json state,labels,assignees,url,title` はOPEN、labels=`bug` / `P3` / `S4-MINOR` / `in-progress:amadeus`。main着地後のclose条件は未実施である。

## 関連実装とテスト境界

- `packages/framework/core/tools/amadeus-worktree.ts:549-568` の `isConflict` / `listConflictFiles` はGit出力の `^CONFLICT \(` とunmerged index(`git diff --name-only --diff-filter=U`)を扱う。コミット済みMarkdown内の孤立markerを検査する機構ではない。
- `tests/e2e/t03.test.ts:186-216` は通常のsquash merge conflictを作り、non-zero、status/detail、`conflict_files`、worktree保持を検証する。孤立diff3 base sentinel専用fixtureではない。
- `rg -n --fixed-strings '|||||||' packages tests scripts .codex` は0件。専用diff3 fixtureは現行実行・テスト面に存在しない。
- 本intentは既決 `cid:reverse-engineering:diff3-marker-vocab` を適用する。4語彙の全数検査を行ったため、新しいProduct / Architecture判断は発生しない。

## CodeKB 9成果物の更新判断

| 成果物 | 判断 | 根拠 |
|---|---|---|
| `business-overview.md` | 温存 | business domain・利用者・価値に変化なし |
| `architecture.md` | 温存 | component境界・interaction・decisionに変化なし |
| `code-structure.md` | 温存 | 対象contentはHEAD/mainでcleanかつ同一。新しい構造情報なし |
| `api-documentation.md` | 温存 | external/internal API変更なし |
| `component-inventory.md` | 温存 | component追加・削除・責務変更なし |
| `technology-stack.md` | 温存 | runtime/framework/library/version変更なし |
| `dependencies.md` | 温存 | external/internal dependency変更なし |
| `code-quality-assessment.md` | 温存 | 品質機構・CI・test構成の変更なし。専用fixture不在は本re-scanに記録 |
| `reverse-engineering-timestamp.md` | 更新 | 本intentを最新freshness blockへ追加し、旧mirror-issue-tool blockを履歴へ降格 |

## 質問0件案と Delivery Boundary

質問0件を選挙不要判定案として申告する。base選定、4語彙、fix系統、content clean、9成果物の更新要否は、既決CIDとgit/GitHubの実測から機械導出できる。未決のProduct / Architecture / AWS / Compliance判断はない。leader承認前に回答済みとは扱わない。

本scanではmain merge/rebase、Issue close、GitHub上のレビュー作成・更新操作を実施していない。下流では「fix commitがmainの祖先か」と「mainの対象contentがcleanか」を分離して確認し、着地実測より前にIssueをcloseしない。
