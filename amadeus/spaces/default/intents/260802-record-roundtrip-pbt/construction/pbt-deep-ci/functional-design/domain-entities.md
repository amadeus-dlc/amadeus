# Domain Entities — unit `pbt-deep-ci` (#1980)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: **worktree HEAD `c8702be09d74daa8091d99d3eae48987b9fd7527`**(`.github/workflows/`・`tests/fixtures/formal-verif-ci-baseline.sha256`・`tests/formal-verif/support/ci-workflow-contract.ts` は application-design の測定 ref `5a6f79727` から差分ゼロ)。

---

## 0. この unit が扱わない型(境界の明示)

本 unit は **`ElectionFile` / `Election` / `StoreError` / receipts / `.unchecked-cast-allowlist.json` のいずれにも触れない**。

- `ElectionFile` と `parseElectionFile` の所有は decisions.md ADR-4 と component-methods.md の U1 節(`amadeus-election-store.ts` 内 private)にあり、本 unit は読みも書きもしない。
- 無検査キャスト allowlist(`(file, kind)` 単位のカウント台帳、`Record<file, Record<kind, count>>`)の所有は decisions.md ADR-2 (b) と components.md U4(cast-guard unit)にある。本 unit は cast-guard に**順序依存する**が、台帳スキーマには触れない — 依存の実体は `.github/workflows/ci.yml` と baseline fixture という**共有資源の直列化**であって型の共有ではない(unit-of-work-dependency.md「共有資源による直列化」)。
- component-methods.md に U5 節が存在しないことが、本 unit に新設のドメイン型・関数シグネチャが無いことの裏づけである(business-logic-model.md §1)。

したがって本書が扱うのは **CI 設定という外部スキーマ**と、**既存の検査系が読み書きするデータ形**である。`cid:functional-design:cross-unit-type-verbatim-check` に従い、他 unit・既存コードが所有する型はすべて正本側の実文を逐語引用して照合する。

---

## 1. E-1: ワークフロー・ジョブ(`WorkflowJob`)

### 所有と正本

GitHub Actions のワークフロー YAML が外部スキーマの正本だが、**本リポジトリで実際に検査される部分集合**は `tests/formal-verif/support/ci-workflow-contract.ts` の型宣言が定める。逐語(`:16-23`):

```ts
interface WorkflowJob {
  readonly if?: string;
  readonly needs?: string | readonly string[];
  readonly "runs-on"?: string;
  readonly "timeout-minutes"?: number;
  readonly permissions?: Readonly<Record<string, string>>;
  readonly steps?: readonly WorkflowStep[];
}
```

同ファイル `:7-14` の `WorkflowStep`:

```ts
interface WorkflowStep {
  readonly id?: string;
  readonly uses?: string;
  readonly if?: string;
  readonly "continue-on-error"?: boolean;
  readonly with?: Readonly<Record<string, unknown>>;
  readonly run?: string;
}
```

および `:25-28` の `Workflow`(`on` と `jobs` のみ)。**これらは `interface` 宣言であって `export` されていない**(`export` されているのは `U4_DISPATCH_LINE` `:30` / `U4_EMPTY_BASE_BRANCH` `:31` / `normalizedCiBaseline` `:38` / `inspectCiWorkflow` `:125`)。したがって本 unit のジョブ定義はこの型を import して検査されるのではなく、**同ファイル内の `inspectCiWorkflow` が `Bun.YAML.parse(source) as Workflow` で解釈した結果として**間接的に検査される。

### 本 unit が実体化するインスタンス

| フィールド | 値 | 由来 |
| --- | --- | --- |
| ジョブ id | `pbt-deep` | services.md S2 ジョブ契約表 |
| `if` | `github.event_name == 'workflow_dispatch'` | BR-PDC-1 |
| `needs` | **不在** | BR-PDC-18 |
| `runs-on` | `ubuntu-latest` | 既存全ジョブと同値 |
| `timeout-minutes` | 実測から導出(算出根拠をコメント併記) | BR-PDC-8 |
| `permissions` | `contents: read` | BR-PDC-17 |
| `steps` | checkout / setup-bun / install / パス実在検査 / 深掘り実行 / ファイル数照合 / 失敗サマリ | business-logic-model.md §3.2 |

### 不変量

`jobs["ci-success"].needs` に `pbt-deep` を**含めない**(BR-PDC-3)。この不変量は本 unit の型ではなく **`ci-success` ジョブ側のインスタンス**に属するが、本 unit の変更が唯一それを壊しうるため、ここに記す。

---

## 2. E-2: baseline fixture(`formal-verif-ci-baseline.sha256`)

### スキーマ(実測)

`tests/fixtures/formal-verif-ci-baseline.sha256` は **1 行・2 フィールド**のテキストファイル。HEAD 実文:

```
80b0b5e9a9803e7dfe834b65bb6e9738c39e62700f2f13a3dfed1ad5824995cf  .github/workflows/ci.yml
```

読み側の実文(`tests/integration/t-formal-verif-ci-workflow.integration.test.ts:9-12`):

```ts
const BASELINE_SHA = readFileSync(
  "tests/fixtures/formal-verif-ci-baseline.sha256",
  "utf8",
).trim().split(/\s+/)[0]!;
```

### 正規化と検証の所有

**正規化の所有は `normalizedCiBaseline`(`ci-workflow-contract.ts:38-46`)にある。** 逐語:

```ts
export function normalizedCiBaseline(source: string): string {
  const withoutJob = source.replace(
    /\n {2}# U4 formal-model-check begin\n[\s\S]*?\n {2}# U4 formal-model-check end\n/,
    "",
  );
  return withoutJob
    .replace(U4_DISPATCH_LINE, "")
    .replace(U4_EMPTY_BASE_BRANCH, "");
}
```

**照合の所有は `inspectCiWorkflow`(`:125-151`)にある。** 逐語(`:137-141`):

```ts
  const actualBaseline = createHash("sha256")
    .update(normalizedCiBaseline(source))
    .digest("hex");
  if (actualBaseline !== expectedBaselineSha256) {
    findings.push("changes outside the three permitted U4 edits");
  }
```

### 本 unit にとって決定的な性質

正規化が strip する3領域は **U4 固有**である:

| 領域 | 実体 | 本 unit のジョブに一致するか |
| --- | --- | --- |
| formal ジョブブロック | 正規表現 `\n {2}# U4 formal-model-check begin\n[\s\S]*?\n {2}# U4 formal-model-check end\n`(`:40`) | **しない** — マーカー文言が `U4 formal-model-check` 固定 |
| workflow_dispatch 行 | `U4_DISPATCH_LINE = "  workflow_dispatch: {}\n"`(`:30`) | しない(本 unit は `on:` を変更しない — BR-PDC-2) |
| empty-base ブランチ | `U4_EMPTY_BASE_BRANCH`(`:31-36`、`changes` ジョブ内の `if [[ -z "${BASE_SHA}" ]]` ブロック) | しない |

したがって **`pbt-deep` ジョブの追加分はそのまま baseline ハッシュに含まれ、fixture の更新が必須になる**(BR-PDC-14)。business-rules.md BR-PDC-19 が「ブロックマーカーは strip 対象ではない」と明記するのはこの機序による。ADR-3 Consequences が「実装段の必須手順」として再 baseline を挙げている根拠でもある。

### 再 baseline の値の作り方

`sha256(normalizedCiBaseline(readFileSync(".github/workflows/ci.yml", "utf8")))` を計算し、既存の行形式(`<64桁 hex>` + 空白2 + `.github/workflows/ci.yml`)で書き戻す。**値は計算コマンドの出力からの転記のみとし、手で組まない**(`cid:requirements-analysis:numbers-from-command-output-only` / `cid:requirements-analysis:sha-no-manual-expansion`)。

---

## 3. E-3: 再 baseline 記録エントリ

### スキーマ(実測 — 構造化されていない散文コメント)

`tests/integration/t-formal-verif-ci-workflow.integration.test.ts:14-32` のヘッダコメント。逐語(`:14-18`):

```
// The baseline SHA pins ci.yml OUTSIDE the three regions normalizedCiBaseline
// strips (the formal job block, the workflow_dispatch line, the empty-base
// branch), so every sanctioned edit elsewhere in the file re-baselines the
// fixture. Recorded re-baselines:
//   - 260725-mirror-review-fixes: the Mirror CI job (rebase integration);
```

エントリの形は `//   - <intent slug>[ <unit>][ (#<issue>)]: <何を追加したか>[。なぜそこか]` で、継続行は `//     ` でインデントする。物理エントリは 4 件(`:18` / `:19-22` / `:23-27` / `:28-32`)。

**このエントリは機械 parse されない** — テストコードのどこからも読まれない純粋な人間向け記録である(`grep -n "Recorded re-baselines" tests/` は当該1行のみ)。したがって検証は「エントリが1件増えたこと」の目視/レビューであり、書式の逸脱はテストでは捕捉されない。BR-PDC-15 がレビュー観点として明示する理由である。

### 本 unit が追加するエントリの内容要件

先行4件はいずれも **(a) 何を追加したか (b) なぜそのジョブ/位置に置いたか** の2点を書く。例(`:28-32`、260801-open-bug-batch-5): `the drift-check job's compiled-graph drift step (…). Placed in drift-check because it IS a drift guard, and because reusing that job leaves ci-success's needs set — and t222's pin on it — untouched.` 本 unit のエントリも同じ2点を満たす — (a) `workflow_dispatch` 限定の `pbt-deep` ジョブ、(b) ADR-3 の裁定(既存 ci.yml が同型の先例を内包しており `cid:ci-pipeline:c2` の二重生成を避けるため)。

---

## 4. E-4: 深掘りフラグ `AMADEUS_PBT_DEEP`

### 値域と所有

**所有はテスト側の実装**にある。本 unit は**設定する側**であり、判定式を持たない。判定の正本(`tests/unit/t204-audit-escape.pbt.test.ts:39`、逐語):

```ts
const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";
```

| 値 | 意味 |
| --- | --- |
| `"1"` | 深掘り |
| `"true"` | 深掘り |
| 上記以外(未設定・空文字・`"0"` 等) | 既定(PR CI 予算) |

予算の写像(同ファイル `:41`、逐語):

```ts
const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };
```

同一の判定式が既存4ファイルに**逐語で複製**されている(`tests/unit/setup-semver.pbt.test.ts:42` / `setup-manifest.pbt.test.ts:30` / `setup-plan-decisions.test.ts:33` / `t204-audit-escape.pbt.test.ts:39` — 測定: `grep -rln "AMADEUS_PBT_DEEP" tests/ scripts/ packages/ .github/ package.json | wc -l` = **4**)。新規 PBT(election-readpath / state-pbt)も同じ式を持つことが FR-4c と components.md 再利用棚卸し `:97` の指定である。

**本 unit は `"1"` を設定する**(BR-PDC-7)。`"true"` も同値だが、services.md S2 の実行コマンド表記が `AMADEUS_PBT_DEEP=1` であるためそれに揃える。

### 非目標(tier との独立)

`AMADEUS_PBT_DEEP` は numRuns の切替のみで、テストの tier 所属を変えない(services.md「実行 tier との関係(重要な非目標)」)。新規 PBT は `tests/unit/` と `tests/integration/` に置かれたままで、`tests/run-tests.ts:117` の `--ci`(実文 `  --ci            smoke + unit + integration`)でも既定予算で走る。したがって `t257-ci-residency-marker-guard` が扱う「CI-resident 自称と実行 tier の乖離」は発生しない(business-logic-model.md INV-6)。

---

## 5. E-5: 対象テストパス集合(`TestPathSet`)

### 形

明示列挙された相対パスの列。要素は依存 unit の着地物と 1:1 で対応する:

| 供給元 unit | ファイル(components.md / unit-of-work.md による所在) |
| --- | --- |
| election-readpath | `tests/unit/` の election round-trip PBT(P-EL1)+ `tests/integration/` の fail-closed PBT(P-EL2 / P-EL3) |
| state-pbt | `tests/unit/` の state PBT(P-ST1〜P-ST4) |

**具体のファイル名は本 unit では確定しない** — components.md U2 節は所在を「`tests/unit/`(純関数層)+ `tests/integration/`(実 FS 経由)」と層で規定し、U3 節は `tests/unit/` と規定するにとどまり、ファイル名を固定していない。したがって列挙集合は**依存 unit の着地時点で確定**する(unit-of-work-dependency.md の batch 4 = 両者着地後)。本 unit の設計はその集合を受け取る形として書かれている。

### 正規化・検証の所有(本 unit が新設する部分)

この集合には**書式検証の主体が既存に無い**。bun test の引数として渡された不存在パスは**無音で除外され exit 0 になり得る**(`cid:build-and-test:test-path-set-completeness`)。よって本 unit がジョブ内に検証を置く:

| 検証 | 述語 | 失敗時 |
| --- | --- | --- |
| 事前(BR-PDC-5) | 列の全要素がファイルとして実在 | exit 非 0 |
| 事後(BR-PDC-6) | bun 出力の `Ran <N> tests across <M> files` の `M` == 列の要素数 | exit 非 0 |

事後照合が読む出力形は実測で確認済み(HEAD、`bun test tests/unit/t204-audit-escape.pbt.test.ts` の実出力): `Ran 2 tests across 1 file. [121.00ms]`。**単数形 `file` と複数形 `files` の両方が現れる**ため、抽出述語は数値部だけを取り、語尾に依存してはならない。

---

## 6. E-6: 実行ログ(`pbt-deep-run.log`)

| 項目 | 内容 |
| --- | --- |
| 生成 | 深掘り実行ステップの `2>&1 \| tee <log>`(BR-PDC-7) |
| 内容 | bun test の全出力(fast-check の失敗時出力を含む) |
| 消費 | (a) 事後のファイル数照合(E-5)、(b) 失敗時サマリの `tail`(BR-PDC-11) |
| 加工 | **しない**。seed / replay path / 縮小反例は fast-check の既定出力のまま素通しする(FR-5a / services.md S2) |
| 永続化 | アーティファクトとしてアップロードしない — ジョブログとステップサマリが証跡(business-rules.md「引用元との意図的相違」)。ワークフロー実行の保持期間に従う |

`tests/unit/t204-audit-escape.pbt.test.ts:21-22` 実文が、加工不要である根拠を明記している:

```
// 2. FAILURE OUTPUT. On failure fast-check prints the seed, replay path, and
//    the SHRUNK counterexample — enough to reproduce with no extra wiring.
```

`enough to reproduce with no extra wiring` — 追加配線なしで再現できる、が既存規約の主張であり、本 unit がログを parse して seed を再出力する必要は無い。

---

## 7. E-7: ジョブ終端状態

外部(GitHub Actions)が所有する enum。本 unit は値を定義せず、**どの原因がどの終端に写るか**だけを定める(business-logic-model.md §7):

| 終端 | 原因 |
| --- | --- |
| `skipped` | `push` / `pull_request` 起動(`if:` が false)。異常ではない |
| `success` | 対象集合が全数実行され、全 property が緑 |
| `failure` | F1 パス実在検査失敗 / F2 property が反例検出 / F3 ファイル数照合失敗 / F4 checkout・setup・install 失敗 |
| `cancelled` | 利用者による中断、または `timeout-minutes` 超過 |

**F2 のみがステップサマリへ本文を出す**(BR-PDC-10 の `steps.<id>.conclusion` 限定)。サマリの有無が「PBT が落ちたのか、環境が落ちたのか」の判別子になる。

---

## 8. エンティティ関係(ASCII)

```
  E-4 AMADEUS_PBT_DEEP="1"
        |  (env として渡す)
        v
  E-1 WorkflowJob "pbt-deep" ------ 実行 ------> E-5 TestPathSet
        |                                          |
        | (定義本文が入力)                          | (bun test の出力)
        v                                          v
  E-2 baseline fixture <-- sha256(normalized) --  E-6 run log
        |                                          |
        | (人間向け記録)                            | (tail をサマリへ)
        v                                          v
  E-3 再 baseline 記録エントリ                    E-7 ジョブ終端状態
```

`E-1 → E-2` の辺が本 unit 固有の落とし穴である: **ジョブ定義を書き換えるたびに fixture が陳腐化する**。したがって fixture の更新は ci.yml の最終形が確定した後(= cast-guard 着地後、business-logic-model.md INV-4)にただ一度行う。

---

## 9. 上流成果物の本文参照(consumes の依拠箇所)

| 上流成果物 | 本書での依拠箇所 |
| --- | --- |
| requirements.md | §4(FR-4c の既存規約準拠)、§5・§6(FR-5a の実行と seed 可視化)、§1(FR-5b の needs 非参加を不変量として記載) |
| unit-of-work.md | §5(供給元 unit の所在 = election-readpath / state-pbt の Unit 定義)、§0(本 unit の規模が CI のみであること) |
| unit-of-work-dependency.md | §0(cast-guard との依存が型でなく共有資源であること)、§8(batch 4 の位置づけと fixture 更新の時点) |
| components.md | §5(U2 / U3 の所在規定 = ファイル名未確定の根拠)、§4(再利用棚卸し `:97` の PBT 規約 canonical) |
| component-methods.md | §0(U5 節の不在 = 新設ドメイン型ゼロの裏づけ)、§0(U1 の `parseElectionFile` 所有が本 unit 外であること) |
| decisions.md | §0(ADR-4 の `parseElectionFile` 所有・ADR-2 (b) の allowlist 粒度所有)、§2(ADR-3 Consequences の再 baseline 必須手順)、§1(ADR-3 Decision のジョブ配置) |

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段4(手動深掘りによる浅い探索の見逃し回収と失敗 seed 再現)に対応する。
