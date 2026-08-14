# re-scan 記録 — 260814-t245-origin-fixture

## メタデータ

| 項目 | 値 |
|---|---|
| Date | `2026-08-14` |
| Intent | `260814-t245-origin-fixture`（scope `self-fix`、depth `Minimal`） |
| Base commit | `89532174c30ef9cc7ff29496cd6916586fdda00a` |
| Observed commit | `5f6b5bf97068f59dee53dcd4a2f6564967c3d164`（= 本 worktree HEAD = `origin/main`） |
| Focus | [Issue #2971](https://github.com/amadeus-dlc/amadeus/issues/2971)（t245 leader-sync テストが `origin` リモートの実在を前提とし、リモートなしクローンで構造的に赤くなる）+ `base..observed` 差分全域 |
| Scan mode | **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`） |
| 書込範囲 | `codekb/amadeus/` 配下のみ（コード・テスト・state・audit・git 状態の変更ゼロ） |

### base 選定根拠

`reverse-engineering-timestamp.md` と `re-scans/*.md` が記録する全 observed のうち、**HEAD の祖先で距離最小**のものを選んだ（`cid:reverse-engineering:rescan-base-ancestry`）。

| 候補 | `git merge-base --is-ancestor <c> HEAD` | `git rev-list --count <c>..HEAD` |
|---|---|---|
| `c0f9edf27`（260813-advisory-requestion-fix） | exit 0 | 11 |
| `97581b3e3`（260813-remove-team-up） | exit 0 | 10 |
| **`89532174c`（260813-lifecycle-guard-runtime）** | exit 0 | **9**（最小 → 採用） |

### observed 選定根拠

`git rev-parse HEAD` = `5f6b5bf97068f59dee53dcd4a2f6564967c3d164`。`origin/main` 系譜のコミットであり、ローカル merge コミットではない（`cid:reverse-engineering:c2-observed-mainline-commit`）。

### scan mode と行番号引用の currency

クロスレビュー run `xrev-260814-2971`（2 名成立: reviewer-1 `CONFIRMED` / reviewer-2 `CONFIRMED_WITH_REFINEMENTS`）、target-sha `52f1f1b25`。verdict を Developer scan の一次入力とし、Architect が observed 断面の verbatim 実読で二重化した。

currency 根拠（**実測の記録であり免除の主張ではない**）: `git diff --name-only 52f1f1b25..HEAD` = `amadeus/spaces/default/elections/elections.json` の **1 件のみ**（rc=0）。被引用パス（`tests/integration/t245-amadeus-leader-sync.integration.test.ts`、`scripts/amadeus-leader-sync.ts`、`tests/run-tests.ts`、`tests/.test-time-factor-allowlist.json`）との交差は **ゼロ**（`cid:reverse-engineering:E-XBB-RE-S13-c2`）。**表現形式の移行検査**（`cid:reverse-engineering:c5-xrev-currency-schema-migration`）: `review..observed` の唯一の変更は選挙ストア索引への 1 エントリ追記であり、患部（テストの環境前提）のスキーマ・セレクタ形式を変える移行を含まない → c5 の構造的不成立条件には該当しない。

## 述語一覧（再実行可能。すべて worktree ルート、observed = `5f6b5bf97`）

| ID | 述語 | 結果 |
|---|---|---|
| P0 | `git rev-parse HEAD` / `git rev-parse origin/main` | 両方 `5f6b5bf97068f59dee53dcd4a2f6564967c3d164` |
| P1 | `git log --oneline 89532174c..HEAD \| wc -l` | **9** |
| P2 | `git diff --name-only 89532174c..HEAD \| wc -l` | **183** |
| P3 | `git diff --shortstat 89532174c..HEAD` | `183 files changed, 8710 insertions(+), 8521 deletions(-)` |
| P4 | `git diff --name-only 52f1f1b25..HEAD` | `amadeus/spaces/default/elections/elections.json`（1 件、rc=0） |
| P5 | `git grep -n 'refs/heads/main:refs/remotes/origin/main' -- tests scripts packages plugins` | **2 hit** — `scripts/amadeus-leader-sync.ts:567` / `tests/integration/t245-amadeus-leader-sync.integration.test.ts:214` |
| P6 | `grep -c t245 tests/.test-time-factor-allowlist.json` | **0**（t245 は allowlist に無い） |
| P7 | `git ls-tree -r --long HEAD -- amadeus/spaces/default/elections \| wc -l` | **4150** ファイル |
| P8 | `git ls-tree -r --long HEAD -- amadeus/spaces/default/elections \| awk '{s+=$4} END {print s}'` | **8015636** bytes |
| P9 | `grep -n '\-\-ci' tests/run-tests.ts` | `:125` `--ci            smoke + unit + integration` |
| P10 | `git ls-files \| grep -i team-up`（差分区間の確認用） | 正本パス **0**（record / re-scan のみ。#2975 で削除済み） |

## Developer scan の主要所見（observed 断面で verbatim 再確認済み）

### F1. `gitStdout` ヘルパは無条件 assert

`tests/integration/t245-amadeus-leader-sync.integration.test.ts:78-83`。`spawnGit` の結果を `expect(result.kind).toBe("ok")` で無条件検査し、skip / guard 分岐を持たない。同ファイル内の全 git 実行がこのヘルパ経由であるため、**git 失敗はすべてテスト失敗に直結する**設計になっている。

### F2. 患部テスト — 実 `origin` へ fetch する唯一の自動テスト

`:208-226` の `sweeps every origin/main election file through real selfCheck and exclusions`。

| 行 | 内容 |
|---|---|
| `:209` | `const projectDir = process.cwd();`（= 実リポジトリ本体） |
| `:210-212` | `mkdtempSync` は **worktree 置き場だけ**を作る。リポジトリ本体は実クローン |
| `:213-215` | `gitStdout(["fetch", "origin", "+refs/heads/main:refs/remotes/origin/main"], projectDir)` |
| `:216` | `gitStdout(["worktree", "add", "--detach", root, "origin/main"], projectDir)` |
| `:226` | timeout = `scaleTestTime(120_000)`（コメント: `full origin/main corpus plus real Git worktree I/O can exceed Bun's 30s default on CI`） |

同ファイル内で **fixture 化されていない唯一のテスト**である。

### F3. `origin` 不在時の失敗様式（scratch 実測）

`git fetch origin +refs/heads/main:refs/remotes/origin/main` → exit 128 / `fatal: 'origin' does not appear to be a git repository`。プロダクト側の `spawnCommand`（`scripts/amadeus-leader-sync.ts:344-361`）はこれを `kind: "error"` へ正しく変換しており、赤くなるのは F1 の無条件 `expect`。**プロダクトの欠陥ではなくテストの環境前提の欠陥**である。

### F4. 同ファイルが持つ自己完結 fixture の様式（既存の正解形）

`:106-133` の `prepare materializes origin/main in a single-branch shallow clone` は、`mkdtempSync` で remote（bare）/ source / clone の 3 ディレクトリを作り `roots.push` → `git init --bare` → source で `init -b main` → `config user.*` → seed commit → `remote add origin <bare>` → `push` → `clone --depth 1 --single-branch`。cleanup は `afterEach` の一括 `rmSync(roots)`。

同ファイルの他の fetch 系テスト、および t207 / t433 / t222 / t-codex-hooks-migration も**すべて自己完結 fixture**である。P5 のとおり、実 `origin` を参照するのは t245 のこの 1 件だけ。

### F5. テストが検証している面と、fixture 化に必要な最小 corpus

`resolveOwnedSet`（`scripts/amadeus-leader-sync.ts:164`）が `elections/` 配下の全ファイルを `electionPaths` に載せ、`checkExclusions`（`:214`）、`selfCheck`（`:234`）→ `analyzeOwnedContents`（`:249`）が `isPureAddition` + `inspectContent`（JSON parse 成功、コンフリクトマーカー 0）を判定する。

- **fixture 化に必要な最小 corpus**: `elections/` 配下 1 件以上（JSON parse 可、マーカーなし）。
- **現行テストの実際の価値**: 実 corpus の全数掃引 — observed で **4150 ファイル / 8,015,636 bytes**（P7 / P8）。
- 合成シェイプのテストは `:175-206` が既にカバーしており、fixture 側の観点は重複する。

### F6. ランナー配線と CI プロファイルへの影響

`tests/run-tests.ts:125` のとおり `--ci` は smoke + unit + integration。t245 は `tests/integration/` 直下にあり、**PR blocking の必須集合に含まれる**。また `tests/.test-time-factor-allowlist.json` に t245 のエントリは無い（P6）ため、`scaleTestTime(120_000)` は allowlist 免除ではなく通常適用である。

## `base..observed` 差分区間（患部外）

183 ファイル / `+8710 / −8521`。t245 テスト本体および `scripts/amadeus-leader-sync.ts` への変更は**含まれない**（`git diff --name-only 89532174c..HEAD` に両パスの出現なし）。主要テーマ:

| コミット | 内容 |
|---|---|
| `8b6089275`（#2975） | `team-up.sh` ランチャと `team-up-codex-safety-wait.ts` の削除（P10） |
| `86feb2ee5`（#2980） | settled な run-now advisory を再質問せず handoff stage へ回す修正 |
| `0fbbec42b`（#2986） | Lifecycle Guard Runtime の 4 checkpoint 導入 |
| `52f1f1b25` / `5f6b5bf97`（#2990 / #2992） | record 同梱ノルム（E-260813-RECORD-BUNDLING-NORM）の整合と選挙ストア索引登録 |
| `689b2d288` / `7f1363938` / `490e71cf1` | metrics snapshot（record 更新） |

## 修正方式の論点（**裁定は requirements-analysis へ申し送り**）

Issue #2971 の完了条件は「`origin` を持たないクローンでも t245 が構造的に赤くならないこと」。観測から導ける方式は 2 系統で、**検出力のトレードオフが相反する**ため RE では選定しない。

| 方式 | 概要 | 得るもの | 失うもの |
|---|---|---|---|
| **A: fetch 除去し HEAD 掃引へ** | `fetch origin` と `worktree add origin/main` をやめ、`process.cwd()` の HEAD（または `git worktree add --detach HEAD`）で実 corpus を掃引する | 実 corpus 全数掃引（4150 ファイル）の検出力を保つ。変更が小さい | `origin/main` 断面という検証対象を HEAD 断面へ置換する。ローカル未 push 差分の影響を受けうる |
| **B: bare origin fixture 化** | `:106-133` の様式（F4）に合わせ、bare remote + seed commit を `mkdtempSync` 下に構築して `origin/main` を作る | 環境非依存が完全になり、同ファイルの既存様式と一致する | 掃引 corpus が合成の最小集合（1 件以上）へ縮小し、**実 corpus 全数掃引の検出力を失う**（`:175-206` の合成シェイプテストと観点が重複する） |

論点として requirements/design が裁定すべきこと:

1. このテストが守るべき契約は「実 corpus 全数の健全性」か「`origin/main` 断面という参照点」か。前者なら A、後者なら B が整合する。
2. `scaleTestTime(120_000)` の扱い — B を採ると実行時間の根拠（実 corpus + 実 worktree I/O）が消えるため、timeout 値も同じ変更で見直す必要がある。
3. A を採る場合、実 corpus 掃引を CI の必須集合に残すか、別 tier（`--release` 等）へ移すか。

## 未実測・推測として明示する項目

- **UNMEASURED-1**: `origin` なしクローンでの t245 実行そのもの（フルスイート実行）は本スキャンでは行っていない。F3 は scratch での `git fetch origin` 単体の再現に基づく（プロダクト変換と `expect` 位置は静的に PROVEN）。
- **UNMEASURED-2**: 差分区間 183 ファイルの分類はコミット単位の要約であり、各ファイルの実読は患部関連パスに限定した。
- **UNMEASURED-3**: 方式 A における「HEAD 断面掃引での検出力低下の実量」（`origin/main` と HEAD の corpus 差分件数）は未測定 — 設計段で測る対象。

## 更新した成果物

- `code-quality-assessment.md` — 新現在節「t245 の環境前提欠陥」（Q-A〜Q-D と CI プロファイルへの影響）。直前の現在節（`260813-lifecycle-guard-runtime`）は本文保持のまま履歴へ降格（`cid:reverse-engineering:c3-relabel`）。
- `code-structure.md` — `260813-remove-team-up` 節を履歴へラベル変更し、observed `5f6b5bf97` では当該パスが削除済み（#2975 / `8b6089275`、P10）である旨を注記（`cid:reverse-engineering:c1`）。
- `reverse-engineering-timestamp.md` — 本スキャンの実行メタデータを現在節として追記、直前を履歴へ降格。
- 本ファイル（新規）。

**Reviewed-and-unchanged artifacts**（沈黙のスキップではなく、レビュー済みで無変更）: `architecture.md`（患部はテストの環境前提であり構成要素間の関係に変化なし）/ `component-inventory.md`（差分区間の team-up 記述は既に履歴節の中にあり、本 intent の焦点面と交差しない）/ `api-documentation.md`（`scripts/amadeus-leader-sync.ts` の公開契約は区間内無変更）/ `dependencies.md` / `technology-stack.md`（`base..observed` で依存・ランタイムの変化なし）/ `business-overview.md`。**この 6 面は本 intent の節を持たないため、後続ステージがここから本 intent の事実を引いてはならない**（`cid:requirements-analysis:c4-consume-header-is-not-citable-content`）。

## 適用範囲外（明示）

方式 A / B の選定、`scaleTestTime(120_000)` の去就、実 corpus 掃引を CI 必須集合に残すかの判断、および同型の環境前提を持つ他テストの探索範囲は、いずれも requirements-analysis / application-design の所掌である。
