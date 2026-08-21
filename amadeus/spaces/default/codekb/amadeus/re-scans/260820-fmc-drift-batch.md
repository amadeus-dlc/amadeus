# リバースエンジニアリング差分スキャン記録: 260820-fmc-drift-batch

## 0. メタデータ

| 項目 | 値 |
|---|---|
| Date | `2026-08-20`（UTC） |
| Intent | `260820-fmc-drift-batch` |
| Scope / depth / project type | `self-fix` / Minimal / Brownfield |
| Repository | `amadeus`（単一 repo、root `/Users/j5ik2o/worktrees/j5ik2o.github.com/amadeus-dlc/amadeus/enhance-1`） |
| Branch | `enhance-1`（HEAD == `origin/main`） |
| Base commit | `c8c393bba927e4c00a8c6de9ef2da76068d04bfa` |
| Observed commit | `e86fbe125c85ddcbe7264f3a9a9a2377a06136da` |
| Distance | `97` commits |
| Scan mode | **通常の差分リフレッシュ**（xrev differential 不採用。理由は §1.1） |
| Focus | [#3186](https://github.com/amadeus-dlc/amadeus/issues/3186) / [#2289](https://github.com/amadeus-dlc/amadeus/issues/2289) / [#2929](https://github.com/amadeus-dlc/amadeus/issues/2929) / [#3187](https://github.com/amadeus-dlc/amadeus/issues/3187) |
| 分担 | Developer scan（`amadeus-developer-agent`）→ 本 Architect synthesis。実測値は出典を「Developer scan」と「本 synthesis の再実行」で書き分ける |

### Base commit の選定根拠

`cid:reverse-engineering:c1` が定める「HEAD の祖先である observed のうち距離最小」を、`re-scans/` の全 observed へ適用した（いずれも本 synthesis の実行）。

| 候補 | 出典 | `git merge-base --is-ancestor <c> HEAD` | `git rev-list --count <c>..HEAD` |
|---|---|---|---|
| **`c8c393bba927e4c00a8c6de9ef2da76068d04bfa`** | `re-scans/260818-issue-3029-sensor-gate.md` の observed | **exit 0** | **97**（最小 → 採用） |
| `127be70c5d7a584016f88a5d44e8715904020721` | `re-scans/260818-priority-bug-batch-4.md` の observed | exit 0 | 98 |
| `23d4ae767956cd56fc28fa78abe28096712eff8a` | `re-scans/260817-inception-cost-batch.md` の observed | exit 0 | 103 |

2 つの 260818 intent は並行に走っており、どちらの observed も HEAD の祖先である。距離最小の `c8c393bba` を base とした。

### drift

`git rev-parse HEAD` と `git rev-parse origin/main` がいずれも `e86fbe125c85ddcbe7264f3a9a9a2377a06136da` を返す（本 synthesis の実行）。`git fetch` は実行していないため、これはローカルの remote-tracking ref との一致である。

### Focus の由来と消費の仕方

本 intent の focus は `<record>/ideation/intent-capture/issue-evidence.md` から導出した（`cid:reverse-engineering:c1-selffix-evidence` の手順に従い、`self-fix` スコープで intent-capture が SKIP されるため read-only verb を手動実行して成立させたもの）。

**クロスレビューが確立した事実は所与として消費し、再導出していない。** 本スキャンが行ったのは、その事実が名指す機構の **observed 断面での現在形確認**である。具体的には次の 3 点を確認した。

1. 名指された file:line が observed で実在し、意味論が一致すること（§3 の各表、行番号訂正は §2）
2. 起票・レビュー以後に是正が着地していないこと（§3.0）
3. 区間内の着地により **focus のスコープが動いていないか**（§3.5 — 動いていた。2 点の縮小）

**再現実験は行っていない。** 本スキャンは読取専用であり、テスト・build・coverage・TLC のいずれも実行していない。

## 1. Scan mode と区間の分類

### 1.1 xrev differential を採らない理由

`cid:reverse-engineering:c5-xrev-currency-schema-migration` の判定手順を focus 4 件へ適用した。

1. **患部の表現形式そのものを変える移行が、クロスレビュー断面と observed の間に挟まっているか** → **#2289 は Yes**。#3263（`e461fea3c`）が登録 draft の必須フィールドを変え（`authoringProvenance`）、#3261（`8cc9f009f`）が交差判定の契約を変えている。クロスレビュー verdict が引く形と現行の形が同一とは言えない。
2. したがって **currency 条件は少なくとも #2289 について不成立**であり、4 件を通じて**通常の差分リフレッシュ**とした。
3. 本記録の focus 節（§3）の file:line は**すべて observed `e86fbe125` 断面で本 synthesis または Developer scan が取り直している**（レビュー verdict からの転記ではない）。

### 1.2 区間の構成 — 97 commits の 3 クラス

`git log --oneline c8c393bba..e86fbe125` は 97 行を返す（本 synthesis の実測）。内容は 3 クラスに分かれる。

| クラス | 主な PR |
|---|---|
| リリースパイプラインの再構築 | #3214（merge queue 経由のバージョン着地）/ #3223 / #3237（bot slug 比較）/ #3242（重複フルスイート除去）/ #3303（squash commit の fetch）。v0.1.8 / v0.1.9 / v0.1.10 / v0.1.11 の 4 リリースが区間内 |
| テスト基盤の強化 | #1982（silent-success 3 ゲート、`e452d3892`）/ #3280（standalone file 実行の hermeticity）/ #3088（worktree add retry helper）/ #3264（elapsed-time assertion ガード）/ #3078（未宣言 plugin tool の検出、`advisory-model-check.ts` の R094 移設）/ #3206（live LLM journey e2e） |
| 欠陥是正 | formal-model-check: #3261 / #3262 / #3263。engine/state: #3267 / #3194 / #3197 / #3268 / #3243 / #3151。election: #3256（terminate）/ #3225 / #3183。mirror: #3271。github-pr-convergence: #3239 / #3270 / #3265。前 intent の focus: #2837（PR #3202）/ #3106（PR #3203） |

**前区間の focus 2 件はどちらも本区間で着地した。**

### 1.3 区間の path 分類

**再実行可能な集計述語**（本 synthesis の実測、exit 0）:

```bash
git diff --numstat c8c393bba..e86fbe125 | awk -v q="[^/]+" '
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
| `intents` | 11,831 | 236 |
| `tests` | 10,715 | 93 |
| `source_other`（= `packages/` + `plugins/` + `scripts/` + `.github/`） | 3,722 | 63 |
| `metrics` | 3,187 | 71 |
| `codekb` | 1,418 | 12 |
| `elections` | 1,251 | 69 |
| `docs` | 468 | 18 |
| `memory` | 31 | 2 |
| `specs` | 15 | 2 |
| **TOTAL** | **32,638** | **566** |

### 1.4 除外削減の記録（#2415 の RE stage 契約が義務づける）

**除外なし**（本 synthesis の実行）:

```bash
git diff --shortstat c8c393bba..e86fbe125
```

→ **566 files changed, 32638 insertions(+), 3949 deletions(-)**

**除外あり**（契約散文が載せる 5 pathspec を逐語で使用）:

```bash
git diff --shortstat c8c393bba..e86fbe125 -- . \
  ':(exclude,glob)amadeus/spaces/*/intents/**' \
  ':(exclude,glob)amadeus/spaces/*/elections/**' \
  ':(exclude,glob)amadeus/spaces/*/codekb/**' \
  ':(exclude,glob)amadeus/spaces/*/memory/**' \
  ':(exclude,glob)metrics/**'
```

→ **176 files changed, 14920 insertions(+), 1380 deletions(-)**

| 指標 | 除外なし | 除外あり | 削減 |
|---|---|---|---|
| insertions | **32,638** | **14,920** | **17,718** |
| files | **566** | **176** | **390** |

**削減率 54.29%**（派生値、算出式 `17718 / 32638 = 0.5429`）。ファイル数ベースでは **68.90%**（派生値、算出式 `390 / 566`）。

**突合**（§1.3 の集計から、除外対象クラスのみ）:

| クラス | insertions |
|---|---|
| `amadeus/spaces/*/intents/**` | 11,831 |
| `metrics/**` | 3,187 |
| `amadeus/spaces/*/codekb/**` | 1,418 |
| `amadeus/spaces/*/elections/**` | 1,251 |
| `amadeus/spaces/*/memory/**` | 31 |
| **合計** | **17,718** |

17,718 = 32,638 − 14,920（一致、本 synthesis の突合）。

**`amadeus/spaces/*/specs/` は非除外の判断が結果に影響している** — 本区間は 15 insertions / 2 files（`specs/tla/model-map.json` +14 −6、`specs/tla-evidence/f258519902a8a014….json` +1）を持ち、これは model-map の実装ハッシュピン 6 件の resync と `authoringProvenance` の追加である。除外していれば **#2929 / #2289 の観測に直結する変更を見落としていた**。

**過去 2 回の測定との比較**: 61.8%（`89053172e..23d4ae767`、契約に記録された初回）→ 65.12%（`23d4ae767..127be70c5`）→ **54.29%**（本区間）。本区間は `tests` が 10,715 insertions と大きく、非除外側の分母が膨らんだため削減率は下がっている。**削減率は区間の性質に依存する指標であり、単調に増えるものではない。**

### 1.5 構造変化 — 新規 4 / 削除 4 / 移設 1

`git diff --name-status -M c8c393bba..e86fbe125 -- packages/ plugins/ scripts/ .github/`（本 synthesis の実測）:

```
A	packages/framework/core/tools/amadeus-mirror-orphan.ts
A	plugins/formal-model-check/docs/terminal-route-receipt-audit.md
A	scripts/release-land-domain.ts
A	scripts/release-land.ts
D	packages/setup/.release-it.json
D	plugins/formal-model-check/tools/advisory-model-check.ts
D	scripts/run-claude.sh
D	scripts/run-codex.sh
R094	plugins/formal-model-check/tools/advisory-model-check.ts	tests/lib/advisory-model-check.ts
```

`git diff --name-status c8c393bba..e86fbe125 -- packages/ plugins/ tests/ docs/ scripts/ .github/ | awk '{print $1}' | cut -c1 | sort | uniq -c` → **A 27 / D 4 / M 136 / R 1**。

**ディレクトリ再編はゼロ。**

## 2. base 引用からの行番号訂正 3 件

Developer scan §A-1 が特定した訂正を、本 synthesis が独立に再実行して確認した。

| base 引用 | observed の実測 | 再実行した述語と出力 |
|---|---|---|
| `tla-model-loader-internal.ts:498` `loadVerifiedTlaSourcesInternal`（呼び出し側） | **`:528`** | `grep -n "loadVerifiedTlaSourcesInternal" plugins/formal-model-check/tools/tla-model-loader-internal.ts` → `464:export function loadVerifiedTlaSourcesInternal(` / `528:  const sources = loadVerifiedTlaSourcesInternal(moduleUrl, fs);`（宣言 `:464` は base 引用と一致） |
| `amadeus-sensor-model-completeness.ts:1000-1078` `updateModelMap` | **`:1121-1136`**（export 版）。`:1000` は `performModelMapUpdate`、内部版 `updateModelMapInternal` は `:1082` | `grep -n "updateModelMap" plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts` → `1082:async function updateModelMapInternal(options: InternalOptions)` / `1121:export async function updateModelMap(` / `1135:  return updateModelMapInternal({ ...options, mapRelativePath });` |
| `tla-authoring.ts:521` `defaultSubjectsPath` | **`:529`**（`advisoryHold` は `:574`、`subjectsDeclare` の出力先は `:667`） | `grep -n "defaultSubjectsPath\|function advisoryHold" plugins/formal-model-check/tools/tla-authoring.ts` → `529:export function defaultSubjectsPath(workspaceRoot: string = process.cwd()): string {` / `574:function advisoryHold(flags: Record<string, string>): Emitted {` / `575:  const subjectsPath = flags["subjects-file"] ?? defaultSubjectsPath();` / `667:  const path = flags.out ?? defaultSubjectsPath();` |

行シフトの由来は #3261 / #3262 / #3263 の 3 PR である。

**一致を確認した base 引用**（Developer scan §A-1 の残り。本 synthesis は `AUTHORING_ROUTES` census（§3.2）と model-map 直読（§3.3）で一部を独立再確認した）: `tla-applicability.ts:302` / `tla-registration.ts:87` / `:229-243`（呼び出し `:338`）/ `:314-355` / `amadeus-formal-verif-model-map.ts:248-251` / `:330-336` / `:348-352` / `:615` / `:668-679` / `tla-model-loader-internal.ts:291` / `:141-146` / `amadeus-sensor-model-completeness.ts:233` / `sensors/amadeus-model-completeness.md:8` / `run-model-check-artifacts.ts:129` / `tla-authoring.ts:830,838` / `t448:2-3`,`:74-82`,`:294-307` / `t-formal-verif-canonical-core.test.ts:96`。

**細分 2 件**: `tla-model-loader-internal.ts:298-300` は宣言 `:287` / 判定 `:299` / drift 返却 `:300` へ、`amadeus-sensor-model-completeness.ts:733-776` は `:733-775`（末尾 1 行差）へ。

## 3. Focus findings（現在形確認）

**本節の file:line はすべて observed `e86fbe125` 断面で確認した。**

### 3.0 是正着地の不在

focus 4 件の中核主張はいずれも observed で成立している（各節の実測を参照）。**ただし #3186 と #2289 についてはスコープが縮小している** — §3.5 を参照。

### 3.1 #3186 — 語彙 drift 検出の腕

**(a) `landed` 語彙の不在は現存する。**

- `PrConvergenceGate.tla:14` 逐語 `Verdicts == {"none", "created", "converged", "override"}`、`:15` 逐語 `TerminalVerdicts == {"converged", "override"}`
- `BoltPrAttestationGate.tla:22-23` は**完全同一の 2 行**
- census `git grep -c -F 'landed' -- amadeus/spaces/default/specs/tla/` → MirrorLifecycleAsImplemented **1** / MirrorLifecycleCore **3**、**exit 0**（PR 系 2 モデルは 0 hit）
- **対照** `converged` → BoltPrAttestationGate **5** / PrConvergenceGate **5** / MirrorLifecycleCore **1**、**exit 0**（述語健全）

**(b) 検出述語の不在も現存する。** `stages/tla-authoring.md` へのトークン別 census（1 トークン 1 実行、`git grep -c -i -F`）:

| トークン | hit | exit |
|---|---|---|
| `drift` / `vocabular` / `語彙` / `意味的` / `recurr` / `regression` / `再発` / `repeat` | **0** | **1** |
| **対照** `semantic` | 1（`:51` の `semantic-change`） | **0** |
| **対照** `semantic-change` | 1 | **0** |
| **対照** `reachable` | 2 | **0** |

→ 分類クラス (a) と revise-model 強制規則 (c) は健在、**欠落は発火述語 (b) のみ**。

**(c) 判定器の 2 値性は現存する。** `tla-applicability.ts:143` が key を `${declaration.kind}:${intersectsRegisteredModel(input.subjectIdentity, declaration.subjects, registeredModels.models)}` で構成し、rationale を消費しない。`:182` `TERMINAL_ROUTES = new Set(["impl-only","non-target"])`、`:97` `"non-target:true": "J2d"`。

**(d) 腕 1 の入力面は既存である。** `model-map.json` の `vocabulary` は機械可読で 4 モデル全てが `namedInvariants` / `traceStateVariables` を持つ（実測は §3.3 の表）。**新機構の発明は不要。**

### 3.2 #2289 — replace-by-name

**ギャップは live である。**

| 面 | observed の実測 |
|---|---|
| compose | `tla-registration.ts:229-243` `composeRegisteredMap` は arity 2 で route 非受理。`:235` 逐語 `const composed = [...models, draft].sort((left, right) => {` |
| validator | `amadeus-formal-verif-model-map.ts:615` 逐語 `if (model.value.name <= previousName) return invalid("models must be unique and sorted by name");` |
| 前提ゲート | `tla-registration.ts:110` は `AUTHORING_ROUTES.has(value.route)` で route を通すが、`commit`（`:338`）は compose へ渡さない |
| 本番経路 | `tla-authoring.ts:830` `createRegistrationPorts` / `:838` `RegistrationCommitter.commit` の 1 本 |
| F1（fail-open） | `commit`（`:314-355`）は `candidate.applicability` の subject と `draft.value.name` を突き合わせない（照合は `:324-327` の evidenceBundle digest のみ） |
| F4（自己参照比較） | `tests/unit/t448-tla-registration.test.ts:2` と `:3` が同一 module specifier（本 synthesis の実読で両行とも `"../../plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts"`）。`:74` の test `"the shipped plugin copy reaches the same verdicts"` が同一オブジェクトを比較 |

**`AUTHORING_ROUTES` の重複定義は現存する**（本 synthesis の再実行）:

```
$ git grep -n -F 'AUTHORING_ROUTES' -- plugins/ packages/ tests/
plugins/formal-model-check/tools/tla-applicability.ts:302:const AUTHORING_ROUTES: ReadonlySet<string> = new Set(["author-new", "revise-model"]);
plugins/formal-model-check/tools/tla-applicability.ts:314:  if (AUTHORING_ROUTES.has(entry.receipt.route)) {
plugins/formal-model-check/tools/tla-registration.ts:87:const AUTHORING_ROUTES: ReadonlySet<string> = new Set(["author-new", "revise-model"]);
plugins/formal-model-check/tools/tla-registration.ts:110:  const routed = isRecord(value) && typeof value.route === "string" && AUTHORING_ROUTES.has(value.route);
exit=0
```

→ **4 hit / exit 0**（定義 2・消費 2）。

**【base 引用にない新制約 — 設計に影響】** #3263（`e461fea3c`）が draft に `authoringProvenance` を必須化した（`tla-registration.ts:203-206` 逐語 `return rejected("draft must carry authoringProvenance");`）。一方 map スキーマ側は **optional**（`amadeus-formal-verif-model-map.ts:368` 逐語 `OPTIONAL_MODEL_KEYS = ["auxiliaries","vocabulary","evidenceBundle","authoringProvenance"]`）。**実データの非対称は §3.3 の表を参照 — 4 モデル中 1 件のみ PRESENT。**

→ **replace-by-name は「provenance を持たない既存エントリを、provenance 必須の draft で置換する」形になり、置換後の provenance 帰属が新たな裁定点になる。** クロスレビューはこの非対称に未言及である。

**加えて `tests/unit/t448-tla-registration.test.ts:294-307` の同名拒否 pin は #2289 の実装で期待値が反転する。** この pin は `if (!snapshot.ok) return;` / `if (!draft.ok) return;` の早期 return を持ち、**parse が失敗するとアサーション 0 件で成功する**（#1982 の zero-assertion ゲートが検出するクラス）。契約変更で fixture が parse できなくなると黙って通るため、実装時に早期 return を明示的な失敗へ変えるのが正しい形である。

### 3.3 #2929 — IMPLEMENTATION_PATHS 拡張

**三面すべて現存する。**

| 面 | 実装 | 許可範囲 | 違反時 |
|---|---|---|---|
| validator 境界 | `amadeus-formal-verif-model-map.ts:248-251` `IMPLEMENTATION_PATHS` | **2 プレフィクス**（`packages/framework/core/tools/` + `/^amadeus-[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/`、`plugins/formal-model-check/tools/` + `/^[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/`） | `:349-351` 逐語 `entries[${index}].implPath is outside the canonical implementation boundary` |
| ローダー境界 | `tla-model-loader-internal.ts:291` 逐語 `const implementationRoot = resolve(repositoryRoot, "packages", "framework", "core", "tools");` | **1 プレフィクス**（`plugins/formal-model-check/tools/` すら含まない） | `:299` の `!isContained(implementationRoot, realPath)` → `:300` `SOURCE_DRIFT` |
| sensor glob | `sensors/amadeus-model-completeness.md:8` 逐語 `matches: "**/{amadeus/spaces/*/specs/tla/**,packages/framework/core/tools/amadeus-election*.ts,packages/framework/core/tools/amadeus-mirror-*.ts}"` | glob 直書き | 自動発火しないだけ（無音） |

→ **#2890 が validator へ足した plugin プレフィクスは現状で使用不能**（スピンオフ候補）。

**model-map の全数**（本 synthesis の `bun -e` 直読、`amadeus/spaces/default/specs/tla/model-map.json`）: schemaVersion **2**、**4 モデル / 13 entries**、全 entries が `packages/framework/core/tools/` 配下（plugin 配下 **0** 件）。

| モデル | entries | namedInvariants / traceStateVariables | sensor glob で自動発火 | `authoringProvenance` |
|---|---|---|---|---|
| BoltPrAttestationGate | 2（`amadeus-orchestrate.ts` / `amadeus-state.ts`） | 11 / 21 | **しない** | **PRESENT** |
| FormalElection | 5（`amadeus-election-codec.ts` / `-record.ts` / `-store.ts` / `-transport.ts` / `amadeus-election.ts`） | 7 / 5 | **する**（`amadeus-election*.ts`） | ABSENT |
| MirrorLifecycle | 4（`amadeus-mirror-coordinator.ts` / `-project-reconciliation-reducer.ts` / `-state-reducer.ts` / `-types.ts`） | 3 / 3 | **する**（`amadeus-mirror-*.ts`） | ABSENT |
| PrConvergenceGate | 2（`amadeus-orchestrate.ts` / `amadeus-state.ts`） | 5 / 8 | **しない** | ABSENT |

**自動発火は 13 entries 中 9**（FormalElection 5 + MirrorLifecycle 4）。**PrConvergenceGate 2 + BoltPrAttestationGate 2 = 4 entries が glob 外**。Developer scan §A-4 refinement 4 が数値で成立する。

**本区間はまさにこの 4 entries を手動 resync している** — `model-map.json` の +14 −6 は `amadeus-orchestrate.ts` ×2 / `amadeus-state.ts` ×2 のハッシュ再ピン（自動発火しない面）+ `amadeus-election.ts` / `amadeus-election-store.ts` の 2 件（自動発火する面）+ BoltPrAttestationGate への `authoringProvenance` 追加である。**被覆の非対称が実運用で顕在化した区間である。**

**落ちる実証の不在**: `git grep -c -F 'is not a regular in-boundary file' -- tests/` → **0 hit / exit 1**（不一致であってエラーではない）。**対照** `outside the canonical implementation boundary` → `tests/unit/t-formal-verif-canonical-core.test.ts:1` / **exit 0**。→ ローダー境界にテスト無し、validator 境界にはある。**落ちる実証は 2 本必要**。

**三重定義の訂正**（Developer scan §A-4）: `git grep -n -F 'function isContained' -- plugins/ packages/ tests/ scripts/` → **2 定義 / exit 0**（`run-model-check-artifacts.ts:129`、`tla-model-loader-internal.ts:141`）。validator 側の対応物は同名ではなく `isCanonicalImplementationPath`（`:330-336`）+ `checkAssetSpaceContainment`（`:619` 呼び出し）。→ 集約するなら **3 つの別名述語の統合**である。

### 3.4 #3187 — advisory authoring-hold の退役面（全数）

裁定（2026-08-20、退役・完全撤去）の実装面を二軸 census（`git grep -l -F`、対象 = `plugins/ packages/ tests/ docs/ .github/ scripts/ amadeus/spaces/default/specs/`）で採取した（Developer scan §A-5）。

| キー | files | 主な着地面 |
|---|---|---|
| `authoring-hold` | 14 | `plugins/formal-model-check/plugin.json:77`、`docs/reference/22-formal-model-supply.{md,ja.md}`、`amadeus/spaces/default/specs/rfc/0001-intent-autonomy-modes.md:249`、t113/t353/t444-advisory-declaration/t445-advisory-declaration-supply/t526/t528/t529/t532、`tests/.coverage-registry.json:1927` |
| `authoring-subjects` | 7 | `tla-authoring.ts:530`、docs 2 面、t481/t524/t527/t528 |
| `advisoryHold` | 4 | `tla-authoring.ts:574`、**`packages/framework/core/tools/amadeus-orchestrate.ts:5675,6606,6639`**、t445-tla-applicability-cli、fixture 1 |
| `subjects declare` | 5 | `tla-authoring.ts:667`、**`stages/tla-authoring.md:53`**、docs 2 面、t450-tla-authoring-stage-e2e |
| `defaultSubjectsPath` | 3 | `tla-authoring.ts:529`、t481/t524 |
| `governed-subjects` | 4 | `tla-authoring.ts`（failure kind `governed-subjects-unreadable`）、t445/t481、fixture |
| `GovernedSubjects` | 1 | `tla-authoring.ts` のみ（型） |

**plugin.json の advisories 直読**（本 synthesis の `bun -e` 実行）: `advisories` は **2 件**。`spec-change` の evaluator argv は `["bun","tools/plugin-activation.ts","advisory","{host-root}","{stage}"]`、`authoring-hold` の evaluator argv は `["bun","tools/tla-authoring.ts","advisory","hold"]`。両者とも checkpoints は `requirements-analysis` / `functional-design` / `build-and-test`、handoff は `formal-model-check`。**別ツールであり、`advisories[]` から `authoring-hold` エントリだけを外せる。**

**退役設計で注意が要る 3 点**:

1. **`amadeus-orchestrate.ts:5675 / 6606 / 6639` の `advisoryHold` は authoring-hold ではない。** `advisoryReportHoldReason(pd, slug, pluginHostRoot())` を受けるローカル変数名で、汎用 advisory 機構（`spec-change` も同経路）である。**engine は無変更でよい** — 名前一致に釣られて触ると `spec-change` を壊す。
2. **書き手 `subjects declare` は stage 契約に配線済みである。** `stages/tla-authoring.md:53` 逐語:

   ```
   4. For a non-empty selected set, run `subjects declare`, then
   ```

   実装は `tla-authoring.ts:649-670`（`subjectsDeclare`）、`:632-647`（`publishSubjects`）、dispatch `:900-901` 逐語 `advisory: { hold: advisoryHold }, subjects: { declare: subjectsDeclare }`、USAGE `:77,80-81`。**#3187 本文の「書き手不在」はクロスレビュー両名が反証済みで observed でも実在する。** → 退役は stage 手順 `:53` / USAGE / `subjectsDeclare` / `publishSubjects` / `GovernedSubjects` / `defaultSubjectsPath` / `advisoryHold` を同一変更で撤去し、blocking pin している t450（`expect(receiving).toContain("subjects declare")`）を同時処理する必要がある。**これは Issue 完了条件 3（plugin.json / 関連コード / t528）が名指す範囲より広い。**
3. **テストは削除と期待値更新に分かれる。** `advisoryHold` の ENOENT 分岐（`:574-599`、`:576` 逐語 `// Only true absence is "nothing is governed here" (the ruled no-hold case).`）と t528 の 3 テスト（`:128` no governed subjects / `:134` declared subject holds…releases on the receipt / `:186` 逐語 `"this repository declares no governed subjects yet, so every intent keeps flowing"`）は同一機構の表裏。**t528 / t524 は削除対象**、t526 / t529 / t532 / t444 / t445 / t353 / t113 は `authoring-hold` を宣言集合の一要素として数える面なので**期待値更新**（削除ではない）。

**実ファイル名の曖昧性に注意**（本 synthesis の `ls` による実測）: `t448` / `t450` / `t524` / `t528` / `t444` / `t445` / `t481` / `t532` はいずれも**同一番号で複数ファイル**が存在する。本 focus に該当するのは `tests/unit/t448-tla-registration.test.ts` / `tests/integration/t450-tla-authoring-stage-e2e.integration.test.ts` / `tests/integration/t524-subjects-declare-writer.integration.test.ts` / `tests/integration/t528-authoring-hold-end-to-end.integration.test.ts` である。**実装時は `git grep -l -F 'authoring-hold' -- tests/` を再実行して実ファイルを確定すること。**

### 3.5 区間の着地による focus スコープの縮小 2 点

| 縮小 | 根拠（observed の実測） |
|---|---|
| **#3186 の別起票候補 (b)（terminal route receipt の永続化）は着地済み** | #3262（`6582768ef`）。`tla-authoring.ts:424` が `--persist` 値を検査、`:447` が `failed({kind:"terminal-route-receipt-required", route: judged.value})`、`tla-applicability.ts:80` に同 failure kind、stage 契約 `:60-64` に逐語 ``The CLI gate rejects a terminal route unless `applicability receipt` is called with `--persist true` ``、新規 doc `plugins/formal-model-check/docs/terminal-route-receipt-audit.md`（+41） |
| **クロスレビュー reviewer-1 の追加論点 10（bare stable id 交差）は解消済み** | #3261（`8cc9f009f`）が交差判定を document identity でスコープ化（`tla-applicability.ts:121-133`）。旧版の bare stable id 集合交差は撤去され、現行は `model.subjectIdentity === subjectIdentity` を先に要求する |

→ **#3186 の要件は「腕 1（語彙 drift 検出述語）+ 腕 3（欠陥再発トリガ）」に絞れる。**

### 3.6 事実と仮説の分離

**事実**（いずれも本節に記した述語で再導出可能。すべて observed `e86fbe125` 断面）:

1. `landed` が PR 系 2 モデルの `Verdicts` / `TerminalVerdicts` に不在であり、両モデルが逐語同一の 2 行を持つこと（§3.1(a)）
2. `stages/tla-authoring.md` に drift / vocabulary 系トークンが 0 hit（exit 1）で、対照が非ゼロ（exit 0）であること（§3.1(b)）
3. `tla-applicability.ts:143` の key 構成が 2 値であり rationale を消費しないこと（§3.1(c)）
4. `composeRegisteredMap` が arity 2 で route 非受理、validator `:615` が名前一意性を要求すること（§3.2）
5. `AUTHORING_ROUTES` が 2 箇所に定義され 4 hit / exit 0 であること（§3.2）
6. `tla-registration.ts:203-206` が `authoringProvenance` を必須化し、`OPTIONAL_MODEL_KEYS`（`:368`）が optional 側に置き、実データは 1-of-4 であること（§3.2 / §3.3）
7. validator / ローダー / sensor glob の 3 境界が別々の範囲を持つこと（§3.3）
8. model-map が 4 モデル / 13 entries、自動発火 9、全 entries が core/tools 配下であること（§3.3）
9. ローダー境界のテストが 0 hit（exit 1）で validator 境界のテストが存在すること（§3.3）
10. `advisories[]` が 2 件で evaluator argv が別ツールであること（§3.4）
11. `subjects declare` が stage 契約 `:53` と実装 `:649-670` に実在し、t450 が blocking pin していること（§3.4）
12. engine 側 `advisoryHold` が同名別物であること（§3.4）
13. #3262 / #3261 の着地により #3186 のスコープが 2 点縮小したこと（§3.5）
14. 区間の除外削減 54.29%（§1.4）と path 分類（§1.3）
15. 行番号訂正 3 件（§2）

**仮説（requirements / design が裁定すべき事項。本スキャンでは決めていない）**:

- **H1**: #3186 の腕 1 は `model-map.json` の `vocabulary.namedInvariants` / `traceStateVariables` を入力として、stage 契約に発火述語を足す形になる。**根拠**: 入力データが既に機械可読で 4 モデル全てが持つため、新機構の発明が不要。**未検証**: 述語を stage 契約（散文）に置くか sensor（機械実行）に置くかは未決。散文に置くと conductor 依存、sensor に置くと glob の被覆非対称（§3.3）を継承する。
- **H2**: #2289 の provenance 帰属は「置換時に新しい provenance を刻む」形になる。**根拠**: draft 側が必須化されている以上、置換操作は provenance を持つ draft を受け取る。**未検証**: 既存 3 モデルが ABSENT である以上、「置換で ABSENT → PRESENT へ変わってよいか」は設計判断であり、map スキーマ側を必須化する（既存 3 件へ遡及して provenance を刻む）別解もありうる。
- **H3**: #2929 の是正は 3 述語の統合を伴う。**根拠**: 片面だけの是正は失敗を下流へ移すという `cid:code-generation:cg2-agreeing-predicate-drift` のパターンに合致する。**未検証**: sensor glob は「自動発火の範囲」を決めるものであり、境界述語とは意味論が異なる。3 面を 1 述語へ統合するのが正しいか、validator / loader の 2 面のみを揃えて glob は別扱いにするかは未決。

## 4. 訂正・申し送り

### 4.1 上流入力（Developer scan）からの訂正

**訂正なし。** 本 synthesis が独立に再実行した項目（base 選定の祖先性と距離、除外削減、path 分類、`AUTHORING_ROUTES` census、model-map 直読、plugin.json 直読、行番号訂正 3 件、metrics 直読、`package.json` 直読、t448 の実読）はいずれも Developer scan と一致した。

### 4.2 上流入力への追補 4 件

1. **`package.json` の devDependencies は 9 件である**（`release-it` 削除後）。Developer scan は削除 1 件を記すが残存数を記さない。本 synthesis の `bun -e` 直読: `@anthropic-ai/claude-agent-sdk` 0.3.158 / `@ast-grep/napi` 0.45.0 / `@biomejs/biome` 2.5.5 / `@opentelemetry/api` 1.9.1 / `@opentelemetry/api-logs` 0.221.0 / `@opentelemetry/context-async-hooks` 2.10.0 / `bun-types` ^1.3.13 / `fast-check` ^4.9.0 / `typescript` ^6.0.3。**`dependencies` フィールドは存在しない**（`undefined`）ため runtime dependency はゼロである。
2. **テストファイル数の 2 つの計数は突き合わない。** git 断面は A 行のうち `*.test.ts` が **17**、D 行が **1** で net **+16**。metrics コレクタの `tests.files` は **+15**（1055 → 1070）。**差 1 の由来は特定していない**（コレクタの母集団述語を測定していない）。**両者を一致するものとして扱わない。**
3. **`bugs` コレクタの `open` が 0 に到達している**（base 側 13 → observed 側 0、closed 392 → 416）。**ただし母集団述語は未測定**であり、本 intent の focus 4 件は observed で機構が実在するため、この計数の母集団は 4 件を含まない。**open 0 を「未解決の課題ゼロ」と読んではならない。**
4. **同一 test-id 番号が複数ファイルに存在する。** #3187 / #2289 が名指す t448 / t450 / t524 / t528 / t444 / t445 / t481 / t532 はいずれも同番号の別ファイルを持つ（§3.4 末尾）。番号だけの指定は実装時に誤ったファイルを指しうる。

### 4.3 再実行していない項目・未検証面

- **テスト実行・coverage・TLC・lint・typecheck・build はすべて未実行**（本スキャンは読取専用。`bun -e` による JSON 直読のみ実行）
- **`git fetch` を伴う `origin/main` との真の drift 判定**（本 synthesis はローカルの remote-tracking ref との一致のみを確認）
- **`dist/` parity は未測定。** `bun run build` は読取専用制約により未実行
- **#1982 silent-success ゲートの実挙動は未検証。** 台帳と実装の実読のみで、`bun tests/run-tests.ts` を走らせていない
- **`docs/reference/22-formal-model-supply.{md,ja.md}` の対訳内容は未読。** `authoring-hold` を説明する唯一の doc 面であることは census で確定しているが、ja 側が別表現で同旨を述べる箇所を持つかは判定していない（#3187 の実装時に実読が必要）
- **`amadeus/spaces/default/specs/rfc/0001-intent-autonomy-modes.md:249` の `authoring-hold` 参照が履歴記述か現行契約かは未判定。** 退役時に削除すべきか保存すべきかは実読して決める必要がある

### 4.4 申し送り

- **4 Issue を 1 つの degrade intent へ載せる構成は構造的に成立しない。** `cid:code-generation:oq-singleton` により、`self-fix` の degrade スコープ（units-generation / delivery-planning が SKIP）では pr-convergence の Delivery Bolt authority が construction 配下の unit ディレクトリ**ちょうど 1 つ**を要求する。2 つ目の unit ディレクトリを作った時点で全 unit の report mint が構造的に不成立になる。**(a) Issue ごとに別 intent へ分ける、または (b) units-generation / delivery-planning を EXECUTE するスコープを選ぶ**、のどちらかが必要である。
- **4 件の write scope は交差する。** 共有ファイルは `tla-authoring.ts`（#2289 × #3187）、`amadeus-formal-verif-model-map.ts`（#2289 × #2929）、`tla-applicability.ts`（#3186 × #2289）、`stages/tla-authoring.md`（#3186 × #3187）の 4 面。**とくに `stages/tla-authoring.md` は #3186 の追加面（`:51` 近傍）と #3187 の削除面（`:53`）が隣接行**であり、並行実装は競合が確実に起きる。`memory/team.md` § Issue 運用の「同一ファイル・進行中 PR との交差は直列化する」が該当する。
- **`tests/` を触るため #1982 silent-success ゲート（fail-closed）が全 unit の射程に入る。** あわせて `tests/.coverage-registry.json` の regen（`bun tests/gen-coverage-registry.ts`、`cid:build-and-test:c1`）が新規テストファイル追加時に必須。
- **`plugins/` を触るため t3078 が発火する。** `plugin.json` の `tools[]`（現状 35 件の明示宣言）と git-tracked `plugins/<name>/tools/*.ts` の一致を blocking 検査する。#3187 で `tla-authoring.ts` を削除する場合は宣言側も同一変更で外す。
- **model-map の実装ハッシュピンは通常発火しない。** `cid:build-and-test:bt-ledger-resync` は `amadeus-orchestrate.ts` / `amadeus-state.ts` を触る変更に課される。**focus 4 件はいずれもこの 2 ファイルを患部に持たない**ため、engine を触らない限り resync は不要である。
- **`packages/framework/harness/` の conductor 散文を触る場合は `tests/` の `toContain` pin を census 対象に含める**（`cid:build-and-test:bt-prose-literal-test-ledger`）。本区間でも 8 conductor 面が #2837 / #3197 / #3271 により同期されている。
- **落ちる実証は #2929 で 2 本必要。** validator 境界（既存テストあり）とローダー境界（テスト 0 件）。`memory/team.md` Mandated の「新設のゲート・検証スクリプト・チェックは落ちる実証を経て完成扱いにする」に従う。
- **inception ステージの questions ファイルは depth の上限に収める**（`cid:code-generation:c1-question-budget-corpus`）。本 intent の depth は **Minimal = 4 問**。record を Bolt PR へ同梱した瞬間に `tests/integration/t517-question-budget-sensor.integration.test.ts` の corpus sweep が blocking で発火する。
- **受け入れ基準は配送先の実ツリーに対する述語で書く**（`cid:requirements-analysis:c2-acceptance-at-delivery-tree`）。#3187 は `plugins/` と `docs/` の両方を触り、plugin は `dist/<harness>/` とセルフインストール面へ投影される。ソース断面だけの green は変換器を持たない配送路の退行を隠す。
- **本 intent の RE 成果物は workflow process record を新規に引用していない**（`stages/inception/reverse-engineering.md` の規範、逐語 `Never cite a workflow process record the codekb does not already cite.`）。本 intent の確立事実は `issue-evidence.md` を経由してのみ引いた。既存 artifact 内の過去の引用は履歴として保持している。
- **未決事項**（`memory/team.md` P1 の裁定事項。本スキャンでは決めていない）: 4 件の是正方式すべて。#3186 は「発火述語を stage 契約に置くか sensor に置くか」「腕 3（欠陥再発トリガ）の形」、#2289 は「置換時の `authoringProvenance` 帰属」「`AUTHORING_ROUTES` を 1 定義へ集約するか」、#2929 は「3 述語を統合するか validator / loader の 2 面のみ揃えるか」、#3187 は「退役範囲を Issue 完了条件に留めるか書き手まで含めるか」「RFC 内の参照を削除するか保存するか」が主要な争点である。

## 5. Verification

- git 状態変更（commit / branch / checkout / stash / merge / fetch）: **ゼロ**
- GitHub 書込・読取: **ゼロ**（`gh` を一切実行していない）
- engine / state ツール実行（`amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-log.ts` / `amadeus-bolt.ts` / `amadeus-election.ts`）: **ゼロ**
- `bun run build` / フルスイート / coverage / TLC / lint / typecheck: **すべて未実行**（`bun -e` による JSON 直読のみ）
- 書き込み範囲: `amadeus/spaces/default/codekb/amadeus/` 配下のみ（本体 **8 面**への追記 + `reverse-engineering-timestamp.md` + 本ファイル）。record（`intents/` 配下）への書込は**ゼロ**
- 現在時制マーカーの降格（`cid:reverse-engineering:c1`）: 追記前の census `grep -n "^## .*、現在、" *.md` → **8 行**。うち 7 件が `260818-priority-bug-batch-4`、1 件（`technology-stack.md`）が `260816-priority-bug-batch-3`。**8 件すべてを履歴ラベルへ降格**した。降格は見出し行のみで、本文と当時の file:line は保存している
- 検索述語の健全性（`cid:reverse-engineering:c6-absence-predicate-exit-code` / `c6-ugrep-word-boundary` / `bt-zsh-census-false-negative`）: 本 synthesis の grep はすべて `git grep -F` または `grep -n` を使い、**ERE の `\b` を使わず、複雑度上限に該当する長い選言も使っていない**。不在主張に使った述語（`is not a regular in-boundary file`、`stages/tla-authoring.md` へのトークン census）はいずれも **exit 1**（エラーなく不一致）を実測し、**実在既知の対照リテラルを同居させて exit 0 / 非ゼロ hit を確認**している。ファイル集合の走査はシェルのループを使わず、`git grep` の pathspec と `awk` の集計で行った
- 数値の出所（`cid:requirements-analysis:numbers-from-command-output-only`）: 本記録の全件数・実測値は §1〜§3 に併記した述語の出力からの転記であり、測定 ref は断りのない限り observed `e86fbe125`。派生値（54.29% / 68.90% / 約 102.8%）はすべて算出式を併記した
