# リバースエンジニアリング差分スキャン記録: 260818-priority-bug-batch-4

## 0. メタデータ

| 項目 | 値 |
|---|---|
| Date | `2026-08-18`（UTC） |
| Intent | `260818-priority-bug-batch-4` |
| Scope / depth / project type | `self-fix` / Minimal / Brownfield |
| Repository | `amadeus`（単一 repo、root `/Users/j5ik2o/orca/workspaces/amadeus/fix-0818-2`） |
| Branch | `fix-0818-2`（HEAD == `origin/main`） |
| Base commit | `23d4ae767956cd56fc28fa78abe28096712eff8a`（**選定根拠**: `re-scans/` 中で HEAD の祖先である observed のうち最も新しいもの = 前回スキャン 260817-inception-cost-batch の observed。`git merge-base --is-ancestor 23d4ae767956cd56fc28fa78abe28096712eff8a HEAD` → **exit 0**、距離 **5**） |
| Observed commit | `127be70c5d7a584016f88a5d44e8715904020721`（`git rev-parse HEAD`。`git rev-parse origin/main` と**同一コミット**、drift 0） |
| Scan mode | **通常の差分リフレッシュ**（xrev differential 不採用。理由は §1.1） |
| Focus | [#2837](https://github.com/amadeus-dlc/amadeus/issues/2837)（`invoke-swarm` directive が実行に必要な batch 番号と convergence check コンテキストを欠く）+ [#3106](https://github.com/amadeus-dlc/amadeus/issues/3106)（per-unit 経路の cancelled unit が settle されず `producer-outcome-pending` が残る） |
| 分担 | Developer scan（`amadeus-developer-agent`）→ 本 Architect synthesis。本記録の実測値は出典を「Developer scan §N」と「本 synthesis の再実行」で書き分ける |

**祖先性と距離**（`cid:reverse-engineering:rescan-base-ancestry`、いずれも本 synthesis の再実行）:

- `git merge-base --is-ancestor 23d4ae767956cd56fc28fa78abe28096712eff8a HEAD` → **exit 0**
- `git rev-list --count 23d4ae767..127be70c5` → **5**

**drift**: `git rev-parse HEAD` と `git rev-parse origin/main` がいずれも `127be70c5d7a584016f88a5d44e8715904020721` を返す（本 synthesis の再実行）。`git fetch` は実行していないため、これはローカルの remote-tracking ref との一致である。

**Focus の由来と消費の仕方**（RE stage 契約が本区間で新設した規則に従う）:

本 intent の focus は `<record>/ideation/intent-capture/issue-evidence.md`（`issue-evidence fetch` verb が `2026-08-18T07:07:50Z` に取得、`target-sha: 127be70c5…`）から導出した。両 Issue とも独立クロスレビュー **2 名**が成立している（marker 計数、`review-run-id: xrev-2837-20260818` / `xrev-3106-20260818`）。

**クロスレビューが確立した事実は所与として消費し、再導出していない。** 本スキャンが行ったのは、その事実が名指す機構の **observed 断面での現在形確認**である。具体的には次の 2 点を確認した:

1. 名指された file:line が observed で実在し、意味論が一致すること（§3 の各表）
2. 起票・レビュー以後に是正が着地していないこと（§3.0 の grep）

**再現実験は行っていない。** #3106 のクロスレビューは fixture プロジェクトでの実 CLI 再現（`resolve-failure --user-input Skip` → `producer-outcome-pending: unit-z`）を記録しているが、これは確立事実として受け取り、本スキャンでは再実行していない（`memory/team.md` P2 の「実測事実のみ」に対し、本記録は**確立事実の所与消費**と**自身の実測**を §3 の各行で書き分ける）。

**focus が覆う主張**: #2837 側は Claim ledger の C1〜C4 / C6 / C13 / C17（directive 契約・batch 破棄点・pool identity・読取経路不在・テスト空隙）を覆う。#2837 の Issue には根の異なる 5 件（stale `Bolt Refs` の復旧手順、Stop hook の batch 途中誘導、`finalize` の Git 未統合、`prepare` の既定 base）が束ねられており、レビュアー 2 名とも**分割を推奨**しているが、**本スキャンの focus は「directive が batch identity を運ばない」中核主張に限定**した。#3106 側は C1〜C5 / C7 / C8（settle のスキップ条件・閉語彙・非対称の所在・復旧手順不在）を覆う。

## 1. Scan mode と区間の分類

### 1.1 xrev differential を採らない理由

`cid:reverse-engineering:c5-xrev-currency-schema-migration` の判定手順を focus 2 件へ適用した。

1. **患部の表現形式そのものを変える移行が、クロスレビュー断面と observed の間に挟まっているか** → **2 件とも No**。クロスレビューの `target-sha` は `127be70c5…` であり、**observed と同一コミット**である（`issue-evidence.md` の各 Issue 節ヘッダから転記）。したがってレビュー断面と observed の間に diff が存在しない。
2. currency 条件は自明に成立するが、**xrev differential mode を単独で採る利得が無い**（レビュー verdict の行ピンをそのまま使えるため、差分スキャンで取り直す対象は「区間で何が変わったか」だけになる）。したがって**通常の差分リフレッシュ**とした。
3. 本記録の focus 節（§3）の file:line は**すべて observed `127be70c5` 断面で本 synthesis が取り直している**（レビュー verdict からの転記ではない）。

### 1.2 区間の構成 — 前 intent の 2 unit 全着地

`git log --oneline 23d4ae767..127be70c5`（本 synthesis の実測、5 行）:

| コミット | PR | 種別 |
|---|---|---|
| `d8834194f` | [#3190](https://github.com/amadeus-dlc/amadeus/pull/3190) | code — [#3181](https://github.com/amadeus-dlc/amadeus/issues/3181): クロスレビュー済み Issue 証跡を一級上流入力として consume する |
| `0cfd3eeb5` | [#3192](https://github.com/amadeus-dlc/amadeus/pull/3192) | record only（metrics snapshot） |
| `43a2e2978` | [#3191](https://github.com/amadeus-dlc/amadeus/pull/3191) | code — [#2415](https://github.com/amadeus-dlc/amadeus/issues/2415): reverse-engineering のスキャン入力から workflow exhaust を除外する |
| `ba5ad32d5` | [#3193](https://github.com/amadeus-dlc/amadeus/pull/3193) | record only（intent 260817-inception-cost-batch の最終 checkpoint） |
| `127be70c5` | [#3195](https://github.com/amadeus-dlc/amadeus/pull/3195) | record only（metrics snapshot） |

**コード知識を持つのは 2 コミットのみ**である。区間はアプリケーションドメインのコードを一切含まず、全変更が Amadeus 自己開発である。

**前スキャンの仮説はどちらも予測どおり着地した**（前スキャン §3.5 の H1 / H2）:

- **H2**（#3181 が 3 つ目の read-only gateway adapter として実装される）→ **そのとおり**。`createEvidenceGitHubGatewayAdapter`（`amadeus-github-gateway.ts:1089`）が既存 2 種に並ぶ形で追加され、`:1070-1075` の逐語が `the only wholly read-only one … it takes no permit` と明記する。
- **H1**（#2415 の除外規則の置き場は Preflight ではなく Step 2 の入力列挙付近）→ **そのとおり**。`reverse-engineering.md` の入力列挙（7 bullet）の**直後**に `#### Scan input exclusions (differential refresh)` が新設された。

### 1.3 区間の path 分類

**再実行可能な集計述語**（本 synthesis の実測、exit 0。`awk` の正規表現リテラル中で `/` を含む文字クラスが書けないため、繰り返し部分を変数 `q` で渡している）:

```bash
git diff --numstat 23d4ae767..127be70c5 | awk -v q="[^/]+" '
{ ins=$1+0; f=$3;
  if      (f ~ ("^amadeus/spaces/" q "/intents/"))   b="intents";
  else if (f ~ ("^amadeus/spaces/" q "/codekb/"))    b="codekb";
  else if (f ~ ("^amadeus/spaces/" q "/elections/")) b="elections";
  else if (f ~ ("^amadeus/spaces/" q "/specs/"))     b="specs";
  else if (f ~ ("^amadeus/spaces/" q "/memory/"))    b="memory";
  else if (f ~ /^metrics\//) b="metrics";
  else if (f ~ /^tests\//)   b="tests";
  else if (f ~ /^docs\//)    b="docs";
  else                       b="source_other";
  I[b]+=ins; N[b]+=1; T+=ins; TN+=1 }
END { for (k in I) printf "%-14s %6d ins  %3d files\n", k, I[k], N[k];
      printf "%-14s %6d ins  %3d files\n","TOTAL",T,TN }' | sort -k2 -rn
```

| バケット | insertions | files |
|---|---|---|
| `intents` | 3,369 | 61 |
| `tests` | 1,804 | 16 |
| `codekb` | 1,207 | 9 |
| `source_other`（= `packages/` + `plugins/`） | 714 | 6 |
| `metrics` | 182 | 2 |
| `docs` | 33 | 4 |
| `memory` | 5 | 1 |
| `elections` | **0** | **0** |
| `specs` | **0** | **0** |
| **TOTAL** | **7,314** | **99** |

**バケットの健全性検証**（本 synthesis の独立実行）: `git diff --numstat 23d4ae767..127be70c5 -- packages/ plugins/ docs/ .github/` の `--name-status` は **`M` 10 行**で、`packages/` + `plugins/` の insertions 714 と `docs/` の 33 の合計 747 に一致する。`memory` の 1 件は `amadeus/spaces/default/memory/project.md`（+5 −0）。

### 1.4 **除外削減の記録**（#2415 の RE stage 契約が義務づける）

本区間から `RE_SCAN_EXCLUDED_PATHSPECS`（`packages/framework/core/tools/amadeus-lib.ts:1540` の 5 pathspec）を適用した実測（いずれも本 synthesis の実行、exit 0）。

**除外なし**:

```bash
git diff --shortstat 23d4ae767..127be70c5
```

→ **99 files changed, 7314 insertions(+), 61 deletions(-)**

**除外あり**（契約散文が載せる pathspec を逐語で使用）:

```bash
git diff --shortstat 23d4ae767..127be70c5 -- . \
  ':(exclude,glob)amadeus/spaces/*/intents/**' \
  ':(exclude,glob)amadeus/spaces/*/elections/**' \
  ':(exclude,glob)amadeus/spaces/*/codekb/**' \
  ':(exclude,glob)amadeus/spaces/*/memory/**' \
  ':(exclude,glob)metrics/**'
```

→ **26 files changed, 2551 insertions(+), 53 deletions(-)**

| 指標 | 除外なし | 除外あり | 削減 |
|---|---|---|---|
| insertions | **7,314** | **2,551** | **4,763** |
| files | **99** | **26** | **73** |

**削減率 65.12%**（派生値、算出式 `4763 / 7314 = 0.6512`）。ファイル数ベースでは **73.74%**（派生値、算出式 `73 / 99`）。

**クラス別内訳**（§1.3 の集計から転記、除外対象クラスのみ）:

| クラス | insertions |
|---|---|
| `amadeus/spaces/*/intents/**` | 3,369 |
| `amadeus/spaces/*/codekb/**` | 1,207 |
| `metrics/**` | 182 |
| `amadeus/spaces/*/memory/**` | 5 |
| `amadeus/spaces/*/elections/**` | **0** |
| **合計** | **4,763** |

**突合**: 4,763 = 7,314 − 2,551（一致、本 synthesis の突合）。

**`amadeus/spaces/*/specs/` は 0 insertions** であり、本区間では非除外の判断が結果に影響していない。ただし前区間（`89053172e..23d4ae767`）では 4 insertions / 2 files（`specs/tla/model-map.json` +3 −3、`specs/tla-evidence/…` +1）が存在し、除外していれば TLA ビルド台帳の resync を見落としていた。契約が `specs/` を意図的に非除外とする判断は、**前区間の実測に根拠がある**。

**参考: 契約に記録された初回測定**。`reverse-engineering.md` の Scan input exclusions 節は逐語で `First measurement on this repo, interval 89053172e..23d4ae767 (2026-08-18): 8023 insertions before the exclusion, 3066 after — 61.8% of the interval was exhaust.` と記す。本区間の 65.12% はそれに続く 2 回目の測定である。

### 1.5 構造変化 — 新規ソース 0 / 削除 0 / 変更 10

| 述語 | 結果 | 出典 |
|---|---|---|
| `git diff --name-status 23d4ae767..127be70c5 -- packages/ plugins/ docs/ .github/` | **`M` 10 行のみ**（`A` 0 / `D` 0） | 本 synthesis |
| `git diff --name-status 23d4ae767..127be70c5 \| awk '{print $1}' \| sort \| uniq -c` | **A 71 / M 28**（`D` は 0） | 本 synthesis |
| `git diff --name-only 23d4ae767..127be70c5 -- packages/framework/harness/` | **空出力・exit 0** | 本 synthesis |
| `git diff --name-only 23d4ae767..127be70c5 -- .github/` | **空出力・exit 0** | 本 synthesis |
| `git diff --stat 23d4ae767..127be70c5 -- package.json bun.lock '**/package.json'` | **空出力・exit 0** | 本 synthesis |

変更 10 面の規模（`git diff --numstat`、本 synthesis）: `amadeus-utility.ts` +337 −1 / `amadeus-github-gateway.ts` +210 −33 / `amadeus-lib.ts` +57 −0 / `stages/inception/reverse-engineering.md` +73 −1 / `stages/ideation/intent-capture.md` +30 −0 / `stages/inception/requirements-analysis.md` +7 −1 / `docs/reference/04-stages/inception.md` +24 −2 / 同 `.ja.md` +5 −1 / `docs/reference/04-stages/ideation.md` +2 −1 / 同 `.ja.md` +2 −1。

**`plugins/` は 1 ファイルも変更されていない**（変更ファイル一覧に不在、本 synthesis の実測）。

## 2. 測定述語と実測値（区間全域）

断りのない限り observed tree（`127be70c5`）に対して実行した。書き込みは `amadeus/spaces/default/codekb/amadeus/` 配下のみである。

### 2.1 新規 export — 8 シンボル

**gateway の export census**（本 synthesis の実測）: `git show <c>:packages/framework/core/tools/amadeus-github-gateway.ts | grep -c '^export '` → base `23d4ae767` **23** / observed `127be70c5` **28**（**+5**）。

| シンボル | file:line | 種別 |
|---|---|---|
| `commentsArgv` | `packages/framework/core/tools/amadeus-github-gateway.ts:189` | function |
| `RemoteGitHubIssueComment` | 同 `:478` | type |
| `parseIssueComments` | 同 `:550` | function |
| `EvidenceGitHubGateway` | 同 `:1077` | type（port） |
| `createEvidenceGitHubGatewayAdapter` | 同 `:1089` | function（adapter factory） |
| `RE_SCAN_EXCLUDED_PATHSPECS` | `packages/framework/core/tools/amadeus-lib.ts:1540` | const（`readonly string[]`） |
| `issueEvidencePath` | 同 `:5043` | function |
| `relativeIssueEvidencePath` | 同 `:5051` | function |

`amadeus-utility.ts` 側では `runIssueEvidenceFetch`（`:6824`）が export されている（`git grep -n "export async function runIssueEvidenceFetch"` の実測）。

### 2.2 テスト面

| 述語 | 結果 |
|---|---|
| `git diff --name-status 23d4ae767..127be70c5 -- 'tests/**' \| grep -E '^[AD]'` | **A 8 行 / D 0 行** |
| 新規 8 件の行数（`git diff --numstat`） | 248 + 167 + 453 + 191 + 131 + 273 + 175 + 56 = **1,694** |
| t2415 系（2 本） | **415 行** |
| t3181 系（6 本） | **1,279 行** |
| 既存テストの是正（`M`） | `t65.test.ts` +8 −2 / `t212-optional-produces.test.ts` +4 −1 / `t66.test.ts` +2 −2 / `t-coverage-mechanism-ratchet.test.ts` +2 −0 |

新規 8 件（`git diff --name-status` からの転記）:

```
A	tests/integration/t2415-re-scan-exclusion-contract.integration.test.ts
A	tests/integration/t2415-re-scan-exclusion.integration.test.ts
A	tests/integration/t3181-issue-evidence-contract.integration.test.ts
A	tests/integration/t3181-issue-evidence-fetch.integration.test.ts
A	tests/integration/t3181-issue-evidence-upstream-coverage.integration.test.ts
A	tests/unit/t3181-issue-evidence-artifact.test.ts
A	tests/unit/t3181-issue-evidence-gateway.test.ts
A	tests/unit/t3181-issue-evidence-path.test.ts
```

### 2.3 品質指標

**測定元**: `metrics/2026-08-17T12-24-08-673Z-0b652d2cd1a6.json`（base 側 = base 以前の最後の snapshot）と `metrics/2026-08-18T04-53-24-170Z-43a2e2978678.json`（observed 側 = 区間内最後）の `collectors.<name>.values` を `bun -e` で直読（本 synthesis の実行、exit 0）。区間内 snapshot は **2 件**。

| 指標 | base 側 | observed 側 | 差 |
|---|---|---|---|
| coverage percent | 93.39885723200531 | 93.41203240015948 | **+0.0132pp** |
| coverage hits / lines | 95788 / 102558 | 96064 / 102839 | +276 / +281 |
| test files / assertions | 1047 / 13939 | 1055 / 14030 | **+8** / +91 |
| failed files / assertions | 0 / 0 | 0 / 0 | 横ばい |
| unit_small / integration_medium | 270 / 583 | 273 / 588 | +3 / +5 |
| loc core / tests / scripts | 149387 / 386333 / 13092 | 150065 / 388125 / 13092 | +678 / +1792 / ±0 |
| ccn 関数数 / 閾値超過 / max | 7320 / 32 / 38 | 7340 / 32 / 38 | +20 / **±0** / ±0 |
| bugs total / open / closed | 400 / 13 / 387 | 405 / **13** / 392 | +5 / **±0** / +5 |

**coverage は 2 区間連続で上昇**（前区間 +0.0020pp → 本区間 +0.0132pp）。新規行の被覆率は **約 98.2%**（276/281、派生値、算出式併記）。

**test files +8 は新規テスト 8 件と一致**し、層の内訳（unit_small +3 / integration_medium +5）も新規ファイルの層分布（unit 3 / integration 5）と一致する。

**bugs の open は横ばい 13**。`closed` が 387 → 392（+5）、`total` が 400 → 405（+5）で同期しているため、区間内で 5 件がクローズされ、同数が新規に total へ入った形である。重大度分布は `s3_major` 191 → 192、`s4_minor` 81 → 85。

### 2.4 台帳（5 面、すべて同一区間内で resync 済み）

| 台帳 | 規模 | 内容 |
|---|---|---|
| `tests/.coverage-registry.json` | **+48 −5** | 新規 unitId 4 件（`function:issueEvidencePath` / `function:relativeIssueEvidencePath` / `function:RE_SCAN_EXCLUDED_PATHSPECS` / subcommand `amadeus-utility issue-evidence`）ほか |
| `tests/.coverage-patch-allowlist.json` | **+36 −0** | 免除エントリの追加（削除ゼロ） |
| `tests/.coverage-ratchet.json` | **+2 −2** | `function` **189 → 191** / `subcommand` **86 → 87** |
| `tests/integration/t-coverage-mechanism-ratchet.test.ts` | **+2 −0** | mechanism honesty 台帳へ integration 2 件（`t3181-issue-evidence-fetch` / `t3181-issue-evidence-upstream-coverage`） |
| `tests/fixtures/designer-export/export.json` | **+8 −0** | artifact 語彙 122 → 123 の投影同期 |

**TLA の `model-map.json` は本区間で不変**（`amadeus/spaces/default/specs/` は変更ファイル一覧に不在、§1.3 の集計で `specs` バケットが 0）。前区間では impl ハッシュピン 3 行が resync されていた。

### 2.5 stage 契約と graph モデルの変化

| 面 | file:line（observed） | 変化 |
|---|---|---|
| `stages/ideation/intent-capture.md` | `:14-15` | **`optional_produces: [issue-evidence]` を新設** |
| 同 | `:85-112`（本文 +30 行） | `#### Issue-first intents: capture the filing evidence` 節。`issue-evidence fetch` の実行手順と、**効果測定のベースライン 47 分 / 目標 35 分未満**を明記 |
| `stages/inception/requirements-analysis.md` | `:30-31` | `consumes:` に `issue-evidence`（`required: false`）を追加。6 → **7 件** |
| 同 | `:73-74` | Step 2 に PRIMARY input としての読取を追加。逐語 `Facts a cross-review has already established — mechanisms, file:line citations, acceptance criteria — are consumed, never re-derived.` |
| 同 | `:191` | `upstream-coverage` の括弧書きを **3 件 → 7 件全列挙**へ同期。あわせて逐語 `The sensor threads only the consumes whose artefact EXISTS on disk` を追加 |
| `stages/inception/reverse-engineering.md` | `:114-169`（+56 行） | `#### Scan input exclusions (differential refresh)` 節を新設 |
| 同 | `:230-242` | focus 導出を `issue-evidence.md` から行う手順（`:230`）と、**`consumes:` に載せない理由**（`:239`） |
| `tests/integration/t65.test.ts` | `:175-182` | 孤児 consume モデルを `produces ∪ optional_produces` へ是正 |
| `tests/integration/t212-optional-produces.test.ts` | `:275` | `optional_produces` census を `["intent-capture", "functional-design", "infrastructure-design"]` へ更新（**census の正本**） |

**`optional_produces` の実運用 census**（本 synthesis の実測）: `git grep -n "^optional_produces:" 127be70c5 -- 'packages/framework/core/amadeus-common/stages/**'` → **3 hit**（`stages/ideation/intent-capture.md:14` / `stages/construction/functional-design.md:17` / `stages/construction/infrastructure-design.md:19`）。**2 → 3 stage**、ideation phase の stage が初めて加わった。

## 3. Focus findings（現在形確認）

**本節の file:line はすべて observed `127be70c5` 断面で本 synthesis が逐語確認した。** クロスレビューが確立した事実は所与として消費し、本節はその機構が**現在も同じ形で存在するか**だけを確認する。事実と仮説は §3.4 で明示的に分離する。

### 3.0 是正着地の不在

| 述語 | 結果 |
|---|---|
| `git grep -n "3106" 127be70c5 -- packages/ plugins/ tests/ docs/` | **出力なし・exit 1**（`cid:reverse-engineering:c6-absence-predicate-exit-code` に従い exit code を確認 — exit 1 は「エラーなく不一致」、エラー時の exit 2 ではない） |
| `git grep -n "2837" 127be70c5 -- packages/ plugins/ tests/ docs/` | **2 hit・exit 0**。いずれも `tests/.coverage-patch-allowlist.json:183` / `:566` の `"fingerprint": "sha256:…"` 値の**内部文字列**であり、Issue 番号への参照ではない |

述語は単一の固定文字列であり、`cid:reverse-engineering:c6-ugrep-word-boundary` が警告する ERE の `\b` も、complexity limit に該当する長い選言も含まない。

### 3.1 #2837 — batch identity は engine 内に存在し、emit 境界で捨てられる

**directive の閉語彙**（`packages/framework/core/tools/amadeus-directive.ts`）:

| 面 | 行 | 内容 |
|---|---|---|
| 型 | `:312-331` | `InvokeSwarmDirective` = `kind` / `units: string[]` / `cap: number` / `repo?: string` / `prepared_batch?: string` / `retry_unit?: string` の **6 面** |
| 閉語彙 | `:555` | 逐語 `const INVOKE_SWARM_FIELDS = ["kind", "units", "cap", "repo", "prepared_batch", "retry_unit"] as const;` |
| 語彙表 | `:587` | 逐語 `"invoke-swarm": INVOKE_SWARM_FIELDS,` |
| 設計意図の宣言 | `:310-311` | 逐語 `the conductor reads the rest of the batch context off the compiled runtime graph, so this shape stays minimal.` |

**`batch` / `check_cmd` / `test_file` はいずれも不在**である。

**batch 番号の生成と破棄**（`packages/framework/core/tools/amadeus-orchestrate.ts`）:

| 面 | 行 | 内容 |
|---|---|---|
| 生成 | `:3906` | `function firstUncoveredBatch(batches, node, projectDir, recordPrefix, codekbCtx)` |
| 戻り型 | `:3912` | 逐語 `): { units: string[]; batchNumber: number } \| null {` |
| return | `:3929` | 逐語 `if (uncovered.length > 0) return { units: uncovered, batchNumber: index + 1 };` |
| 保持 | `:4026` | `SwarmSelection.pick` が `NonNullable<ReturnType<typeof firstUncoveredBatch>>` として batchNumber を保持 |
| **破棄** | **`:4294`** | 逐語 `emitConfiguredSwarm(projectDir, selection.value.pick.units);` — `pick.batchNumber` が渡されない |
| 受け側 | `:4074` | 逐語 `function emitConfiguredSwarm(projectDir: string, units: string[]): void {` — 第2引数は units のみ |

**非対称（同じ engine が batch を運ぶ 3 経路）**:

| 経路 | 行 | 内容 |
|---|---|---|
| gate 提示 | `amadeus-orchestrate.ts:3889` / 呼出 `:3971` | `batchGateQuestion(batch: number, units: string[])` — 人へ 1-origin 番号を開示 |
| retry arm | 同 `:4092-4106` | `preparedSwarmRetryDirective` が `prepared_batch` / `retry_unit` を搬送 |
| failure election | `amadeus-directive.ts:644-649` | `execute-failure-election` が `batch` を**必須フィールド**として搬送 |

**batch 値の下流での意味**（`packages/framework/core/tools/amadeus-swarm.ts`）:

| 面 | 行 | 内容 |
|---|---|---|
| pool identity | `:638` | 逐語 ``idempotencyKey: `unit-pool:${flags.batch}:initial-enqueue`,`` — batch 整数がそのまま durable な pool 鍵になる |
| `prepare` の既定 base | `:581` | 逐語 `const base = flags.base ?? currentBranch(repoCwd);` — 解決済み SHA ではなくブランチ名 |
| 有効 subcommand | `:1419` | 14 件（`prepare, check, retry, finalize, resolve, initial-enqueue, acquire, confirm-dispatch, record-reconciliation, settle-release, settle-release-requeue, settle-release-cancel-dependents, terminate-batch, late-result-observed`）。**`context` / `status` 相当の read-only verb は不在** |

**conductor 面の census**（本 synthesis の実測、**2 通りの述語を書き分ける**）:

| face | `git grep -c -- "--batch <n>"` | `git grep -c -- "--batch"` |
|---|---|---|
| `packages/framework/harness/claude/skills/amadeus/SKILL.md` | 6 | 7 |
| `packages/framework/harness/codex/skills/amadeus/SKILL.md` | 6 | 7 |
| `packages/framework/harness/kimi/skills/amadeus/SKILL.md` | 6 | 7 |
| `packages/framework/harness/kiro/skills/amadeus/SKILL.md` | 6 | 7 |
| `packages/framework/harness/kiro-ide/skills/amadeus/SKILL.md` | 6 | 7 |
| `packages/framework/harness/cursor/commands/amadeus.md` | 5 | 5 |
| `packages/framework/harness/opencode/commands/amadeus.md` | 5 | 5 |
| `packages/framework/harness/pi/skills/amadeus/SKILL.md` | **0** | **1** |

**「8 面中 7 面が `--batch <n>` の手動指定を要求する」は左列の述語で成立する。** pi の唯一の hit（右列、`:90`）は `acquire --batch <directive.prepared_batch>` であり、directive が運ぶ値を渡す形なので手動指定ではない。

### 3.2 #3106 — 1 つの監査ストリームに対する 2 つの読み口の非対称

**settle emitter**（`packages/framework/core/tools/amadeus-orchestrate.ts:4686` `settlePerUnitOutcomes`）のスキップ 4 連言:

| 行 | 逐語 | 意味 |
|---|---|---|
| `:4695-4696` | `const batches = loadRuntimeUnitBatches(projectDir);` / `if (batches === null) return;` | batch 計画が無ければ全 return |
| **`:4706`** | `if (batch === undefined \|\| cancelledUnits.has(unit)) continue;` | **batch identity が解決できない unit と cancelled unit をスキップ** |
| `:4707-4709` | `if (!unitCovered(...)) { continue; }` | 未 covered をスキップ |
| `:4711` | `if (appended.has(key)) continue;` | 冪等ガード |

**値の閉語彙**:

| 面 | 行 | 逐語 |
|---|---|---|
| 発行値 | `:2475` | `const SETTLED_UNIT_OUTCOME = "succeeded";` |
| 拒否 | `:2508` | `if (outcome !== SETTLED_UNIT_OUTCOME) throw new Error(INVALID_SETTLED_ROW);` |
| 読み側 | `:2499` | `function readSettledUnitOutcomes(projectDir: string): SettledUnitOutcome[] {` |

`:2471-2474` のコメント逐語: `The one outcome the engine settles: coverage on disk is what it observes, and a covered Unit succeeded. The emitter writes this value and the reader accepts no other — a closed vocabulary …`

**母集団と検出側の入力集合の食い違い**:

| 面 | 行 | 読む入力 | solo cancelled を見るか |
|---|---|---|---|
| 検出側 `cancelledConstructionUnits` | `:3934` | canonical projection（`amadeus-construction-outcome-projection.ts`） | **見る** |
| 母集団 `readPerUnitConsumePopulation` | `:2513` | pool event set（実在行のみ）+ settle 行（`succeeded` のみ） | **見ない** |

**発行側は検出側の結果を使って発行を止める**（`:4706` の `cancelledUnits.has(unit)`）ため、検出側が見た事実は母集団側へ届かない。

**下流の受理語彙**（`packages/framework/core/tools/amadeus-per-unit-consume-fanout.ts`）:

| 面 | 行 | 逐語 |
|---|---|---|
| 受理集合 | `:199` | `const KNOWN_OUTCOMES = new Set(["succeeded", "failed", "cancelled", "pending", "ambiguous"]);` |
| pending 述語 | `:224-228` | `const outcome = outcomeRows.get(unit)?.[0]?.outcome; return outcome === undefined \|\| outcome === "pending";` |

**`cancelled` は既に正規の受理値であり、pending 判定は「行が無い」ことだけを見る。** したがって cancelled 行さえ届けば fail-closed は解ける — 是正は上流（発行と読み口）に閉じ、fanout 側の契約は動かない。

**solo skip arm**（`:6733` `handleFailureRuling` の Skip 分岐）:

| arm | 行 | 挙動 |
|---|---|---|
| solo | `:6767-6781` | `spawnAuditAppend(pd, "BOLT_COMPLETED", { …, Outcome: "cancelled", Reason: "skipped" })` の **1 行のみ**。pool を経由しない |
| pool | `:6783-6785` | `pool.skipFailedUnit({ …, reason: "skipped" })` |

**文書化された限界**:

| 面 | 実測 |
|---|---|
| `docs/guide/15-troubleshooting.md:143` | 逐語 `**Cancelled Units are not settled.** The engine settles a Unit only when it is covered *and* not cancelled, so a batch containing a cancelled Unit still reports \`producer-outcome-pending\` for that Unit after the steps above. The swarm path differs here — its Unit pool records a cancelled terminal — and closing that asymmetry is tracked as a follow-up issue.` |
| `docs/guide/15-troubleshooting.ja.md` | `git grep -n "Cancelled Units are not settled" 127be70c5 -- docs/guide/15-troubleshooting.ja.md` → **出力なし・exit 1**。**対訳側の文言は未判定**（§4.3） |

**是正面は emitter 側に閉じる**: `:4706`（発行のスキップ条件）+ `:2475`（発行値の閉語彙）+ `:2508`（読み側の拒否）の 3 点。**片方だけを開くと発行された cancelled 行が読み側で `INVALID_SETTLED_ROW` になる**ため、3 点は不可分である。

### 3.3 テスト面の空隙

| focus | 空隙 | 置き場（既存の対になる位置） |
|---|---|---|
| #2837 | **batch 番号の導出テストが不在**。`tests/integration/t135-invoke-swarm.test.ts` は `kind` / `units` / `cap` の 3 面のみで `--batch` は全てハードコード。`tests/unit/t113.test.ts:303-322` は `prepared_batch` / `retry_unit` の pair 整合のみ | 同 `t135` |
| #2837 | **failed batch → replan → 同一 Unit redispatch の回帰テストが不在**（Issue 本文が明示的に要求） | 同上 |
| #3106 | **per-unit（solo）経路 × cancelled のテストが不在**。pool 経路の対応テストは存在する | `tests/integration/t533-per-unit-consume-fanout.integration.test.ts:786-801` 逐語 `test("does not emit paths for a cancelled producer Unit even when files remain", …)` の**直後** |

swarm 系テストの所在（本 synthesis の実測、`git ls-tree -r --name-only 127be70c5 tests/`）: `tests/integration/t135-invoke-swarm.test.ts` / `tests/integration/t379-swarm-canonical-emit.test.ts` / **`tests/unit/t211-swarm-batch-progress.test.ts`**（`tests/integration/` ではない）/ `tests/e2e/t134-swarm-referee.test.ts` / `tests/unit/t113.test.ts`。

### 3.4 事実と仮説の分離

**事実**（いずれも本節に記した述語で再導出可能。すべて observed `127be70c5` 断面）:

1. `InvokeSwarmDirective` が 6 面であること、閉語彙 `:555` に `batch` / `check_cmd` / `test_file` が無いこと
2. `firstUncoveredBatch`（`:3906`）が `{units, batchNumber}` を返し、`:4294` が `pick.units` だけを渡し、`emitConfiguredSwarm`（`:4074`）の第2引数が `units` のみであること
3. gate 提示（`:3889`）/ retry arm（`:4092-4106`）/ failure election（`amadeus-directive.ts:644-649`）の 3 経路が batch identity を運ぶこと
4. batch 値が pool の idempotency key（`amadeus-swarm.ts:638`）であること、`prepare` の既定 base がブランチ名（`:581`）であること
5. swarm CLI の有効 subcommand 14 件に `context` / `status` 相当が無いこと（`:1419`）
6. conductor 面 8 中 7 面が `--batch <n>` の手動指定を要求すること（§3.1 の 2 述語 census）
7. settle emitter のスキップ条件（`:4706` / `:4707-4709`）と冪等ガード（`:4711`）
8. `SETTLED_UNIT_OUTCOME`（`:2475`）と読み側の拒否（`:2508`）が `succeeded` に閉じていること
9. `readPerUnitConsumePopulation`（`:2513`）と `cancelledConstructionUnits`（`:3934`）の入力集合が異なること
10. `KNOWN_OUTCOMES`（fanout `:199`）が `cancelled` を受理し、pending 述語（`:224-228`）が「行が無い」ことだけを見ること
11. solo skip arm（`:6767-6781`）が pool を経由しないこと
12. `docs/guide/15-troubleshooting.md:143` の逐語と、`.ja.md` における同一文字列の 0 hit（exit 1）
13. focus 2 件の是正が本区間で着地していないこと（§3.0）
14. 区間の除外削減 65.12%（§1.4）と、path 分類（§1.3）

**仮説（requirements / design が裁定すべき事項。本スキャンでは決めていない）**:

- **H1**: #2837 の是正が「directive の閉語彙を広げる」形になること。**根拠**: retry arm と failure election が既に batch を搬送しており、同じ形が最小変更である。**未検証**: Issue 本文は代替として `amadeus-swarm context --units … --json` の新設も挙げており、どちらを採るかは裁定事項。加えて `check_cmd` / `test_file` は conductor 側の知識であるという指摘がクロスレビューで出ており、directive へ載せる範囲自体が未決。
- **H2**: #3106 の是正が「settle 側に cancelled 語彙を足す」形（方式 a）になること。**根拠**: 「engine が観測した事実を前へ記録する」という既存の設計線に沿い、エッジ構成を変えない。**未検証**: 母集団側を canonical projection から読むよう広げる形（方式 b）は読み口の分裂そのものを閉じるため、根の解消という観点では優る。クロスレビュアーも「方式選定は選挙事項であり裁定しない」と明記している。
- **H3**: #2837 の是正が harness 8 面の散文同期を伴うこと。**根拠**: 7 面が `--batch <n>` の手動指定を前提に書かれているため、directive が値を運ぶようになれば散文は古くなる。**未検証**: 後方互換のため散文を残す選択もありうる（ただし `memory/org.md` § Forbidden は要求されていない互換レイヤーを禁じる）。

## 4. 訂正・申し送り

### 4.1 上流入力（Developer scan）からの訂正 1 件

**`tests/.coverage-registry.json` の規模は +48 −5 である。** Developer scan §品質指標は「registry +50/−7」と記すが、本 synthesis の再実行は次のとおり:

| 述語 | 結果 |
|---|---|
| `git diff --numstat 23d4ae767..127be70c5 -- tests/.coverage-registry.json` | **`48	5	tests/.coverage-registry.json`** |
| `git diff --numstat 23d4ae767..127be70c5 -- tests/.coverage-patch-allowlist.json` | **`36	0	…`**（Developer scan の「+36/−0」と一致） |

allowlist 側は一致しており、registry のみ差がある。差の由来（測定 ref の違いか転記の誤りか）は特定していないが、**本記録は再実行値（+48 −5）を採る**。

### 4.2 上流入力への追補 2 件

1. **conductor 面 census の述語を書き分けた。** Developer scan §Focus 現在形（#2837）は「claude/codex/kimi/kiro/kiro-ide 6 hit、cursor/opencode 5 hit、pi 0」と記す。これは `--batch <n>` という**リテラル**を数えた値であり、本 synthesis の再実行で一致した。ただし `--batch` の全出現を数えると SKILL.md 5 面が 7、pi が 1 になる（pi の hit は `acquire --batch <directive.prepared_batch>` で手動指定ではない）。**「8 面中 7 面が手動指定を要求」という結論は前者の述語で成立する**ため、述語を明示せずに数値だけを転記すると再導出できない。§3.1 に両述語を併記した。

2. **`t211-swarm-batch-progress.test.ts` の所在は `tests/unit/` である。** Developer scan §テスト空隙の記述（「t211 は tests/unit/ 配下（integration ではない）」）が正しい。本 synthesis の初回起草時に `tests/integration/` と誤記し、`git ls-tree -r --name-only 127be70c5 tests/` の実測で是正した（`code-quality-assessment.md` の該当行は是正済み）。

### 4.3 再実行していない項目・未検証面

- **`docs/guide/15-troubleshooting.ja.md` の対訳文言は未判定。** 英語版 `:143` の逐語文字列は ja 側で 0 hit（exit 1）だが、これは「英語のまま埋め込まれた同一文字列が無い」ことしか示さない。**対訳が別の日本語表現で同旨を述べている可能性を排除していない。** 是正時に対訳同期が必要かどうかは、ja ファイルの該当節を実読して判定する必要がある。
- **`dist/` parity は未測定。** `bun run build` は読取専用制約により未実行。追跡ファイルの `dist/` 面は区間の変更ファイル一覧に不在だが、これは「追跡されている dist ファイルが変更されていない」ことしか示さない（`dist/` は未追跡のローカル生成物）。
- **実行時の再現は行っていない。** #3106 の発火条件（per-unit 経路 + failure ruling の Skip + 下流の required per-unit consume）はクロスレビューが fixture プロジェクトで実測済みであり、本スキャンはこれを確立事実として所与消費した。
- **`git fetch` を伴う `origin/main` との真の drift 判定**（本 synthesis はローカルの remote-tracking ref との一致のみを確認）。
- **テスト実行・coverage・TLC・lint・typecheck はすべて未実行**（本スキャンは読取専用。`bun -e` による metrics JSON の読取のみ実行）。

### 4.4 申し送り

- **1 intent に 2 Issue を載せる構成の制約（最重要）。** 本 intent は `self-fix` = degrade スコープ（units-generation / delivery-planning が SKIP）であり、`cid:code-generation:oq-singleton` により pr-convergence の Delivery Bolt authority は construction 配下の unit ディレクトリが**ちょうど 1 つ**であることを要求する。**2 つ目の unit ディレクトリを作った時点で全 unit の report mint が構造的に不成立になる。** 2 Issue を別々の unit として実装するなら、(a) 別 intent へ分ける、または (b) units-generation / delivery-planning を EXECUTE するスコープを選ぶ、のどちらかが必要である。
- **walking-skeleton gate は発火しない。** `memory/project.md` の Mandated は `self-feature` にのみ walking-skeleton gate の維持を課す。本 intent は `self-fix` なので `memory/org.md` § Walking Skeleton の「既存コードベースへのインクリメンタルな作業はスケルトンのセレモニーをスキップ」が適用される。
- **focus 2 件の write scope は交差しうる。** #2837 の患部は `amadeus-directive.ts` + `amadeus-orchestrate.ts`（emit 境界）+ harness 8 面、#3106 の患部は `amadeus-orchestrate.ts`（settle / 母集団 / 読み側）である。**`amadeus-orchestrate.ts` で交差する**（#2837 は `:3906` / `:4074` / `:4294` 近傍、#3106 は `:2475` / `:2508` / `:4686-4711` 近傍で、行域は離れている）。並行実装する場合は同一ファイル競合として直列化を検討する（`memory/team.md` § Issue 運用「同一ファイル・進行中 PR との交差は直列化する」）。
- **`amadeus-orchestrate.ts` を触ると 2 台帳が発火する。** `cid:build-and-test:bt-ledger-resync` の対象面である — (a) `amadeus/spaces/default/specs/tla/model-map.json` の impl ハッシュピン（是正: `bun plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts updateModelMap --impl-only`）、(b) `tests/.coverage-patch-allowlist.json` の意味的セレクタ（署名行が anchor に含まれる場合）。怠るとフルスイートが `SOURCE_DRIFT` / fingerprint 不一致で赤化する。
- **Project Coverage Gate の母集団膨張に注意。** `cid:build-and-test:bt-coverage-universe-inflation` — これまで in-process import されていなかった大型 tools ファイルを 1 本のテストが import すると、ファイル全体が lcov 母集団へ入り相対条件（許容 0.02pp）が構造的に赤化する。`amadeus-orchestrate.ts` はその典型であり、被検関数を小モジュールへ切り出してテストはそれだけを import する形が正しい是正である。
- **新規テストファイルを追加する場合は registry regen 同梱が必須**（`cid:build-and-test:c1`、`bun tests/gen-coverage-registry.ts`）。本区間でも新規 8 スイートに対し registry が +48 −5 で同期されている。
- **`packages/framework/harness/` を触る場合は全ハーネス build と再現性検査**（`cid:build-and-test:bt-dist-regen-seven-harnesses`、`cid:code-generation:c5-regen-needs-build`）。#2837 の是正が harness 散文へ波及する場合に該当する。
- **inception ステージの questions ファイルは depth の上限に収める**（`cid:code-generation:c1-question-budget-corpus`）。本 intent の depth は **Minimal = 4 問**。record を Bolt PR へ同梱した瞬間に `tests/integration/t517-question-budget-sensor.integration.test.ts` の corpus sweep が blocking で発火する。
- **本 intent 以降、RE 成果物は workflow process record を新規に引用しない。** `stages/inception/reverse-engineering.md` が本区間で新設した規範（逐語 `Never cite a workflow process record the codekb does not already cite.`）に従い、本記録および 8 面への追記は intent record・選挙ストア・他 intent の stage 成果物を新規に引いていない。本 intent の確立事実は `issue-evidence.md` を経由してのみ引いた。既存の引用は履歴として保持している。
- **受け入れ基準は配送先の実ツリーに対する述語で書く**（`cid:requirements-analysis:c2-acceptance-at-delivery-tree`）。#2837 は harness 面（`dist/<harness>/` とセルフインストール面）へ配送される可能性があり、ソース断面だけの green は変換器を持たない配送路の退行を隠す。本区間の `t2415-re-scan-exclusion-contract.integration.test.ts` が source + 全 delivered tree を検証する形は、この規範の正しい実装例である。
- **未決事項**（本スキャンでは決めていない、`memory/team.md` P1 の裁定事項）: focus 2 件の是正方式すべて。#2837 は「directive を広げるか read verb を新設するか」「`check_cmd` / `test_file` を含めるか（conductor 側の知識であるという指摘がある）」「Issue に束ねられた 5 件のうちどれを本 intent の scope とするか（レビュアー 2 名とも分割を推奨）」、#3106 は「settle 側に cancelled 語彙を足すか（方式 a）母集団側を projection から読むよう広げるか（方式 b）」「種別が bug か enhancement か（選挙 E-260815-3099-FIX-METHOD / C-FORM が `Outcome: succeeded` に限定した経緯があるため、拡張を新契約と読む解釈も筋が通ると独立レビューが指摘）」が主要な争点である。

## 5. Verification

- git 状態変更（commit / branch / checkout / stash / merge / fetch）: **ゼロ**
- GitHub 書込・読取: **ゼロ**（本 synthesis では `gh` を一切実行していない）
- engine / state ツール実行（`amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-log.ts` / `amadeus-bolt.ts`）: **ゼロ**
- `bun run build` / フルスイート / coverage / TLC / lint / typecheck: **すべて未実行**（本スキャンは読取専用。`bun -e` による metrics JSON の読取のみ実行）
- 書き込み範囲: `amadeus/spaces/default/codekb/amadeus/` 配下のみ（本体 **7 面**への追記 + `reverse-engineering-timestamp.md` + 本ファイル）。**`technology-stack.md` は無変更**（区間で外部依存・ランタイム・リンター・型検査・テストランナーのいずれも動いておらず、書き足す実測が存在しないため）
- 現在時制マーカーの降格（`cid:reverse-engineering:c1`）: 直前 intent `260817-inception-cost-batch` の **7 件**を履歴ラベルへ降格。降格対象の列挙述語は `grep -n "^## .*、現在、" *.md`（対象 = 本 codekb ディレクトリの 9 面、追記前）→ **8 行**、うち追記した 7 面を降格し `technology-stack.md` の 1 行（260816-priority-bug-batch-3 節）は無変更のため保持
- 検索述語の健全性（`cid:reverse-engineering:c6-absence-predicate-exit-code` / `c6-ugrep-word-boundary`）: 本 synthesis の grep はすべて `git grep` または `grep -c` を使い、**ERE の `\b` を使わない**。不在主張に使った述語（§3.0 の `"3106"`、`.ja.md` の逐語文字列）はいずれも **exit 1**（エラーなく不一致）を実測して確認しており、`ugrep` の complexity limit に該当する長さではない。空出力を 0 hit と読んだ箇所（`packages/framework/harness/` / `.github/` / `package.json` 系の空 diff）はいずれも **exit 0** を実測した
- workflow process record への新規引用（`stages/inception/reverse-engineering.md` の新設規範）: **ゼロ**。本 intent の確立事実は `<record>/ideation/intent-capture/issue-evidence.md` 経由でのみ引いた。既存 artifact 内の過去の引用は履歴として保持している
- 数値の出所（`cid:requirements-analysis:numbers-from-command-output-only`）: 本記録の全件数・実測値は §1〜§3 に併記した述語の出力からの転記であり、測定 ref は断りのない限り observed `127be70c5`。派生値（65.12% / 73.74% / 約 98.2%）はすべて算出式を併記した
