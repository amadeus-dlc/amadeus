# リバースエンジニアリング差分スキャン記録: 260816-priority-bug-batch-3

## 0. メタデータ

| 項目 | 値 |
|---|---|
| Date | `2026-08-17` |
| Intent | `260816-priority-bug-batch-3` |
| Scope / depth / project type | `self-fix` / Minimal / Brownfield |
| Repository | `amadeus`（単一 repo、root `/Users/j5ik2o/orca/workspaces/amadeus/bugfix-0817-1`） |
| Branch | `bugfix-0817-1`（`git branch --show-current`、Developer scan §0） |
| Base commit | `5c5911ee3f107152c3173701caf178a746b6e3aa`（前回 observed = 260816-open-bug-batch-7。本 intent 初回スキャンのため差分 base はこれ 1 つ） |
| Observed commit | `89053172ed8b5bb270e254aea029a13291d10b6b`（`git rev-parse HEAD`。`origin/main` と**同一コミット**、drift 0） |
| Scan mode | **通常の差分リフレッシュ**（xrev differential 不採用。理由は §1） |
| Focus | 差分棚卸し + 優先バグ 5 件の深掘り — [#3153](https://github.com/amadeus-dlc/amadeus/issues/3153) / [#3152](https://github.com/amadeus-dlc/amadeus/issues/3152) / [#3149](https://github.com/amadeus-dlc/amadeus/issues/3149) / [#3156](https://github.com/amadeus-dlc/amadeus/issues/3156) / [#3046](https://github.com/amadeus-dlc/amadeus/issues/3046) |
| 分担 | Developer scan（`amadeus-developer-agent`）→ 本 Architect synthesis。本記録の実測値は出典を「Developer scan §N」と「本 synthesis の再実行」で書き分ける |

**祖先性と距離**（`cid:reverse-engineering:rescan-base-ancestry`、いずれも本 synthesis の再実行）:

- `git merge-base --is-ancestor 5c5911ee3f107152c3173701caf178a746b6e3aa HEAD` → **exit 0**
- `git rev-list --count 5c5911ee3..89053172e` → **15**

**drift**: Developer scan §0.1 が `git rev-parse HEAD` と `git rev-parse origin/main` の一致、および `git rev-list --count` の双方向 0 を実測している。本 synthesis では `git fetch` を実行していない（read-only 制約）ため、この点は Developer scan からの転記である。

## 1. Scan mode の選択 — xrev differential を採らない理由

`cid:reverse-engineering:c5-xrev-currency-schema-migration` の判定手順を 5 件へ適用した（Developer scan §1.2 の判定を本 synthesis で確認）。

1. **患部の表現形式そのものを変える移行が、Issue 起票断面と observed の間に挟まっているか** → **5 件とも No**。#3153 / #3152 の autonomy × presence 面、#3149 の report lifecycle、#3156 の 3 プローブ、#3046 の pending store は、いずれもスキーマ移行を挟んでいない（§2 の各節で現行断面の実読により確認）。
2. したがって currency 条件は成立するが、**xrev differential mode を単独で採る利得が無い**（Issue の cross-review verdict が引く行ピンではなく、Issue 本文が引く file:line の再解決で足りる）ため、5 件とも**通常の差分リフレッシュ**に揃えた。
3. ただし **#3153 / #3152 の Issue が測定 ref とする `31bf534de` は HEAD の祖先ではない**（Developer scan §1.2 の実測: `git merge-base --is-ancestor 31bf534de HEAD` → **exit 1**、`git cat-file -t 31bf534de` → `commit` でオブジェクト自体は存在）。conductor clone の off-lineage 断面であるため、**両 Issue の file:line はすべて observed で取り直した**。
4. 対照的に **#3156 と #3046 の測定 ref は observed と完全に同一**であり、Issue の全行ピンがそのまま有効である（Developer scan §3.4 / §3.5 の `git diff --stat <ref> HEAD -- <file>` がいずれも空出力・exit 0）。

## 2. 測定述語と実測値

断りのない限り observed tree（`89053172e`）に対して実行した。working tree の変更は `amadeus/spaces/default/intents/intents.json` と本 intent の record dir 追加のみで、**ソースコード面の未コミット変更は 0**（Developer scan §0.3。本 synthesis でも codekb 配下以外へは書き込んでいない）。

### 2.1 区間規模と帰属

| 述語 | 結果 | 出典 |
|---|---|---|
| `git rev-list --count 5c5911ee3..89053172e` | **15** | 本 synthesis |
| `git diff --shortstat 5c5911ee3 89053172e` | **229 files changed, 6597 insertions(+), 17613 deletions(-)** | 本 synthesis |
| `git diff --shortstat 5c5911ee3 89053172e -- ':!amadeus/' ':!metrics/'` | **65 files / +689 −17509** | 本 synthesis |
| `git diff --name-status 5c5911ee3 89053172e \| awk '{print $1}' \| sort \| uniq -c` | **A 118 / D 11 / M 100** | 本 synthesis |
| `git diff --name-status 5c5911ee3 89053172e -- packages/framework/core/tools/` | 新規 **0** / 削除 **0** / 変更 **4** | 本 synthesis |
| `git diff --name-only 5c5911ee3 89053172e -- 'plugins/'` | **空出力・exit 0** | 本 synthesis |
| `git diff --name-only 5c5911ee3 89053172e -- 'packages/framework/harness/'` | **空出力・exit 0** | 本 synthesis |
| `git diff --name-only 5c5911ee3 89053172e -- .github/` | `.github/workflows/ci.yml` の 1 件のみ（内容は `.pi` 追加 +1 行） | 本 synthesis（内容は Developer scan §1.5） |
| `git diff --stat 5c5911ee3 89053172e -- package.json bun.lock '**/package.json'` | **空出力・exit 0** | 本 synthesis |
| `git diff --name-only --diff-filter=A\|D\|M 5c5911ee3 89053172e -- 'tests/**' \| wc -l` | **A 1 / D 10 / M 33** | 本 synthesis |
| `git ls-files tests/<dir> \| grep -c "\.test\.ts$"` | unit **432** / integration **597** / e2e **97** / smoke **16** | 本 synthesis |
| `git grep -n "EXPECTED_CANONICAL_COUNT).toBe" 89053172e -- tests/integration/event-registry-drift.test.ts` | `:51 expect(EXPECTED_CANONICAL_COUNT).toBe(98);` | 本 synthesis |

**区間の主体**は intent `260816-open-bug-batch-7` の 3 unit 着地（#3155 → PR #3157 / #2363 → PR #3161 / #3097 → PR #3158）と、`260815-rfc-autonomy-modes` の R-22 修正（PR #3146、commit `5aab4b893`）である。

**本 intent と区間の直接の結びつき**: 区間内の `03fcd00ec`（`chore(record): checkpoint intent 260815-rfc-autonomy-modes — code-generation park at #3149`）は、**本 intent が扱う #3149 によって当該 intent の code-generation が park された記録**である（Developer scan §1.1 の `git log --oneline` からの転記）。すなわち本欠陥は区間内で実害を出している。

**削除主体の区間**: 非 record 面で削除が挿入の 25 倍を超える。上位は `tests/no-silent-drop/bootstrap/pre-classification.json`（3185 行 / D）、`post-classification.json`（3045 / D）、`bootstrap-provenance.json`（2152 / D）、`bootstrap/pre-raw.json` / `post-raw.json`（2062 / 1972、いずれも D）、`bootstrap/pre-approval.json` / `post-approval.json`（1822 / 1742、D）、`tests/no-silent-drop/bootstrap.ts`（M、+13 −387）、`scripts/no-silent-drop-migrate-events.ts`（87 / D）— すべて #3155（nsd bootstrap provenance の退役）由来（Developer scan §1.3 の `--numstat` 上位表からの転記）。

**変更された core tool 4 本**（Developer scan §1.4 の hunk 実読からの転記）:

| ファイル | 規模 | 内容 |
|---|---|---|
| `amadeus-intent-autonomy.ts` | +10 −0 | `declaredFullAutonomy(stateContent)` を新規 export（R-22） |
| `amadeus-state.ts` | +5 −2 | import 1 行と `authorizeApproval`（`:4165`）の `isAutonomousMode` → `declaredFullAutonomy`。hunk は `@@ -140 +140 @@` と `@@ -4162,7 +4162,10 @@` の 2 箇所のみ |
| `amadeus-sensor-self-scope-consistency.ts` | 小 | `SELF_HARNESSES` へ `".pi"`（5 → 6 面） |
| `data/self-install-allowlist.ts` | 小 | `GENERATED_SELF_INSTALL_ROOTS` へ `".pi"`（6 → 7 ルート） |

追加 import の逐語（本 synthesis の実測、`git diff -U0` の追加行）: `import { autonomyDigest, declaredFullAutonomy } from "./amadeus-intent-autonomy.ts";`。`autonomyDigest` は元から import 済みのため**モジュール間のエッジ本数は不変**である。

### 2.2 #3152 — 監査コーパスの再測定

集計述語（再実行可能。対象 = observed tree の全 audit シャード）:

```bash
find amadeus/spaces/default/intents -name '*.jsonl' -path '*/audit/*' -print0 \
  | xargs -0 cat \
  | jq -r 'select(.attributes."Event"=="INTENT_AUTONOMY_HUMAN_REQUIRED") | [.intentId, .attributes."Stage slug", .attributes."Interaction Kind", .attributes."Mode"] | @tsv' \
  | sort | uniq -c | sort -rn
```

| 実測 | 値 | 出典 |
|---|---|---|
| `INTENT_AUTONOMY_HUMAN_REQUIRED` 総行数 | **372** | 本 synthesis（`... | .idempotencyKey' | wc -l`） |
| distinct `idempotencyKey` | **372**（= 冪等抑止が一切効いていない） | 本 synthesis（同述語 + `sort -u | wc -l`） |
| `(intentId, Stage slug, Interaction Kind, Mode)` の最大重複 | **20**（`260815-per-unit-outcome` / `build-and-test` / `stage-gate` / `none`） | 本 synthesis |
| 同 2 位 / 3 位 | 17（`260810-tla-applicability-wiring` / `code-generation` / `walking-skeleton` / `none`）/ 13（`260814-unit-failure-autoelectio` / `code-generation` / `walking-skeleton` / `semi`） | 本 synthesis |

**述語の健全性**（`cid:reverse-engineering:c6-absence-predicate-exit-code`）: Developer scan §3.2 が記すとおり、素朴な `grep -c "INTENT_AUTONOMY_HUMAN_REQUIRED"` は **375** を返すが、差の 3 行は本 intent 自身の bootstrap 行（`WORKFLOW_STARTED` / `WORKSPACE_INITIALISED` / `WORKSPACE_SCAFFOLDED`）が当該イベント名を文字列として含むもので実イベント行ではない。**`jq` による構造化抽出の 372 が正しい件数**であり、本 synthesis の再実行はこの値を再現した。

Issue 起票時（コーパス 185 record）の 370 行 / 最大 20 に対し observed で **372 行 / 最大 20**。**欠陥は現行断面でも再現している。**

### 2.3 5 バグの file:line 再解決（本 synthesis で `sed -n` により逐語確認）

Developer scan §3 が再解決した行ピンを、本 synthesis で独立に再実行した。**不一致ゼロ。**

| 領域 | 確認した行 | 逐語（抜粋） |
|---|---|---|
| #3153 | `amadeus-state.ts:3721` | `function assertHumanPresentForGateResolution(` |
| #3153 | 同 `:3744` | `const context = productionStageAutonomy(stageAutonomyInput);` |
| #3153 | 同 `:3761` | `if (humanActedSinceGate(pd, verb, intent, space)) {` |
| #3153 | 同 `:3770` | `Refusing to ${verb} "${slug}": a real human has not acted at this gate since it opened. …（末尾）(autonomous Construction is exempt)` |
| #3153 | `amadeus-lib.ts:3926` | `export function humanActedSinceGate(` |
| #3152 | `amadeus-intent-autonomy-production.ts:295` | `export function productionStageAutonomy(input: ProductionStageAutonomyInput): ProductionAutonomyContext {` |
| #3152 | 同 `:314` | `emitAuthorizationRefusal(input.projectDir, {` |
| #3152 | 同 `:333` | `const REFUSAL_REASONS = ["SCOPE_OUT", "MODE_REQUIRES_HUMAN"] as const;` |
| #3152 | 同 `:354` | `function emitAuthorizationRefusal(projectDir: string, refusal: AuthorizationRefusal): void {` |
| #3149 | `pr-convergence-cli.ts:610-617` | `function transitionAllowed(current: string, next: string): boolean {` … `if (current === "created") return next === "converged" \|\| next === "override" \|\| next === "landed";` / `return current === "override" && next === "converged";` |
| #3149 | 同 `:918` | `: refuse("report lifecycle stale: PR head changed; run create to begin a new created epoch");` |
| #3149 | 同 `:923` | ``: refuse(`report lifecycle refused: ${previous.kind} -> ${report.kind}`);`` |
| #3149 | 同 `:114` / `:120` / `:130` / `:142` | `readonly kind: "created"` / `"converged"` / `"override"` / `"landed"`（kind の閉語彙 4 値） |
| #3149 | `amadeus-sensor-pr-convergence-report-format.ts:294-295` | `if (receipt.localHead !== receipt.remoteHead \|\| receipt.localHead !== receipt.prHead) {` → `findings.push({ field: "head", … })` |
| #3149 | 同 `:331-334` | `const local = spawnSync("git", ["rev-parse", "HEAD"], { cwd: recordRoot, … });` → 不一致で `field: "local head"` |
| #3149 | `pr-convergence-git-runner.ts:213` / `:236` | `export function verifyMergedEpochAncestry(` / `` message: `the created epoch attested ${attestedPrHead}, which is not an ancestor of the merged head ${mergedHead}; …` `` |
| #3149 | `sensors/amadeus-pr-convergence-report-format.md` | frontmatter 逐語 `default_severity: blocking` / `matches: "**/construction/*/code-generation/pr-convergence-report.md"` |
| #3156 | `amadeus-state.ts:2498` / `:2511` / `:2525` / `:2556` / `:2595` / `:2622` / `:2650` / `:2685` / `:2726` | `intentBirthCommit` / `recordBranchSourceWork` / `intentBoltSlugs` / `boltRefHasSourceWork` / `mergedPrSourceWork` / `intentScopedSourceWork` / `export function gitHasSourceWork` / `workspaceHasWork` / `if (stage.workspace_requires && !workspaceHasWork(pd)) {` |
| #3046 | `amadeus-election-store.ts:17-20` | `// Single writer (conductor) by decision D-09 — no locking; torn writes are / // prevented by tmp+rename (writeStoreFile). …` |
| #3046 | 同 `:545-547` | `if (new Set(events.map((event) => event.arrivalSequence)).size !== events.length) { return err("corrupt"); }` |
| #3046 | 同 `:1063` | `const arrivalSequence = Math.max(-1, ...pending.value.map((event) => event.arrivalSequence)) + 1;` |
| #3046 | 同 `:1088` | `pendingPath(loaded.value.resolved.dir, ballot.voter),` |

**task 記載の取り違えの訂正**（Developer scan §3.4 が指摘、本 synthesis で確認）: Issue の引用ラベルでは `:2622` が `intentBoltSlugs` とされていたが、実体は **`:2622-2632` が `intentScopedSourceWork`**、`intentBoltSlugs` は **`:2525-2536`** である。

### 2.4 品質指標と台帳

**測定元**: `metrics/2026-08-16T11-04-41-875Z-3e1c6a19ed5b.json`（base 側）と `metrics/2026-08-16T20-57-24-618Z-2555e5b42914.json`（observed 側 = 区間内最後）の `collectors.<name>.values` 直読（本 synthesis の再実行、`bun -e`）。区間内の snapshot は 4 件。

| 指標 | base | observed | 差 |
|---|---|---|---|
| coverage percent | 93.41934476465595 | 93.39685396775708 | **−0.0225pp** |
| coverage hits / lines | 95724 / 102467 | 95474 / 102224 | −250 / −243 |
| test files / assertions | 1044 / 13879 | 1045 / 13891 | +1 / +12 |
| failed files / assertions | 0 / 0 | 0 / 0 | 横ばい |
| unit_small / integration_medium | 270 / 580 | 270 / 581 | ±0 / +1 |
| loc core / loc tests | 148942 / 401163 | 148956 / **384400** | +14 / **−16763** |
| ccn 関数数 / 閾値超過 | 7301 / 32 | 7295 / 32 | −6 / **±0** |
| **open bugs** | 4 | **11** | **+7** |

**coverage の微減は退行ではない** — loc tests が 16,763 行減っており（#3155 の fixture 退役）、hits と lines が同時に減っている。ただし Project Coverage Gate の相対条件（許容 0.02pp）に対して −0.0225pp は超過幅にあるため、実装 PR では merge-base 相対の再測定が要る。

**open bugs 4 → 11** は本区間がバグを増やしたのではなく、バグ探索で新規に可視化された結果である。本 intent の 5 件はこの 11 件に含まれる。

台帳（`git diff --stat 5c5911ee3 89053172e -- <5 台帳>`、本 synthesis）: `model-map.json` **+2 −2** / `coverage-patch-allowlist.json` **+0 −11** / `coverage-registry.json` **無変更** / `complexity-baseline.json` **無変更** / `coverage-ratchet.json` **無変更**。

是正時の係り（`grep -c` の転記、本 synthesis）:

| キー | allowlist | registry | model-map | complexity-baseline |
|---|---|---|---|---|
| `amadeus-state` | **48** | **33** | **2** | **4** |
| `amadeus-lib` | 2 | 0 | 0 | 0 |
| `amadeus-intent-autonomy-production` | **9** | 0 | 0 | 0 |
| `pr-convergence` | 4 | 2 | 0 | 0 |
| `amadeus-election-store` | **15** | 0 | **1** | 0 |
| `amadeus-orchestrate` | **30** | 0 | **2** | 0 |

### 2.5 上流の要確認事項の解消 — t2363 の registry regen は不要

Developer scan §1.7 / §5 は「新規テストファイル 1 件（`tests/integration/t2363-pi-self-install-delivery.integration.test.ts`）が追加されたのに `tests/.coverage-registry.json` が regen されていない」を `cid:build-and-test:c1` に照らして要確認としていた。**本 synthesis の実測により regen 不要が正しいと確定した。**

| 述語 | 結果 |
|---|---|
| registry の `unitClasses`（`bun -e` による JSON 直読） | `["function","audit","scope","stage","hook","subcommand","render-surface"]` の **7 クラス**。`contract` を含まない |
| `sed -n '1,6p' tests/integration/t2363-pi-self-install-delivery.integration.test.ts` | `// covers: contract:pi-self-install-delivery`（宣言は**この 1 件のみ**） |
| `grep -c '"contract:' tests/.coverage-registry.json` | **0**（exit 1 = エラーなく不一致） |
| `git grep -l "^// covers:.*contract:" -- 'tests/**' \| wc -l` | **12**（`contract:` を宣言するテストファイルは既存で 12 件ある） |
| registry の `counts.enumeratedByClass` | `{"function":354,"audit":98,"scope":15,"stage":32,"hook":15,"subcommand":112,"render-surface":7}`（total 633） |

すなわち `contract:` 宣言は enumeration universe に寄与しないため、そのクラスだけを宣言するテストの追加は registry を動かさない。**ただし本 intent が 7 クラスのいずれかを宣言するテストを新規追加する場合は、`cid:build-and-test:c1` どおり regen 同梱が必須**である。

## 3. 主要知見のポインタ

| 知見 | codekb の写像先 |
|---|---|
| 区間は構造変化ゼロ（core tool 新規 0 / 削除 0 / 変更 4、plugins・harness は空 diff） | `code-structure.md` §区間、`component-inventory.md` §A、`architecture.md` §1 |
| 削除主体の区間（非 record で削除が挿入の 25 倍超、#3155 の fixture 退役） | `code-structure.md` §区間、`code-quality-assessment.md` §1 |
| #3153: autonomy の `authorizationReason` が `:3755-3756` で捨てられ、承認可否は presence 述語が単独で決める | `architecture.md` §2、`component-inventory.md` §B、`code-structure.md` A 節 |
| #3153: `GATE_APPROVED` に「人間が答えたか engine が通したか」を区別するフィールドが無い（事後にも見分けられない） | `architecture.md` §2、`api-documentation.md` §2、`business-overview.md` |
| #3152: 同一ファイル内で認可は冪等（`:913`）・拒否は毎回 append（`:354-370`）という非対称 | `architecture.md` §3、`component-inventory.md` §C |
| #3152: 監査 372 行 / distinct key 372 / 最大重複 20、契約は「an occurrence」（単数） | `architecture.md` §3、`api-documentation.md` §2、本記録 §2.2 |
| #3149: CLI（`converged` = final）と sensor（non-landed は live head 一致）の両立不能な契約 | `architecture.md` §4 + Interaction Diagrams、`component-inventory.md` §D |
| #3149: #3110 の是正（PR #3113）が前提とした lifecycle 定義そのものとの衝突であり、#3110 の残余ではない | `architecture.md` §4、`api-documentation.md` §2 |
| #3156: 3 プローブが `intentBirthCommit` を共有する単一障害点（冗長でない冗長化） | `architecture.md` §5 + Interaction Diagrams、`component-inventory.md` §E、`dependencies.md` C |
| #3156: ノルム準拠の運用（record を後から積む手順）が構造的に guard を誤発火させる | `business-overview.md`、`architecture.md` §5 |
| #3046: 読み全体 / 書き voter 単位の非対称で、防御（tmp+rename）と脅威のスコープがずれている | `architecture.md` §6 + Interaction Diagrams、`component-inventory.md` §F、`dependencies.md` D |
| #3046: 一意性検査（`:545-547`）が衝突永続化後に恒久 corrupt を返し、tally / integrate へ波及 | `architecture.md` §6、`business-overview.md` |
| 交差: #3153 / #3152 は同一鎖、#3156 も同一ファイル `amadeus-state.ts` → 3 領域の直列化が要る | `architecture.md` §7、`code-structure.md`、`dependencies.md` §領域間 |
| 品質指標（coverage −0.0225pp は母集団縮小、open bugs 4 → 11） | `code-quality-assessment.md` §1、`business-overview.md` |
| 台帳の係り（`amadeus-state` は 4 台帳すべて、#3152 が orchestrate へ及ぶと +2 台帳） | `code-quality-assessment.md` §4 |
| t2363 の registry regen 不要（`contract:` は 7 unit class 外） | `code-quality-assessment.md` §2、本記録 §2.5 |

## 4. 訂正・申し送り

**上流入力からの訂正**: なし。Developer scan §0〜§3 の区間実測（15 コミット / 229 files / 65 files 非 record / A118 D11 M100 / core tool 変更 4 / plugins・harness 空 diff / 基数 pin 98 / テスト層別件数 / `tests/**` の A1 D10 M33）と、§3 の全 file:line ピン（§2.3 の表）を本 synthesis で再実行した結果は**不一致ゼロ**だった。

**上流の未決事項を 1 件解消**: Developer scan §1.7 / §5 の「t2363 追加に対し registry が regen されていない」は、**regen 不要が正しい**（§2.5、3 述語の実測により確定）。

**再実行していない項目**（出典を Developer scan と明記して転記）: `origin/main` との drift 判定（`git fetch` を伴うため）、#3153 / #3152 の Issue 測定 ref `31bf534de` の非祖先性、`--numstat` の削除上位表、core tool 4 本の hunk 位置、`humanActedSinceGate` / `emitAuthorizationRefusal` の全呼出元の網羅列挙、既存テストファイルの内部行ピン（`t188:288` 等）。

**申し送り**:

- **1 intent に 5 Issue を載せる構成の制約**（最重要）。`cid:code-generation:oq-singleton` により degrade スコープ（`self-fix` は units-generation / delivery-planning を SKIP）では pr-convergence の Delivery Bolt authority が construction 配下の unit ディレクトリを**ちょうど 1 つ**であることを要求する。2 つ目の unit を作った時点で全 unit の report mint が構造的に不成立になる。**units-generation / delivery-planning を EXECUTE するか、`cid:code-generation:multiunit-pr-procedure` の per-unit PR 定型に従う**必要がある。
- **#3153 / #3152 / #3156 は write scope が衝突する。** 前 2 者は同一の呼び出し鎖（`amadeus-state.ts:3744` → `productionStageAutonomy:295` → `emitAuthorizationRefusal:314`）を共有し、#3156 も同一ファイル `amadeus-state.ts` を触る（行域は非重複）。**同一ファイル PR は直列化が安全**（`cid:units-generation:c1`）。
- **#3149 は自己適用が発生する。** 本 intent の Bolt PR も同じ pr-convergence 機構で収束させるため、修正中の CLI を自 intent の配送に使うことになる。attestation は self-install 投影（`.claude/plugins/...`）からの起動を要する（`cid:code-generation:c2-pr-record-in-head-checkout`）。
- **#3156 の検証には `bun run build` が要る。** `tests/unit/t206-source-work-intent-span.test.ts:33` は `dist/claude/.claude/tools/amadeus-state.ts` から import する（`cid:code-generation:c1-mirror-and-rebuild-before-review` / `cid:code-generation:c5-regen-needs-build`）。
- **#3046 の落ちる実証には別プロセスが要る。** 現行テストはすべて逐次呼出で、並行 append を再現するものが存在しない。`spawn` か `readAllPending`↔`writeStoreFile` 間のシームが必要で、置き場は integration 層（`cid:code-generation:c2-doctor-seam`）。Issue は破壊的変更（`schemaVersion` 繰り上げを含む）を明示的に許容している。
- **監査面へ届く方式は基数 pin が門番になる。** 新イベントを足す方式のみ `tests/integration/event-registry-drift.test.ts:51`（98）が blocking で発火する。既存イベントへのフィールド追加や既存行の冪等化は通過する。**方式裁定時にこの分岐を明示すること。**
- **coverage の相対条件に注意。** 区間で既に −0.0225pp の変動があり、Project Coverage Gate の相対許容（0.02pp）の幅にある。実装 PR では merge-base 相対の再測定が要る（`cid:code-generation:push-first` により重い検証は push 後に CI と並列で回す）。
- **未決事項**（本スキャンでは決めていない、`memory/team.md` P1 の裁定事項）: 5 件の是正方式すべて。特に #3153 は「autonomy の結論を `assertHumanPresentForGateResolution` 内で効かせる（1 箇所に閉じる）」か「`humanActedSinceGate` の述語自体を変える（本番 7 呼出元へ波及）」かの分岐、#3149 は「CLI の lifecycle を変える」か「sensor の binding を変える」か「両方」かの分岐、#3046 は「ロック導入」か「採番方式の変更（schemaVersion 繰り上げ）」かの分岐が主要な争点である。

## 5. Verification

- git 状態変更（commit / branch / checkout / stash / merge / fetch）: **ゼロ**
- GitHub 書込・読取: **ゼロ**（本 synthesis では `gh` を一切実行していない）
- engine / state ツール実行（`amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-log.ts` / `amadeus-bolt.ts`）: **ゼロ**（`amadeus-utility.ts codekb-path` の read-only 実行のみ）
- `bun run build` / フルスイート / coverage / TLC: **すべて未実行**（本スキャンは読取専用。`bun -e` による metrics / registry JSON の読取のみ実行）
- 書き込み範囲: `amadeus/spaces/default/codekb/amadeus/` 配下のみ（本体 8 面 + `reverse-engineering-timestamp.md` + 本ファイル）
- 検索述語の健全性（`cid:reverse-engineering:c6-absence-predicate-exit-code` / `c6-ugrep-word-boundary`）: 本 synthesis の grep はすべて `git grep` または `grep -c` を使い、**ERE の `\b` を使わず**、空出力を 0 hit と読んだ箇所（`plugins/` / `packages/framework/harness/` / `package.json` 系の空 diff）はいずれも **exit 0** を実測した。`grep -c` の 0 は exit 1（エラーなく不一致）であることを併記した
