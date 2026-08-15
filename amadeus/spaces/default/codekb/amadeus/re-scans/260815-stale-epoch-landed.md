# リバースエンジニアリング差分スキャン記録: 260815-stale-epoch-landed

## 0. メタデータ

| 項目 | 値 |
|---|---|
| Date | `2026-08-15` |
| Intent | `260815-stale-epoch-landed` |
| Scope / depth / project type | `self-fix` / Minimal / Brownfield |
| Repository | `amadeus`（単一 repo、root `/Users/j5ik2o/orca/workspaces/amadeus/bugfix-0815-0`） |
| Base commit | `78146f435a66680055a24144937b5aa03d48bfb4`（前回 observed = 260815-per-unit-outcome） |
| Observed commit | `83e1dbeefb3278a00e86f69d3c79071a35ccf043`（`origin/main` tip） |
| Scan mode | **通常の差分リフレッシュ**（xrev differential 不採用。理由は §1） |
| Focus | [Issue #3110](https://github.com/amadeus-dlc/amadeus/issues/3110)（P2 / S3-MAJOR）— stale created attestation × MERGED PR に最終化経路がない |
| 一次記録（機序） | Issue #3110 の 2 件のクロスレビューコメント（`review-run-id: xrev-3110-20260815T114717Z`） |

**祖先性と距離**（`cid:reverse-engineering:rescan-base-ancestry`）:

- `git merge-base --is-ancestor 78146f435a 83e1dbeef` → **exit 0**
- `git rev-list --count 78146f435a..83e1dbeef` → **4**

## 1. Scan mode の選択 — xrev differential を採らない理由

`cid:reverse-engineering:c5-xrev-currency-schema-migration` の判定手順を適用した。

1. **review 断面以後に患部の表現形式を変える移行 PR が着地しているか** → **していない**。クロスレビューの `target-sha` は `920790ba7fbaea5f58b5637268782df89e496cc2`、observed は `83e1dbeef` で、その間に `plugins/github-pr-convergence/` は 1 バイトも動いていない（`git diff --quiet 78146f435a 83e1dbeef -- plugins/github-pr-convergence/` → **exit 0**）。スキーマ・セレクタ形式・ファイル様式の移行は存在しない。
2. したがって currency 条件は成立しうるが、**区間距離が 4 コミット・患部が全域無変更**であり、xrev differential mode を採る利得（レビュー済み断面のスキップ）がほぼゼロである。通常の差分リフレッシュで base..observed 全域を棚卸しするほうが安価かつ完全であるため、**通常モードを選択**した。
3. クロスレビューの引用は背景としてではなく**一次記録**として用いる（§3）。ただし引用の currency は observed 断面で全件再照合した（§2）。

## 2. 測定述語と実測値

すべて observed tree（`83e1dbeef`、worktree clean）に対して実行した。

### 2.1 区間規模

| 述語 | 結果 |
|---|---|
| `git diff --shortstat 78146f435a 83e1dbeef` | **110 files changed, 4856 insertions(+), 59 deletions(-)** |
| `git diff --shortstat 78146f435a 83e1dbeef -- ':!amadeus/' ':!metrics/'` | **17 files changed, 565 insertions(+), 37 deletions(-)** |
| `git diff --name-only 78146f435a 83e1dbeef -- ':!amadeus/' ':!metrics/' ':!tests/' \| wc -l` | **8**（非テスト） |
| `git diff --name-only --diff-filter=A 78146f435a 83e1dbeef -- 'tests/**' \| wc -l` | **0**（新規テストファイルなし） |
| `git diff --name-only --diff-filter=M 78146f435a 83e1dbeef -- 'tests/**' \| wc -l` | **9**（変更テスト） |

区間の 4 コミット（`git log --oneline 78146f435a..83e1dbeef`）: `83e1dbeef` record checkpoint #3111 / `cc2f3df5b` metrics #3108 / `822d1ec4b` record checkpoint #3107 / `b9615ffb8` PR #3105（`fix(#3099)`）。**全量が intent 260815-per-unit-outcome へ帰属**する。

### 2.2 患部の可動性

`git diff --quiet 78146f435a 83e1dbeef -- <path>` を個別適用（**全件 exit 0**）:

`plugins/github-pr-convergence/`（ディレクトリ全域）/ `tools/pr-convergence-cli.ts` / `tools/pr-convergence-gh-runner.ts` / `tools/amadeus-sensor-pr-convergence-report-format.ts` / `stages/pr-convergence.md` / `tools/pr-convergence-attestation.ts` / `tools/pr-convergence-predicate.ts` / `tests/integration/t3062-pr-convergence-landed-finalization.integration.test.ts` / `tests/integration/t448-pr-convergence-cli.integration.test.ts`

### 2.3 引用の currency 再照合（observed 断面で逐語、5/5 一致）

| 引用 | observed での実測 |
|---|---|
| `pr-convergence-cli.ts:746-748` | `report attestation is stale: the PR head advanced to ${heads.prHead} since this report was attested at ${receipt.prHead}. ` + `"Push the current HEAD, then run the create verb again for this pull request to open a new created epoch; "` + `"the existing pull request is reused, never closed and reopened.\n"` |
| `pr-convergence-cli.ts:597-604` | `function transitionAllowed(current, next)`。許可 arm は `:602` 逐語 `if (current === "created") return next === "converged" \|\| next === "override" \|\| next === "landed";`、`:598-601` のコメントが「merge-queue finalisation (#3062)」と説明 |
| `pr-convergence-gh-runner.ts:322` | `"--state", "open",`（`fetchOpenPrForHead` の `gh pr list` 引数） |
| `amadeus-sensor-pr-convergence-report-format.ts:391-393` | `if (stage === "pr-convergence" && kind === "created") { findings.push({ field: "kind", reason: "created proves PR delivery only; final convergence requires converged or override" }); }` |
| `stages/pr-convergence.md:344-346` | `A merged pull request needs no ruling — \`report\` records it as \`landed\`.` |

**追加で確定した拒否順序**（`grep -n "attestationBindsIdentity\|selfContextFor\|currentSelfContext\|reportOutcome" plugins/github-pr-convergence/tools/pr-convergence-cli.ts` からの転記）: `:614` `selfContextFor` 定義 → `:624` `currentSelfContext` へ委譲 → `:627` `currentSelfContext` 定義 → `:669` 拒否条件 `!attestationBindsIdentity(receipt, work, heads, options.ref)` → `:714` `attestationBindsIdentity` 定義 → `:1256` `reportOutcome` 定義 → **`:1370` `selfContextFor(...)` 呼び出し** → **`:1398` `if (options.verb === "report") return reportOutcome(...)`**。すなわち head 束縛は verb 分岐より **28 行上流**で評価される。

**sensor の head 検査**: `:289` `findings.push({ field: "local head", reason: "does not match the current checkout" });`（`grep -n "local head" <sensor>` → 該当 1 行。同語は `pr-convergence-attestation.ts:82` / `:115` / `:166` にも書式・型・parse として現れる）。

**ファイル規模**（`wc -l`、observed）: cli 1468 / gh-runner 354 / sensor 実装 432 / stage 文書 431。

### 2.4 テスト空白

| 述語 | 結果 |
|---|---|
| `grep -rn "attestation is stale" tests/` | **0 行・exit 1**（grep の exit 1 = エラーなく不一致。エラーは exit 2） |
| `grep -c "stale" tests/integration/t447-pr-convergence-ledger.integration.test.ts` | 0 |
| `grep -c "stale" tests/integration/t448-pr-convergence-cli.integration.test.ts` | 0 |
| `grep -c "stale" tests/integration/t449-pr-convergence-packaging-e2e.integration.test.ts` | **3** — ただし `:254` `mode: … "stale" …` / `:273` `bolt-plan.md` 改竄 / `:490` `["stale", "STALE"]` はすべて **bolt-plan の staleness** であり attestation とは無関係 |
| `grep -c "stale" tests/integration/t3062-pr-convergence-landed-finalization.integration.test.ts` | 0 |

**t3062 が本件を捕らえない構造的理由**（`grep -n "headSha\|prHead\|commit\|HEAD" <t3062>` からの転記）: `:123` `git(["commit", "--quiet", "-m", "seed"], root);` で seed commit を 1 度だけ作り、`:124` `const head = git(["rev-parse", "HEAD"], root);` で取得。`:134` の gh スタブが `"rev-parse HEAD": { code: 0, stdout: \`${f.head}\n\` }` を**全呼び出しで同一値**返却するため、create 時と report 時の head が構造的に一致し `attestationBindsIdentity` を常に通過する。冒頭コメント `:6-11` も想定シナリオを「auto-merge が report より先に landed した」ケースに限定している（ファイル全体 **285** 行）。

### 2.5 台帳

| 述語 | 結果 | 判定 |
|---|---|---|
| `grep -c "github-pr-convergence" amadeus/spaces/default/specs/tla/model-map.json` | **0**（exit 1） | resync 不要 |
| `grep -c "pr-convergence-cli.ts" tests/.coverage-patch-allowlist.json` | **3**（`:4388` / `:4399` / `:4410`） | 要 re-anchor 判定 |
| `grep -c "pr-convergence" tests/.coverage-registry.json` | **2**（`:1177` / `:1610`、いずれも `tests/integration/t2996-pr-convergence-scope-grid.integration.test.ts`） | 新規テストファイル追加時のみ regen |

allowlist 3 セレクタの `function`（同 JSON の `selector.function`）: `nodeDecisionEmitter`（anchorLines 17 / targetLines `1-17`）/ `selfReportLifecycle`（5 / `4-4`）/ `<module>`（4 / `1-4`）。**`selfReportLifecycle` の `expiry` は逐語 `remove if the lifecycle is ever callable without the currentSelfContext head binding`** であり、その `reason` は免除の根拠を `attestationBindsIdentity already requires receipt.prHead === heads.prHead and refuses a mismatch with exit 1 first` に置いている。

### 2.6 依存・スタック・公開契約

| 述語 | 結果 |
|---|---|
| `git diff --stat 78146f435a 83e1dbeef -- package.json bun.lock '**/package.json'` | **出力は空**（外部依存の変化なし） |
| `git diff --numstat 78146f435a 83e1dbeef -- packages/framework/core/otel/event-registry.ts` | **+16 / −2** |
| `grep -c "UNIT_OUTCOME_SETTLED" packages/framework/core/otel/event-registry.ts` | **1**（区間で新設） |
| `tests/integration/event-registry-drift.test.ts:50-54` | 基数を **93** に pin（`EXPECTED_CANONICAL_COUNT` / `canonicalAuditEvents().length` / `SETS.registryCanonical.size` / `SETS.auditVocabulary.size` すべて 93） |

## 3. 主要知見のポインタ

機序の**一次記録は Issue #3110 の 2 件のクロスレビューコメント**であり、本スキャンは再導出していない。以下は codekb 側の写像先である。

| 知見 | 一次記録 | codekb の写像先 |
|---|---|---|
| 拒否順序が `created → landed` を dead code にしている | #3110 reviewer-1 コメント（反証ハントの節） | `architecture.md` §1、`code-structure.md` の patch surface 表、`dependencies.md` の依存方向図 |
| head 不動なら landed は正しく書ける（隙間は head 前進ケースのみ） | #3110 reviewer-2 コメント（C3/C6 の精緻化） | `architecture.md` §1、`code-quality-assessment.md` の t3062 分析 |
| 原因は record checkpoint 同梱に限らず create 後の任意の push | #3110 reviewer-2（C7 の一般化、obb6 audit shard seq1→seq4）+ reviewer-1 への conductor 補完実測（PR #3081 の attested head `144ffa39d` が merged head `23f5968d8` の祖先） | `architecture.md` §4、`business-overview.md` |
| 根 = #3062 選挙の設問スコープが head-integrity ゲートとの交差を含まなかった | #3110 reviewer-2（機序の根） | `architecture.md` §4 |
| 規範衝突（`team.md` の同梱可 × CLI の head 不動要求） | #3110 reviewer-1 FOLLOW-UP | `architecture.md` §4 の対照表 |
| read-back の欠落で create 再実行が新規 PR を開く | Issue #3110 本文（PR #3109 の誤作成実測） | `architecture.md` §2、`component-inventory.md` |
| S3-MAJOR の格上げ検討 | #3110 reviewer-2 FOLLOW-UP（`bug.yml` の S1-FATAL 定義と実測 park の突合） | `code-quality-assessment.md` の付随所見 |
| 同一クラスの残余 3 unit（260814-plugins-rename-drift） | #3110 reviewer-2（静的発見） | `architecture.md` §5、`business-overview.md` |
| テスト空白と allowlist `selfReportLifecycle` の去就 | 本スキャンの実測（§2.4 / §2.5） | `code-quality-assessment.md` |

## 4. 訂正・申し送り

- **上流入力からの訂正なし。** conductor から渡された実測（区間帰属、`plugins/github-pr-convergence/**` 無変更、引用 5/5 の currency、テスト空白、台帳 3 種）はすべて observed 断面で再現し、不一致は 1 件も出なかった。
- **表記上の注意（新規に確定）**: sensor の manifest と実装はファイル名プレフィックスもディレクトリも異なる — manifest `plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md`、実装 `plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts`。`sensors/` 配下に `.ts` は存在しない（`ls plugins/github-pr-convergence/sensors/` → 1 エントリ、md のみ）。本スキャンでも初回の照合で `sensors/` 配下の `.ts` を引いて `No such file or directory` を踏んでおり、後続成果物では実装パスを必ず `tools/` で引くこと。
- **未検証面**: 是正方式の選択（report 側で stale 免除 / create 側で MERGED read-back / 折衷）、重大度の格上げ可否、`selfReportLifecycle` allowlist エントリの去就は、いずれも**本スキャンでは決めていない**（後続の裁定事項、`memory/team.md` P1）。フルスイート・coverage・`bun run build` は未実行（本スキャンは読取専用）。
- **同一クラス残余の扱い**: `260814-plugins-rename-drift` の 3 unit を是正の受け入れ条件に含めるか（修正後に最終化できることを実証するか）は要判断。`260813-remove-team-up`（#2975）/ `260814-autonomy-stop-fixes`（#3037）は record 内で確定できず、候補に留まる。

## 5. Verification

- git 状態変更（commit / branch / checkout / stash / merge）: **ゼロ**
- GitHub 書込: **ゼロ**（`gh issue view 3110` の読取のみ実行）
- engine / state ツール実行（`amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-log.ts` / `amadeus-bolt.ts`）: **ゼロ**
- `bun run build`: **未実行**
- 書き込み範囲: `amadeus/spaces/default/codekb/amadeus/` 配下のみ（本体 8 面 + `reverse-engineering-timestamp.md` + 本ファイル）
