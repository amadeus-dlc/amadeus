# リバースエンジニアリング差分スキャン記録: 260817-inception-cost-batch

## 0. メタデータ

| 項目 | 値 |
|---|---|
| Date | `2026-08-17`（UTC） |
| Intent | `260817-inception-cost-batch` |
| Scope / depth / project type | `self-feature` / Standard / Brownfield |
| Repository | `amadeus`（単一 repo、root `/Users/j5ik2o/orca/workspaces/amadeus/fix-0818-2`） |
| Branch | `fix-0818-2`（HEAD == `origin/main`） |
| Base commit | `89053172ed8b5bb270e254aea029a13291d10b6b`（**選定根拠**: `re-scans/` 中で HEAD の祖先である observed のうち最も新しいもの = 前回スキャン 260816-priority-bug-batch-3 の observed。距離 **12**） |
| Observed commit | `23d4ae767956cd56fc28fa78abe28096712eff8a`（`git rev-parse HEAD`。`git rev-parse origin/main` と**同一コミット**、drift 0） |
| Scan mode | **通常の差分リフレッシュ**（xrev differential 不採用。理由は §1.1） |
| Focus | [#3181](https://github.com/amadeus-dlc/amadeus/issues/3181)（Issue 証跡を requirements-analysis の一級上流入力にする）+ [#2415](https://github.com/amadeus-dlc/amadeus/issues/2415)（reverse-engineering のスキャン入力から workflow exhaust を除外する） |
| 分担 | Developer scan（`amadeus-developer-agent`）→ 本 Architect synthesis。本記録の実測値は出典を「Developer scan §N」と「本 synthesis の再実行」で書き分ける |

**祖先性と距離**（`cid:reverse-engineering:rescan-base-ancestry`、いずれも本 synthesis の再実行）:

- `git merge-base --is-ancestor 89053172ed8b5bb270e254aea029a13291d10b6b HEAD` → **exit 0**
- `git rev-list --count 89053172e..23d4ae767` → **12**

**drift**: `git rev-parse HEAD` と `git rev-parse origin/main` がいずれも `23d4ae767956cd56fc28fa78abe28096712eff8a` を返す（本 synthesis の再実行）。`git fetch` は実行していないため、これはローカルの remote-tracking ref との一致である。

## 1. Scan mode と区間の分類

### 1.1 xrev differential を採らない理由

`cid:reverse-engineering:c5-xrev-currency-schema-migration` の判定手順を focus 2 件へ適用した。

1. **患部の表現形式そのものを変える移行が、Issue 起票断面と observed の間に挟まっているか** → **2 件とも No**。#2415 の患部は RE stage 契約の散文（`reverse-engineering.md`）、#3181 の患部は RA stage 契約の frontmatter（`requirements-analysis.md`）であり、どちらも本区間で**一切変更されていない**（`git diff --name-only 89053172e..23d4ae767 -- packages/framework/core/amadeus-common/` → **空出力・exit 0**、本 synthesis の実測）。スキーマ移行も挟まっていない。
2. したがって currency 条件は成立するが、**xrev differential mode を単独で採る利得が無い**（両 Issue はクロスレビュー verdict の行ピンではなく契約ファイルの現況を読めば足りる）ため、**通常の差分リフレッシュ**とした。
3. 本記録の focus 節（§3）の file:line は**すべて observed `23d4ae767` 断面で取り直している**。

### 1.2 区間の構成 — 前 intent の 5 unit 全着地

`git log --oneline 89053172e..23d4ae767`（本 synthesis の実測、12 行）:

| コミット | PR | 種別 |
|---|---|---|
| `6013271f2` | [#3173](https://github.com/amadeus-dlc/amadeus/pull/3173) | code — [#3152](https://github.com/amadeus-dlc/amadeus/issues/3152): `INTENT_AUTONOMY_HUMAN_REQUIRED` の発行を gate-start へ移し occurrence 鍵で dedupe |
| `05ce3b64c` | [#3175](https://github.com/amadeus-dlc/amadeus/pull/3175) | code — [#3153](https://github.com/amadeus-dlc/amadeus/issues/3153): human-required milestone gate を gate-open 後の HUMAN_TURN へ束縛し `GATE_APPROVED` に provenance を刻印 |
| `585a87d9a` | [#3172](https://github.com/amadeus-dlc/amadeus/pull/3172) | code — [#3149](https://github.com/amadeus-dlc/amadeus/issues/3149): report-format 検査を attested merge facts へ束縛し presence ゲート付き override 最終化を追加 |
| `27f0d658b` | [#3174](https://github.com/amadeus-dlc/amadeus/pull/3174) | code — [#3156](https://github.com/amadeus-dlc/amadeus/issues/3156): birth 境界より前の intent 帰属ソース作業を probe |
| `0b652d2cd` | [#3171](https://github.com/amadeus-dlc/amadeus/pull/3171) | code — [#3046](https://github.com/amadeus-dlc/amadeus/issues/3046): pending ballot 採番を voter 単位へスコープし append TOCTOU を除去 |
| `0f4258247` / `76a8d0893` / `e157be644` / `882ac9053` / `f15ab80f1` | #3176 / #3177 / #3178 / #3179 / #3182 | record only（metrics snapshot、各 code コミットの直後） |
| `6ca94dd56` / `23d4ae767` | #3180 / #3184 | record only（pbb3 の最終 checkpoint、audit 行の掃き出しと選挙登録） |

**前スキャンが記した 5 欠陥はすべて是正済み**である。区間はアプリケーションドメインのコードを一切含まず、全変更が Amadeus 自己開発である。

### 1.3 区間の path 分類 — **workflow exhaust が挿入行の 61.76%**

**再実行可能な集計述語**（本 synthesis の実測、exit 0。`awk` の正規表現リテラル中で `/` を含む文字クラスが書けないため、繰り返し部分を変数 `q` で渡している）:

```bash
git diff --numstat 89053172e..23d4ae767 | awk -v q="[^/]+" '
{ ins=$1+0; f=$3;
  if      (f ~ ("^amadeus/spaces/" q "/intents/"))   b="intents-records";
  else if (f ~ ("^amadeus/spaces/" q "/codekb/"))    b="codekb";
  else if (f ~ ("^amadeus/spaces/" q "/elections/")) b="elections";
  else if (f ~ ("^amadeus/spaces/" q "/specs/"))     b="specs-ledger";
  else if (f ~ ("^amadeus/spaces/" q "/memory/"))    b="memory";
  else if (f ~ /^metrics\//) b="metrics";
  else if (f ~ /^tests\//)   b="tests";
  else if (f ~ /^docs\//)    b="docs";
  else                       b="source_other";
  I[b]+=ins; N[b]+=1; T+=ins; TN+=1 }
END { for (k in I) printf "%-16s %6d ins  %3d files\n", k, I[k], N[k];
      printf "%-16s %6d ins  %3d files\n","TOTAL",T,TN }' | sort -k2 -rn
```

| バケット | insertions | files |
|---|---|---|
| `intents-records` | 3,139 | 63 |
| `tests` | 2,095 | 18 |
| `source_other`（= `packages/` + `plugins/`） | 963 | 12 |
| `codekb` | 936 | 10 |
| `metrics` | 455 | 5 |
| `elections` | 425 | 10 |
| `specs-ledger` | 4 | 2 |
| `docs` | 4 | 2 |
| `memory` | 2 | 1 |
| **TOTAL** | **8,023** | **123** |

**バケットの健全性検証**（本 synthesis の独立実行）: `git diff --numstat 89053172e..23d4ae767 -- packages/ plugins/ \| awk '{i+=$1; n+=1} END {print i, n}'` → **963 12**（`source_other` と一致）。同じく `-- tests/` → **2095 18**（`tests` と一致）。`memory` の 1 件は `amadeus/spaces/default/memory/project.md`（+2 −0）。

**workflow exhaust の合計**:

```bash
git diff --numstat 89053172e..23d4ae767 \
  -- 'amadeus/spaces/*/intents/**' 'amadeus/spaces/*/codekb/**' \
     'amadeus/spaces/*/elections/**' 'metrics/**' \
  | awk '{i+=$1; n+=1} END {printf "ins=%d files=%d\n", i, n}'
```

→ **ins=4955 files=88**。全体比は **61.76%（4955/8023）/ 71.5%（88/123）**（いずれも派生値、算出式併記）。

### 1.4 分類上の要注意事実 — **`amadeus/spaces/**` の前方一致は TLA ビルド台帳を巻き添えにする**

**これは #2415 の述語設計に直接効く事実なので、独立した項として記録する。**

コード面の測定に使われる pathspec `git diff --shortstat 89053172e..23d4ae767 -- ':(exclude)amadeus/spaces/**' ':(exclude)metrics/**'` は **32 files / +3,062 −339** を返す（本 synthesis の再実行、exit 0）。しかし `packages/` + `plugins/` + `tests/` + `docs/` の実測合計は **963 + 2,095 + 4 = 3,062 insertions / 12 + 18 + 2 = 32 files** であり、この pathspec は上表の `specs-ledger`（4 insertions / 2 files）を**除外している**。

除外された 2 ファイル（`git diff --numstat 89053172e..23d4ae767 -- 'amadeus/spaces/default/specs/**'`、本 synthesis の実測）:

```
1	0	amadeus/spaces/default/specs/tla-evidence/fb1029e47c3ef5f6e126b1da516eab6ca61d0596c396c3536571eb323ad8f42c.json
3	3	amadeus/spaces/default/specs/tla/model-map.json
```

**この 2 面は workflow exhaust ではなく、`cid:build-and-test:bt-ledger-resync` が同一変更での resync を義務づけるビルド台帳である。** `model-map.json` の差分は `packages/framework/core/tools/amadeus-state.ts`（2 箇所）と `amadeus-election-store.ts`（1 箇所）の impl ハッシュピン **3 行**の更新である（`git diff -U0 ... \| grep -c '^+ *"sha256"'` → **3**、本 synthesis の実測）。怠るとフルスイートが `SOURCE_DRIFT` で赤化する面であり、スキャン対象から落ちてよい面ではない。

**したがって #2415 の除外規則を `amadeus/spaces/**` の前方一致で書くと、この台帳が無音でスキャン対象から落ちる。** Developer scan §1 が同じ reconciliation を「4-insertion, 2-file delta」として記録しており、本 synthesis の再実行はこれを再現した。

### 1.5 構造変化 — 新規 0 / 削除 0 / 変更 14

| 述語 | 結果 | 出典 |
|---|---|---|
| `git diff --name-status 89053172e..23d4ae767 -- packages/ plugins/ docs/ .github/` | **`M` 14 行のみ**（`A` 0 / `D` 0） | 本 synthesis |
| `git diff --name-status 89053172e..23d4ae767 \| awk '{print $1}' \| sort \| uniq -c` | **A 82 / M 41**（`D` は 0） | 本 synthesis |
| `git diff --name-only 89053172e..23d4ae767 -- packages/framework/harness/` | **空出力・exit 0** | 本 synthesis |
| `git diff --name-only 89053172e..23d4ae767 -- .github/` | **空出力・exit 0** | 本 synthesis |
| `git diff --stat 89053172e..23d4ae767 -- package.json bun.lock '**/package.json'` | **空出力・exit 0** | 本 synthesis |
| `git diff --name-only 89053172e..23d4ae767 -- packages/framework/core/amadeus-common/` | **空出力・exit 0**（= **focus 2 件の患部は区間で無変更**） | 本 synthesis |

変更 14 面の規模（`git diff --numstat`、本 synthesis）: `amadeus-state.ts` +198 −39 / `amadeus-intent-autonomy-production.ts` +136 −12 / `amadeus-lib.ts` +106 −8 / `amadeus-election-store.ts` +58 −17 / `amadeus-intent-autonomy.ts` +7 −0 / `otel/event-registry.ts` +2 −2 / `knowledge/amadeus-shared/audit-format.md` +4 −2 / `pr-convergence-cli.ts` +318 −53 / `amadeus-sensor-pr-convergence-report-format.ts` +70 −25 / `pr-convergence-attestation.ts` +4 −3 / `stages/pr-convergence.md` +38 −12 / `sensors/amadeus-pr-convergence-report-format.md` +22 −0 / `docs/reference/12-state-machine.md` +2 −2 / 同 `.ja.md` +2 −2。

## 2. 測定述語と実測値（区間全域）

断りのない限り observed tree（`23d4ae767`）に対して実行した。書き込みは `amadeus/spaces/default/codekb/amadeus/` 配下のみである。

### 2.1 新規 export

`git grep -n "export type GateApprovalProvenance\|export interface GateResolutionPresence\|export function resolveGateResolutionPresence\|export function isMilestoneInteraction\|export function recordAutonomyRefusalAtGateOpen\|export interface GateOpenRefusalInput\|export interface ProductionStageAutonomyInput" 23d4ae767 -- 'packages/framework/core/tools/*.ts'`（本 synthesis、exit 0）→ **7 件**。

| シンボル | file:line |
|---|---|
| `ProductionStageAutonomyInput` | `packages/framework/core/tools/amadeus-intent-autonomy-production.ts:293` |
| `GateOpenRefusalInput` | 同 `:419` |
| `recordAutonomyRefusalAtGateOpen` | 同 `:432` |
| `isMilestoneInteraction` | `packages/framework/core/tools/amadeus-intent-autonomy.ts:762` |
| `GateApprovalProvenance` | `packages/framework/core/tools/amadeus-lib.ts:3912` |
| `GateResolutionPresence` | 同 `:3958-3960`（`export type` は `:3958`） |
| `resolveGateResolutionPresence` | 同 `:3967` |

### 2.2 テスト面

| 述語 | 結果 |
|---|---|
| `git ls-tree -r --name-only <c> tests/<dir> \| grep -c '\.test\.ts$'`（base `89053172e`） | unit **432** / integration **597** / e2e **97** / smoke **16** |
| 同（observed `23d4ae767`） | unit **432** / integration **599** / e2e **97** / smoke **16** |
| `git diff --name-status 89053172e..23d4ae767 -- 'tests/**' \| grep -E '^[AD]'` | **A 4 行 / D 0 行** |
| `git diff --name-status 89053172e..23d4ae767 -- tests/unit/t206-source-work-intent-span.test.ts` | **`M`**（新規ではない） |
| `git show 89053172e:tests/unit/t206-source-work-intent-span.test.ts \| wc -l` → `git show 23d4ae767:… \| wc -l` | **402 → 569** |

新規 4 件: `tests/integration/t3149-pr-convergence-merged-finalisation.integration.test.ts`（+739）/ `tests/integration/t3046-election-append-voter-race.integration.test.ts`（+348）/ `tests/helpers/election-append-race-child.ts`（+72、子プロセス駆動のレースヘルパ）/ `tests/no-silent-drop/events/01M06XDWGXGY27WD0XSET1R3Q0.json`（+13、`.test.ts` ではない）。

### 2.3 品質指標

**測定元**: `metrics/2026-08-16T20-57-24-618Z-2555e5b42914.json`（base 側）と `metrics/2026-08-17T12-24-08-673Z-0b652d2cd1a6.json`（observed 側 = 区間内最後）の `collectors.<name>.values` を `bun -e` で直読（本 synthesis の実行、exit 0）。区間内 snapshot は **5 件**。

| 指標 | base | observed | 差 |
|---|---|---|---|
| coverage percent | 93.39685396775708 | 93.39885723200531 | **+0.0020pp** |
| coverage hits / lines | 95474 / 102224 | 95788 / 102558 | +314 / +334 |
| test files / assertions | 1045 / 13891 | 1047 / 13939 | +2 / +48 |
| failed files / assertions | 0 / 0 | 0 / 0 | 横ばい |
| unit_small / integration_medium | 270 / 581 | 270 / 583 | ±0 / +2 |
| loc core / tests / scripts | 148956 / 384400 / 13092 | 149387 / 386333 / 13092 | +431 / +1933 / ±0 |
| ccn 関数数 / 閾値超過 / max | 7295 / 32 / 38 | 7320 / 32 / 38 | +25 / **±0** / ±0 |
| bugs total / open / closed | 398 / 11 / 387 | 400 / **13** / 387 | +2 / +2 / **±0** |

**coverage は前区間の −0.0225pp から +0.0020pp へ反転した。** 新規行の被覆率は **約 94.0%**（314/334、派生値）。**open bugs +2 は「5 件直して 2 件増えた」ではない** — `closed` が 387 で不変なので 5 件のクローズはこの snapshot より後であり、+2 は `s4_minor` の +2（79 → 81）と一致する。

### 2.4 台帳（5 クラス、すべて同一区間内で resync 済み）

| 台帳 | 規模 |
|---|---|
| `tests/.coverage-registry.json` | +23 −6 |
| `tests/.coverage-patch-allowlist.json` | +34 −1 |
| `tests/.coverage-ratchet.json` | +2 −2 |
| `tests/no-silent-drop/approval.json` + `events/01M06XDWGXGY27WD0XSET1R3Q0.json` | +9 −1 / +13 |
| `amadeus/spaces/default/specs/tla/model-map.json` + `specs/tla-evidence/fb1029e4….json` | +3 −3（impl ハッシュピン 3 行）/ +1 |

## 3. Focus findings

**本節の file:line はすべて observed `23d4ae767` 断面で本 synthesis が逐語確認した。** 事実と仮説は §3.5 で明示的に分離する。

### 3.1 #2415 — RE stage 契約における入力面の所在と、除外規則の不在

対象: `packages/framework/core/amadeus-common/stages/inception/reverse-engineering.md`（**237 行**、`git show 23d4ae767:… | wc -l`）。

**frontmatter の構造**（`sed -n '10,27p'` の逐語確認）:

| 面 | 行 | 内容 |
|---|---|---|
| `produces:` | `:10-19` | 9 artifact（`business-overview` / `architecture` / `code-structure` / `api-documentation` / `component-inventory` / `technology-stack` / `dependencies` / `code-quality-assessment` / `reverse-engineering-timestamp`） |
| **`consumes: []`** | **`:20`** | 逐語 `consumes: []` — **RE は今日いかなる artifact も consume しない** |
| `requires_stage:` | `:21-22` | `state-init` のみ |
| `sensors:` | `:23-27` | `required-sections` / `upstream-coverage` / `answer-evidence` / `question-budget` |
| `inputs:` / `outputs:` | `:42` / `:43` | （Developer scan §4a からの転記） |

**差分リフレッシュ関連の散文は 2 ブロックに分かれている**（本 synthesis の逐語確認）:

- **`:81-95` — `#### Preflight: refresh from the latest reachable codekb`**。trunk の取込と、codekb body 8 面が last-writer-wins の派生キャッシュであることを述べる。**「base をどう最新化するか」を定める節であり、「何を読むか」を定める節ではない。**
- `:149-155` — 並行性契約
- `:157-181` — Per-intent scan record 契約（base/observed/focus/date、`codekb-path --repo <repo> --re-scan`）。`:178-181` は #707 による `reverse-engineering-timestamp.md` の freshness-only 降格

**スキャン対象（入力面）の唯一の定義箇所**（`sed -n '100,116p'` の逐語確認）:

- `:104-105` — 逐語（契約ファイルの生ソース）:

  ```markdown
  Developer scans `<repo>`'s codebase (the sibling dir `<workspace>/<repo>/`; for a
  single-repo intent this is the whole codebase) for:
  ```

- `:106-112` — 7 bullet（`All packages, modules, and their purposes` / `Build systems, configuration, and dependency relationships` / `External and internal APIs (endpoints, contracts, methods)` / `Frameworks, libraries, and their versions` / `Test directories, test frameworks, coverage configuration` / `Code quality indicators (linting, CI/CD, documentation)` / `Technical debt signals`）
- `:114` — Developer テンプレートへの引き渡し（`templates/re-artifacts.md`）

**除外規則の不在（事実）**:

```bash
git grep -n -iE "exclude|excluded|exclusion|workflow exhaust|process record" 23d4ae767 \
  -- packages/framework/core/amadeus-common/stages/inception/reverse-engineering.md \
     packages/framework/core/amadeus-common/templates/re-artifacts.md
```

→ **出力なし・exit 1**。`cid:reverse-engineering:c6-absence-predicate-exit-code` に従い exit code を確認した — **exit 1 は「エラーなく不一致」であり、エラー時の exit 2 ではない**。述語は 5 選択肢の単純選言で、`cid:reverse-engineering:c6-ugrep-word-boundary` が警告する ERE の `\b` を含まない。したがって **RE 契約にも Developer テンプレートにも、スキャン対象から何かを除外する規則は存在しない**。

**上流入力（Developer scan）との突き合わせ**: Developer scan §4a の enumeration・行ピン・grep exit 1 を本 synthesis で独立に再実行し、**不一致ゼロ**であった。

### 3.2 #3181 — RA stage 契約の consume 面と、issue 情報の現行経路

対象: `packages/framework/core/amadeus-common/stages/inception/requirements-analysis.md`（**217 行**、同述語）。

**`consumes:` は `:14-29`（6 件）で、Issue 由来の artifact はゼロ**（`sed -n '14,30p'` の逐語確認）:

| # | artifact | 行 | 条件 |
|---|---|---|---|
| 1 | `intent-statement` | `:15` | `required: false` |
| 2 | `scope-document` | `:17` | `required: false` |
| 3 | `business-overview` | `:19` | `required: false`、`conditional_on: brownfield` |
| 4 | `architecture` | `:22` | `required: false`、`conditional_on: brownfield` |
| 5 | `code-structure` | `:25` | `required: false`、`conditional_on: brownfield` |
| 6 | `team-practices` | `:28` | `required: false` |

**消費された artifact を読む Step は `:68-71`（Step 2: Load Prior Context）**（`sed -n '66,74p'` の逐語確認）:

逐語（契約ファイルの生ソース）:

```markdown
- If brownfield: Read RE artifacts from `amadeus/spaces/<active-space>/codekb/<repo>/` (the directory `codekb-path --repo <repo>` prints)
- Read user's project description from `<record>/audit/<host>-<clone>.jsonl`
```

1 行目が `:70`、**2 行目が `:71`**。

**すなわち今日、issue 的な入力が RA へ届く唯一の経路は audit shard に書かれた散文である** — 構造化されず、検証されず、`consumes:` にも現れない。この行が #3181 の言う「一級 artifact」に置き換わる対象の最も近い既存アナログである。

**サイジング上の注意（本 synthesis の独立実測）**: `upstream-coverage` sensor の記述は同契約 `:185` にある。逐語（契約ファイルの生ソース）:

```markdown
- **`upstream-coverage`** verifies the output prose references each artefact declared in this stage's `consumes:` frontmatter. Failure mode: missing upstream references emit `SENSOR_FAILED` listing each unreferenced artefact (this stage consumes `intent-statement`, `scope-document`, `team-practices`).
```


**2 点が導かれる。** (a) consume を 1 件足すと `requirements.md` 側に**散文参照義務**が生じる（frontmatter 1 行では済まない）。(b) **`:185` の括弧書きは現状 6 件のうち 3 件（brownfield 条件なしのもの）しか列挙していない**ため、consume を増やす変更ではこの散文自体も同期対象になる。Developer scan §4b は (a) を記録していたが (b) は本 synthesis の追加である。

### 3.3 artifact 種別 → path の解決（新 artifact のサイジング）

**レジストリファイルは存在しない。** `.claude/tools/data/` にも `packages/framework/core/tools/data/` にも artifact パスを保持するファイルは無く、写像は規約としてコードが計算する。

| 面 | file:line（observed） | 内容 |
|---|---|---|
| 型 | `packages/framework/core/tools/amadeus-stage-schema.ts:39-43` | `consumes: Array<{ artifact: string; required: boolean; conditional_on?: "brownfield" \| "greenfield" }>` |
| 検証 | 同 `:277-316`（Rule 8） | `artifact` は kebab-case（`ARTIFACT_SLUG_RE`、`:156` 逐語 `/^[a-z][a-z0-9-]*$/`、適用は `:297`）、`required` は必須 boolean（`:301-305`）、`conditional_on` は `VALID_CONDITIONAL_ON` の閉語彙（`:307-316`。語彙の正本は同 `:91` 逐語 `export const VALID_CONDITIONAL_ON = ["brownfield", "greenfield"] as const;`） |
| パス解決 | `packages/framework/core/tools/amadeus-orchestrate.ts:2378-2400` `resolveArtifactPath(name, owner, unit, recordPrefix, codekbCtx)` | artifact `X` → `<prefix>/<owner.phase>/<owner.slug>/X.md`。**codekb arm** `:2392-2394`（`isCodekb(owner) && codekbCtx` で space レベルの codekb dir へ）、**per-unit arm** `:2396-2398`（`construction/{unit}/` を挿入） |
| 所有者解決 | 同 `:2411-2420` `resolveConsumePath` | パスは **producing stage**（`producersOf(name)[0]`）で決まる。消費側では決まらない。producer 不在時は消費側 dir へフォールバックするが、それは「doctor が surface する graph 欠陥」と明記 |
| producer 列挙 | `packages/framework/core/tools/amadeus-graph.ts:856` `producersOf(artifact): GraphStage[]` | — |
| **孤児は hard error** | 同 `:1192-1198` | `producers.length === 0` のとき `errors.push` する。メッセージは逐語 `Stage "<slug>" requires artifact "<name>" but no stage in the graph produces it.` |
| 経路外 producer | 同 `:1200-1206` | advisory。`opts.strict`（recompose モード）でのみ error へ昇格 |
| codekb stage 集合 | `packages/framework/core/tools/amadeus-lib.ts:1461` | 逐語 `export const KNOWN_CODEKB_STAGES: ReadonlySet<string> = new Set(["reverse-engineering"]);` — **単一要素集合**。参照は `amadeus-orchestrate.ts:147/:2338/:3336`、`amadeus-sensor.ts:54/:454`、`amadeus-state.ts:46/:2142/:4316` |
| 追加手順の正本 | `docs/reference/16-artifact-vocabulary.md:212-226` | producing stage の `produces:` / `optional_produces:` へ名前追加 → `bun amadeus-graph.ts artifacts` で確認 → `/amadeus --doctor` で参照検査（「No edit to this chapter required — the registry is derived.」） |

**サイジング上の帰結**: 新 artifact 種別は **resolver 側のコード 0 行**で足りるが、**consume だけの artifact は graph の hard error になる**ため、Issue を取り込む stage が `produces:` にそれを宣言しなければならない。これが #3181 の設計上の最も強い制約である。

### 3.4 #3181 の取り込みに使える既存 GitHub 面

対象: `packages/framework/core/tools/amadeus-github-gateway.ts`（**1,034 行**、同述語）。ヘッダは自身を「GitHub と話す唯一のプロセス境界」と宣言する。

| 面 | file:line | 内容（逐語または要約） |
|---|---|---|
| 単一 Issue の GET | `:175-180` `viewArgv(repo, issueNumber)` | 逐語 ``return ["api", "--include", "--method", "GET", `${issuesPath(repo)}/${issueNumber}`];`` |
| DTO 検証 | `:418-446` `parseIssueObject(element, repo)` | `number` / `title`（string 必須）/ `body`（null は `""` へ正規化）/ `state`（`open`→`OPEN`、`closed`→`CLOSED`、それ以外は null）を検証。**`:439-442` で `repository_url` をパースし直し、要求 repo の `canonical` と一致することを cross-check**。戻り値 `RemoteGitHubIssue { repository, number, title, body, state }` |
| readiness preflight | `:799-830` | `gh --version`（`versionArgv()` `:112`）→ `gh auth status --hostname github.com`（`authArgv()` `:116`）。非 0 exit で型付き `"not-installed"` / `"unauthenticated"` を `"no-effect-confirmed"` certainty 付きで返す。失敗要約は固定 redaction テンプレートから再構成され、raw stdout/stderr を運ばない |
| 既存 adapter | `:944` `createMirrorGitHubGatewayAdapter` / `:950` `createFindingGitHubGatewayAdapter` | 消費者ごとに 2 種 |
| port 側の宣言 | `packages/framework/core/tools/amadeus-finding-types.ts:19` / `amadeus-mirror-types.ts:427` | `readiness(repository): Promise<…<void>>` |
| port 側の呼出 | `packages/framework/core/tools/amadeus-finding.ts:94` / `amadeus-mirror-executor.ts:754-793` | 後者は readiness 失敗を**ワークフローを止めない記録済み警告**として扱う（fail-open mirror 方針） |

**帰結（事実）**: title + body の取り込みに**新しい transport コードは要らない**。`gh-scripts-boundary` ノルムが要求する runnable / auth readiness の事前検査は**規範だけでなく実装済み**であり、token 非保持の半分も redaction テンプレートで満たされている。mutation permit（`validateMirrorMutationPermit` / `validateFindingMutationPermit`）は write のみを gate するので、read-only の証跡取り込みは permit を要しない。

### 3.5 事実と仮説の分離

**事実**（いずれも本節に記した述語で再導出可能。すべて observed `23d4ae767` 断面）:

1. RE 契約 `:20` が `consumes: []` であること、`produces:` が `:10-19` の 9 件であること
2. RE 契約の入力面は `:104-112` の列挙のみで、`:81-95` の Preflight は base 更新方針であること
3. RE 契約と `templates/re-artifacts.md` に除外規則が**不在**であること（grep **exit 1** = エラーなく不一致）
4. RA 契約 `:14-29` の 6 consume がいずれも Issue 由来でないこと、全件 `required: false` であること
5. RA の Step 2 が `:70`（codekb）と `:71`（audit shard の散文）を読み、issue 的入力は後者のみであること
6. `upstream-coverage` の散文（RA `:185`）が現状 3 artifact しか括弧書きに列挙していないこと
7. artifact のレジストリファイルが存在せず、`resolveArtifactPath`（`amadeus-orchestrate.ts:2378-2400`）が規約で計算すること
8. consume のパスが `producersOf(name)[0]` で決まり（`:2411-2420`）、producer 不在の consume が **hard error**（`amadeus-graph.ts:1192-1198`）であること
9. `KNOWN_CODEKB_STAGES` が単一要素集合であること（`amadeus-lib.ts:1461`）
10. gateway の `viewArgv` / `parseIssueObject` / `readiness` / adapter 2 種が既存であること
11. 区間の path 分類（§1.3）と、`amadeus/spaces/**` 前方一致が TLA ビルド台帳 2 ファイルを巻き添えにすること（§1.4）
12. focus 2 件の患部（`packages/framework/core/amadeus-common/`）が本区間で**無変更**であること

**仮説（requirements / design が裁定すべき事項。本スキャンでは決めていない）**:

- **H1**: #2415 の除外規則の自然な置き場が Step 2 の入力列挙付近（`:104` 近傍の新設サブセクション）であること。**根拠**: そこが入力面を定義する唯一の箇所であり、Preflight（`:81-95`）へ置くと base 更新方針という別の対象を拘束することになる。**未検証**: #2415 の本文がどの粒度の是正を求めているか（散文の追加か、Developer テンプレートの変更か、機械述語の新設か）と突き合わせていない。
- **H2**: #3181 が新規 gh 呼出ではなく **3 つ目の read-only adapter** として gateway を再利用する形になること。**根拠**: mutation permit は write のみを gate し、`viewArgv` + `parseIssueObject` がそのまま使える。**未検証**: #3181 の本文と突き合わせていない。

## 4. 訂正・申し送り

### 4.1 上流入力（Developer scan）からの訂正 1 件

**`tests/unit/t206-source-work-intent-span.test.ts` は新規ファイルではない。** Developer scan §3 は「1 new unit suite `t206-source-work-intent-span` (+167)」と記すが、本 synthesis の実測は次のとおり:

| 述語 | 結果 |
|---|---|
| `git diff --name-status 89053172e..23d4ae767 -- tests/unit/t206-source-work-intent-span.test.ts` | **`M`**（`A` ではない） |
| `git cat-file -e 89053172e:tests/unit/t206-source-work-intent-span.test.ts` | **exit 0**（base に実在） |
| `git show 89053172e:… \| wc -l` / `git show 23d4ae767:… \| wc -l` | **402** → **569**（+167 −0） |
| unit 層の総数（base / observed） | **432 / 432**（不変 — 新規 unit ファイルがゼロであることの裏づけ） |

**区間の新規テストスイートは integration 2 本のみ**（t3149 / t3046）であり、これにヘルパ 1 本と no-silent-drop の ULID event 1 件を加えた計 4 ファイルが `A` である。

### 4.2 上流入力への追補 1 件

**台帳は 4 クラスではなく 5 クラスである。** Developer scan §3 は「All four ledger classes were resynced in-band」として `.coverage-registry.json` / `.coverage-patch-allowlist.json` / `.coverage-ratchet.json` / no-silent-drop `approval.json` を挙げるが、**TLA の `amadeus/spaces/default/specs/tla/model-map.json`（+3 −3、impl ハッシュピン 3 行）と `specs/tla-evidence/fb1029e4….json`（+1）も同一区間で resync されている**（§1.4 / §2.4）。この 2 面は `amadeus/spaces/` 配下にあるため、#2415 の除外述語で誤除外されやすい面でもある。

### 4.3 再実行していない項目（出典を Developer scan と明記して転記）

- `git fetch` を伴う `origin/main` との真の drift 判定（本 synthesis は read-only 制約によりローカルの remote-tracking ref との一致のみを確認）
- Developer scan §4c が引く `amadeus-stage-schema.ts:277-316` の全 Rule（本 synthesis は `consumes` 関連の行のみ逐語確認）
- gateway の `:8-9` header comment の redaction テンプレート実装（本 synthesis は `readiness` 本体 `:799-830` のみ逐語確認）

### 4.4 申し送り

- **1 intent に 2 Issue を載せる構成の制約（最重要）。** `cid:code-generation:oq-singleton` により degrade スコープでは pr-convergence の Delivery Bolt authority が construction 配下の unit ディレクトリを**ちょうど 1 つ**であることを要求する。本 intent は `self-feature` なので units-generation / delivery-planning が EXECUTE され、`cid:code-generation:multiunit-pr-procedure` の per-unit PR 定型に乗る見込みだが、**Unit 分割時に 1 Issue = 1 Unit（`cid:units-generation:c1`）を守ること**。
- **walking-skeleton gate が有効である。** `memory/project.md` の Mandated 逐語「active scope が `self-feature` なら、既存コードを変更する場合も最初の Construction Bolt に walking-skeleton gate を維持する」。前 intent（`self-fix`）とはこの点で扱いが異なる。
- **focus 2 件の write scope は交差しない見込みだが未確定。** 現時点で同定した患部は #2415 が `stages/inception/reverse-engineering.md` + `templates/re-artifacts.md`、#3181 が `stages/inception/requirements-analysis.md` + artifact 語彙面（`amadeus-graph.ts` / `amadeus-orchestrate.ts` / `docs/reference/16-artifact-vocabulary.md`）+ gateway である。**ただしこれは患部集合の観測であって実装が触る面の確定ではない** — 是正方式が未決である以上、交差有無は design 以降の裁定に依存する。
- **stage 契約の frontmatter を変えると runtime graph の再 compile が門番になる。** `bun amadeus-graph.ts artifacts` と `/amadeus --doctor` の参照検査が正本の手順（`docs/reference/16-artifact-vocabulary.md:212-226`）。`consumes` を増やす場合は **producing stage の宣言**が graph 不変量として必須（`amadeus-graph.ts:1192-1198`）。
- **`upstream-coverage` の二重同期。** consume を 1 件増やすと (a) `requirements.md` の散文が新 artifact を参照する義務、(b) RA 契約 `:185` の括弧書き自体の同期、の 2 つが同時に必要になる。
- **新規テストファイルを追加する場合は registry regen 同梱が必須**（`cid:build-and-test:c1`、`bun tests/gen-coverage-registry.ts`）。本区間でも新規 2 スイートに対し `tests/.coverage-registry.json` が +23 −6 で同期されている。
- **`packages/framework/core/` を触る場合は全ハーネス build と再現性検査**（`cid:build-and-test:bt-dist-regen-seven-harnesses`、`cid:code-generation:c5-regen-needs-build`）。ただし focus 2 件の主要患部は `amadeus-common/stages/` の散文であり、`amadeus-orchestrate.ts` を触らない方式であれば model-map / allowlist の resync は発火しない（§2.4 の対応表）。
- **docs を触る場合の paths-ignore 盲点**（`cid:build-and-test:ci-paths-ignore-doc-guard-blindspot`）。`docs/reference/16-artifact-vocabulary.md` は doc を消費するテストの射程にあるため、doc-only 変更でも latent 赤を作りうる。
- **inception ステージの questions ファイルは depth の上限に収める**（`cid:code-generation:c1-question-budget-corpus`）。本 intent の depth は **Standard**。record を Bolt PR へ同梱した瞬間に `tests/integration/t517-question-budget-sensor.integration.test.ts` の corpus sweep が blocking で発火する。
- **効果測定の設計に注意が要る。** focus 2 件はいずれも「1 intent では効果が測りにくい」性質を持つ（#2415 はスキャン対象量、#3181 は上流参照の検証可能性）。受け入れ基準は**配送先の実ツリーに対する述語**で書くこと（`cid:requirements-analysis:c2-acceptance-at-delivery-tree`）。ソース断面だけの green は、変換器を持たない配送路の退行を構造的に隠す。
- **未決事項**（本スキャンでは決めていない、`memory/team.md` P1 の裁定事項）: focus 2 件の是正方式すべて。特に #2415 は「除外規則の置き場」（Step 2 入力列挙 / Preflight / Developer テンプレート）と「述語の粒度」（`amadeus/spaces/**` の前方一致では TLA ビルド台帳を巻き添えにする — §1.4）の分岐、#3181 は「どの stage が Issue 証跡を produce するか」（consume だけの artifact は hard error）と「gateway の再利用形」（3 つ目の adapter か否か）の分岐が主要な争点である。

## 5. Verification

- git 状態変更（commit / branch / checkout / stash / merge / fetch）: **ゼロ**
- GitHub 書込・読取: **ゼロ**（本 synthesis では `gh` を一切実行していない）
- engine / state ツール実行（`amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-log.ts` / `amadeus-bolt.ts`）: **ゼロ**（`amadeus-utility.ts codekb-path` の read-only 実行のみ）
- `bun run build` / フルスイート / coverage / TLC: **すべて未実行**（本スキャンは読取専用。`bun -e` による metrics JSON の読取のみ実行）
- 書き込み範囲: `amadeus/spaces/default/codekb/amadeus/` 配下のみ（本体 **7 面**への追記 + `reverse-engineering-timestamp.md` + 本ファイル）。**`technology-stack.md` は無変更**（区間で外部依存・ランタイム・リンター・型検査・テストランナーのいずれも動いておらず、書き足す実測が存在しないため）
- 検索述語の健全性（`cid:reverse-engineering:c6-absence-predicate-exit-code` / `c6-ugrep-word-boundary`）: 本 synthesis の grep はすべて `git grep` または `grep -c` を使い、**ERE の `\b` を使わない**。不在主張に使った述語（§3.1 の 5 選択肢選言）は **exit 1**（エラーなく不一致）を実測して確認しており、`ugrep` の complexity limit に該当する長さではない。空出力を 0 hit と読んだ箇所（`packages/framework/harness/` / `.github/` / `package.json` 系 / `amadeus-common/` の空 diff）はいずれも **exit 0** を実測した
- 数値の出所（`cid:requirements-analysis:numbers-from-command-output-only`）: 本記録の全件数・実測値は §1〜§2 に併記した述語の出力からの転記であり、測定 ref は断りのない限り observed `23d4ae767`。派生値（61.76% / 71.5% / 約 94.0%）はすべて算出式を併記した
