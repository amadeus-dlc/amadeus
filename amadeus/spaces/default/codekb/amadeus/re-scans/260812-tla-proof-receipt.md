# re-scan: 260812-tla-proof-receipt（Issue #2913、ミラー #2917）

**Date**: `2026-08-12`
**測定 ref**: observed = 本 worktree HEAD = `origin/main` 系譜 = `854692fd7a11b124236b0427fe3d59e2fe6bf785`（`cid:reverse-engineering:measurement-ref-in-artifacts` / `c2-observed-mainline-commit`）
**Base**: `ce3c3ccfdb3f93e619a081386a70c8185b84f1db`（`reverse-engineering-timestamp.md` + `re-scans/*.md` の全 observed のうち **HEAD の祖先で距離最小**。`git merge-base --is-ancestor ce3c3ccfd HEAD` = **exit 0**、`git rev-list --count ce3c3ccfd..HEAD` = **34**。次に近い祖先は 50 / 53 / 55 / 63 でいずれも遠い。`cid:reverse-engineering:rescan-base-ancestry`）
**Scope**: `self-fix`、Brownfield、単一 repo `amadeus`
**Focus**: [Issue #2913](https://github.com/amadeus-dlc/amadeus/issues/2913)（ミラー #2917、bug / P1 / S2-CRITICAL）— TLA+ の author-new した proof と model-map 登録が循環し、実 TLC を実行できない
**Scan mode**: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）— クロスレビュー 2 名成立済みの単発 Issue。両 verdict を Developer scan の一次入力とし、Architect が observed 断面の verbatim 実読で二重化。run `xrev-2913-20260812`、reviewer-1 / reviewer-2 とも **CONFIRMED_WITH_REFINEMENTS**、target-sha `3fc024e44ef5e38f2c71e64c36bbb5b6aa0e4c9a`
**副作用**: git 状態変更・GitHub 書込・`bun run build`・engine/state 操作は**すべてゼロ**。書き込みは codekb 配下のみ（Developer scan の probe スクリプトはセッション scratchpad = repo 外、`cid:requirements-analysis:scratch-script-discipline`）

---

## 検索述語（再実行可能・結果と同所に記録）

`cid:requirements-analysis:enumeration-completeness-review`（E-ASD-RES13 追補 — 述語をそのまま再実行できる形で結果と同所に置く）に従う。すべて worktree ルートで実行。

| ID | 述語 | 結果 |
|---|---|---|
| P0 | `git diff --name-only 3fc024e44ef5e38f2c71e64c36bbb5b6aa0e4c9a 854692fd7a11b124236b0427fe3d59e2fe6bf785 -- <被引用 15 パス>` | **空出力**（exit 0）→ 行番号再解決は構造的 no-op。区間全体は 87 files |
| P1 | `git diff --name-only ce3c3ccfdb3f93e619a081386a70c8185b84f1db 854692fd7a11b124236b0427fe3d59e2fe6bf785 -- plugins/formal-model-check tests/formal-verif` | plugin 内 **9 files**、うち**被引用は 0**。`tests/formal-verif/**` は**変更 0** |
| P2 | `grep -rn 'validateModelCheckReceipt\|validateVerifiedTlaModelReceipt\|createVerifiedTlaModelReceipt\|isVerifiedTlaModelReceipt' plugins tests packages scripts` | 生産 2 / 消費 2 / 判別 6 の内訳は §4 |
| P3 | `grep -rn 'loadVerifiedTlaSources\|selectVerifiedModel\|loadVerifiedTlaSourceInternal' plugins tests packages scripts` | loader 消費者 5 件、seam 無しは検証器 1 件のみ（§5 S1） |
| P4 | `grep -rln 'MODEL_RECEIPT\|validateModelCheckReceipt\|createVerifiedTlaModelReceipt\|createRefereeToolchain\|RefereeToolchainInternals' tests/` | **5 files**（§6） |
| P5 | `grep -rn 'formal-verif' tests/run-tests.ts tests/run-tests.sh .github/workflows/ci.yml` | runner 2 本は **0 hit**（exit 1）。`ci.yml` の 2 hit（`:748` `id: formal-verify` / `:777`）は無関係な step id |

被引用 15 パス（P0 の `--` 以降、逐語）: `plugins/formal-model-check/tools/{tla-model-receipt,tla-referee-toolchain,tla-model-loader-internal,tla-model-loader,fs-tlc-toolchain,tlc-toolchain,run-model-check-ci,run-model-check-diagnostic,run-model-check-source,run-skeleton-ci,tla-registration}.ts`、`tests/integration/{t447-tla-referees.integration.test.ts,t403-tla-loader-generalization.test.ts}`、`tests/formal-verif/support/tla-referee-real-toolchain-probe.ts`、`tests/run-tests.ts`。

**行番号引用の currency（実測の記録であり免除の主張ではない）**: レビュー target SHA `3fc024e44` ≠ observed `854692fd7` のため SHA 一致による免除は成立しない。代わりに測定区間を **`review..observed` に固定**して被引用パスとの交差が空であることを P0 で実測した（`cid:reverse-engineering:E-XBB-RE-S13-c2` — 禁じられるのは `base..observed` の touch 判定を根拠にすること、許されるのは `review..observed` の実 diff が被引用パスと交わらないことの実測）。加えて P1 により `base..observed` でも患部は無変更である。

---

## 1. 引用の currency 表（4 件の off-by-one を訂正）

すべて observed で直接読み取り verbatim 照合した。**実質的に陳腐化した引用は 1 件もない**。行ズレは起票・レビュー時の採番誤りであり、区間内の行シフトによるものではない（P0 / P1 が示すとおり患部は無変更）。訂正後の行番号が正本である。

| 起票・レビューの引用 | observed での状態 | verbatim |
|---|---|---|
| `fs-tlc-toolchain.ts:1640`（検証呼び出し）/ `:1642`（中断） | **DRIFT (−1)** → 正 `:1641` / `:1643` | `:1641` `const model = validateModelCheckReceipt(input.modelReceipt);` / `:1643` `toolchainAbort("PreparationError", "MODEL_RECEIPT", model.error.message);` |
| `tla-model-receipt.ts:143-`（検証器宣言） | **DRIFT (+1)** → 正 `:142` | `:142` `export function validateVerifiedTlaModelReceipt(`（`:143` は引数行） |
| `tla-model-receipt.ts:159 以降`（identity 比較） | **DRIFT (−2)** → 正 `:161-169` | `:161` `const { modelIdentity, ...identityInput } = input;` … `:169` `return reject("receipt differs from the selected verified model");`（`:159` は `if (!expected.ok) return expected;`） |
| `tla-model-loader-internal.ts:460-463`（seam コメント） | **DRIFT (+1)** → 正 `:461-462`（export は `:463`） | `// Internal/test-only seam. Production callers must use the no-argument wrapper` / `// in tla-model-loader.ts so runtime input cannot select a root or filesystem.` |
| `tla-referee-toolchain.ts:47` | EXACT | `return canonicalIdentity({ bytes: Buffer.from(bytes).toString("base64") }, domain).sha256;` |
| `tla-referee-toolchain.ts:158` | EXACT | `const receipt = createVerifiedTlaModelReceipt(described.value.source);` |
| `tla-model-receipt.ts:154` / `:156` / `:157` / `:158` | EXACT | `const loaded = loadVerifiedTlaSources();` / `const selected = selectVerifiedModel(loaded.value, input.modelName);` / `return reject(\`verified model is unavailable: ${input.modelName}\`);` / `const expected = createVerifiedTlaModelReceipt(selected.value);` |
| `tla-model-receipt.ts:184` / `:187` | EXACT | `export function validateModelCheckReceipt(` / `if (isVerifiedTlaModelReceipt(input)) return validateVerifiedTlaModelReceipt(input);` |
| `tla-model-loader-internal.ts:279` | EXACT | `return { ok: true, value: { source, identity: canonicalIdentity(source, domain).sha256 } };` |
| `fs-tlc-toolchain.ts:731` | EXACT | `if (canonicalIdentity(source, domain).sha256 !== expectedIdentity) {` |
| `tlc-toolchain.ts:647` | EXACT | `const model = validateModelCheckReceipt(input.modelReceipt);` |
| `tests/run-tests.ts:750-759` / `:754` / `:852` / `:909` | EXACT | `function levelFiles(level: Level, excludes: string[] = []): string[] {` / `.filter((f) => f.endsWith(".test.ts"))` / `const scopes = ["smoke", "unit", "integration", "e2e"] as const;`（`:852` と `:909` の 2 箇所） |
| `t447-tla-referees.integration.test.ts:568` / `:624` / `:635` | EXACT | `describe("the production referee toolchain adapter (CI-safe surface)", () => {` / `test("run() folds a broken mutant into a loud referee-toolchain error before any TLC work", async () => {` / `test("the adapter's version line names the pinned jar and the pinned JDK", () => {` |

Architect による独立再実読の対象は Developer scan が訂正した 4 件（`:1641` / `:1643` / `:142` / `:161-169` / `:461-462`）を含む上表全件。scan の訂正はすべて追認した。

---

## 2. 差分リフレッシュ `ce3c3ccfd..854692fd7`（34 commits / 734 files）

患部近傍の変更は plugin 内 9 files のみで、**被引用ファイルは 1 つも含まれない**:

`plugins/formal-model-check/{README.md, plugin.json}`、`sensors/amadeus-model-completeness.md`、`stages/{formal-model-check.md, tla-authoring.md}`、`tools/{advisory-model-check.ts, amadeus-formal-verif-model-map.ts, amadeus-sensor-model-completeness.ts, plugin-activation.ts}`。`tests/formal-verif/**` は変更ゼロ。

区間全体の集中先: `tests/integration`（135）、`tests/unit`（62）、`tests/e2e`（36）、`packages/framework/core/tools`（20）、`metrics`（19）。

---

## 3. 欠陥は 2 つあり独立している（D1 / D2）

### D1 — 検証器の model-map 結合

`validateVerifiedTlaModelReceipt`（`tla-model-receipt.ts:142`）は receipt を**登録済み model-map と照合する**設計で、基準値を loader から作る（`:154` / `:156` / `:158`）。referee は未登録のディスク上バイト列から receipt を作る（`tla-referee-toolchain.ts:158`）ため、`:157` `verified model is unavailable: <name>` で構造的に拒否される。

### D2 — identity エンコーディングの分裂

| サイト | `canonicalIdentity` への入力 | file:line |
|---|---|---|
| referee | **オブジェクト** `{ bytes: <base64> }` | `tla-referee-toolchain.ts:47` |
| loader | **デコード済み文字列** | `tla-model-loader-internal.ts:279` |
| toolchain バイト照合 | **デコード済み文字列** | `fs-tlc-toolchain.ts:731`（および `:677`） |

Developer scan の経験的確認（observed、登録済み `MirrorLifecycle.tla`、domain `amadeus.formal-verif.tla.module.v1`、probe は repo 外 scratchpad の `idprobe.ts`）:

```
referee-form {bytes:base64} = 06a737a6d15396217f44d9f7852628f345b257e246fdaf5f0b4170abf8f32719
loader-form  (string)       = 57ed76c6896a44a92f7a6db8048804fd17e5c5adbafd78eab6a7812faa0399d3
```

この 2 値は reviewer-1 が別 SHA で報告した値とバイト一致する（独立再現）。

**分裂が無検出で共存できる機序**: `createVerifiedTlaModelReceipt`（`:89-130`）は identity を再計算せず `source.moduleIdentity` / `source.cfgIdentity` / `source.auxIdentities` をコピーし（`:104-112`）、`identityInput` 全体を `:124-127` でハッシュする。形式を決めるのは receipt 構築器ではなく `VerifiedModelSource` の生産者である。

**登録済みモデルでも不一致になることは静的に決定できる**: 検証器は loader 由来のソースから `expected` を作り（`:158`）、`:161-169` で呼び出し元の `modelIdentity` と比較する。referee の `moduleBytesIdentity` / `cfgBytesIdentity` は object 形式、loader のそれは string 形式なので、2 つの `identityInput` はこれらのフィールドで異なり、正準ハッシュが異なり、`:169` で拒否される。**TLC 実行も登録も不要で決定できる**。

**D2 は D1 修正の前提条件（scan の新規発見 — 起票にも両レビューにも無い）**: `verifyPlannedModelSources` は `model.value.moduleBytesIdentity` を `readVerifiedSourceBytes` へ渡し（`fs-tlc-toolchain.ts:1645` / `:1651`、補助 `:1777`）、`model.value` は `tla-model-receipt.ts:177` `...expected.value` 由来 = loader 形式である。現在は loader 形式どうしの自己整合。D1 だけを直して自己完結 receipt 経路を通すと、referee 自身の object 形式が同じバイト照合（`:731` で文字列にデコードしてハッシュ）へ渡り、`MODEL_RECEIPT` の代わりに `SOURCE_IDENTITY` で落ちる — 失敗が 1 層下へ移動する。

---

## 4. 修正面の全数列挙（設計段はこの列挙を再導出せず参照する）

述語 P2。

### (a) `ModelCheckReceipt` 値の生産 — 本番 2 箇所

- `tla-referee-toolchain.ts:158` — referee、ディスク上バイト列から（患部）
- `run-model-check-source.ts:96` `const verified = createVerifiedTlaModelReceipt(source);` — loader 由来ソースから（`FormalElection` の frozen 分岐は直上 `:88-91`）

### (b) `validateModelCheckReceipt` の消費 — 2 箇所、両方が真に別物

- `fs-tlc-toolchain.ts:1641` — **準備段**（`verifyPlannedModelSources`、宣言 `:1635`）。`:1643` で `PreparationError` / `MODEL_RECEIPT` として中断。#2913 が現に発火する箇所
- `tlc-toolchain.ts:647` — **出力解析段**（`parseTlcOutput174`）。`GRAMMAR` `TLC output model receipt is invalid` で失敗。**run 完了後にしか到達しない**ため現状は未到達だが、同じ model-map 依存を持つ第 2 の実例。**片方だけを直すと失敗が準備段から出力解析段へ移動するだけ**

### (c) 併せて確認が要る判別サイト（6 箇所）

`fs-tlc-toolchain.ts:1578`（`verifiedAuxiliaryModulePaths`）、`:1607`（`snapshotModelReceipt`）、`:1657`（vocabulary 等価）、`tlc-toolchain.ts:253` / `:298` / `:598`（`hasModelOutputBinding` — `expectedModuleName` を `modelReceipt.modelName` に束縛）。

### (d) 登録経路の前提条件（`tla-registration.ts`）— 独立した 2 つのゲート

- `:130-133` `checkProof` が `PROOF_KEYS = ["tlcExploration","fallingProofs","vacuityProof","reductionEvidence","boundIdentity"]`（`:128`）の全件を要求し、欠けると `:132` `if (!present) failures.push({ kind: "precondition-missing", precondition: "proof" });`
- `:198-201` `parseEntryDraft` が `evidenceBundle.digest` に `sha256:<hex64>` を要求（`:199` `BUNDLE_DIGEST.test(bundle.digest)`）、`:319-320` が検証済み bundle の digest との一致を要求
- `:135-141` `checkReview` が著者と別の指名レビュアーによる `READY` verdict を要求

したがって登録は proof に先行できず、§3 により proof は登録済みモデルでも成功しない — これが循環の実体である。

---

## 5. 同根スイープ（述語 P3）

### S1 — 検証器だけが依存 seam を持たない

| 消費者 | seam | file:line |
|---|---|---|
| `run-model-check-ci.ts` | **あり**（`loadSources` / `selectModel`、既定値つき） | `:19-20` / `:28-29` |
| `run-model-check-diagnostic.ts` | **あり**（同形） | `:326-327` / `:333-334` |
| `run-model-check-source.ts` | **あり**（`loadVerifiedSources?` 任意依存、`:128` で `?? loadVerifiedTlaSources` 適用） | `:40` / `:128` |
| `run-skeleton-ci.ts` | なし（ただし検証器ではなく最上位 CI スクリプト） | `:66` / `:70` |
| **`tla-model-receipt.ts`** | **なし — 直接呼び出し** | **`:154` / `:156`** |

seam のパターンは兄弟に 3 例存在し、必要な 1 箇所にだけ無い（`cid:requirements-analysis:symmetric-pair-review` の形）。

### S2 — 内部 seam は「能力」ではなく「方針」で閉じている

`loadVerifiedTlaSourcesInternal(moduleUrl, fs)`（`:463-466`）は `findRepositoryRoot`（`:151-168`、`.git` と `package.json` の両方を持つ最初のディレクトリまで遡る）で root を解決し、`locateAssets`（`:225-250`）から model-map パスを導く。よって**この seam は root を選択できる** — `tests/integration/t403-tla-loader-generalization.test.ts:94-100` が合成ワークスペースから fixture モデル `Alpha` / `Beta` を読ませるために現にそうしている（`t481` / `t405` も同様）。選べないのは root から独立した任意の model-map パスのみ。

両レビュアーの結論（この seam を開けない）は変わらないが、`:461-462` は**方針上の禁止であって能力上の制約ではない**。設計段で明示しないと「簡単な修正」として再発見される。

### S3 — 同クラスの第 3 の非対称は存在しない

「ディスクから receipt を生成してレジストリと照合する」サイトは他に無い。`run-model-check-source.ts:96` は loader 由来ソースからの構築（非対称なし）、`tla-arm.ts:547` は将来を見据えたコメント（`// lands, this becomes loadVerifiedTlaSources() + selectVerifiedModel(sources,`）で live path ではない。

---

## 6. テストピンの棚卸し（述語 P4 — 5 files）

- `tests/integration/t-formal-verif-run-model-check-source.integration.test.ts` — 最も密なピン: `:56` frozen 名の拒否、`:250` キー並べ替えの受理、`:263` 改竄拒否、`:264` 余剰キー拒否、`:268` 型不正拒否、`:272` / `:282` 形状拒否。**union に新メンバを足す設計を最も強く制約する**（`exactPlainObject`（`tla-model-receipt.ts:69-75`）がキー集合の完全一致を要求し、検証器は `:145` でこれを呼ぶ）
- `tests/integration/t-formal-verif-planned-tlc-runtime.integration.test.ts` — `:378` が `error: { code: "MODEL_RECEIPT" }` をピン。`:346-404` は `MirrorLifecycle` を使った**モデル横断の差し替え**シナリオ。「本番のピンを緩めない」ための回帰フェンス
- `tests/integration/t-formal-verif-tlc-runtime.integration.test.ts:424` — `expect(errorCode(result)).toBe("MODEL_RECEIPT")`
- `tests/integration/t447-tla-referees.integration.test.ts:568-651` — describe `"the production referee toolchain adapter (CI-safe surface)"`。`createRefereeToolchain` を駆動するのは `:624`（未解決 `EXTENDS` の mutant → TLC 作業前に throw）と `:635`（バージョン行）の **2 件のみ**で、残りは `RefereeToolchainInternals.describeMutant` / `declaredInvariantsOf` / `traceStateVariablesOf` の純関数検査。**整形式のモデルを `preparePlanned` へ通すテストは存在しない** — 欠陥はこの盲点にちょうど収まっていた
- `tests/formal-verif/support/tla-referee-real-toolchain-probe.ts` — probe、CI 除外（§7）

---

## 7. CI 配線 — 除外は構造的で、除外リストは存在しない（述語 P5）

`tests/run-tests.ts` / `tests/run-tests.sh` の `formal-verif` 参照は **0 件**。

1. スコープ集合が固定 — `:852` と `:909` の `const scopes = ["smoke", "unit", "integration", "e2e"] as const;`。`levelFiles`（`:750-759`）は `readdirSync(join(SCRIPT_DIR, level))` で当該 4 ディレクトリ直下のみを見る。`tests/formal-verif/` はそのいずれでもなく、再帰もされない
2. 仮に見えても `:754` `.filter((f) => f.endsWith(".test.ts"))` で弾かれる（probe は `.ts`）

よって**修正すべき除外リストが存在しない**（`levelFiles` の `excludes` 引数は 4 階層内の個別ファイル除外用）。probe を CI へ載せるにはティアへの移設（`.test.ts` 化）か新スコープ追加が要る。probe のヘッダ `:5-7` は除外が意図的であることを明言する — `Same shape as tla-real-toolchain-probe.ts: a standalone probe, not a CI test.` / `It needs JAVA_HOME on the pinned OpenJDK and network access for the first` / `jar fetch, so the default suite never runs it.`。単純な移設は JDK 依存・ネットワーク依存のテストを既定スイートへ持ち込むため、トレードオフの裁定は後続ステージの所掌。

これは本 Issue 1 件より広い系統的盲点であり、`tests/formal-verif/**` 全体が既定 CI の射程外にある。

---

## 事実と仮説の分離

**観測事実**: §1 / §2 / §4 / §5 / §6 / §7 の全項目、および §3 の identity 実測値。すべて observed での直接読み取りまたはコマンド出力による。

**仮説（設計段で決着させるもの、事実として断定しない）**:

- **H1** — `tla-referee-toolchain.ts:47` を文字列形式へ変えれば D2 の解消として十分である。分裂の存在とバイト照合が文字列形式であることは確認したが、**修正後の経路を端から端まで走らせていない**ため、訂正後の receipt が検証を通ることは示していない。実 run による閉包が要る
- **H2** — D1 の解として union への第 3 メンバ追加が正しい形である。`exactPlainObject`（`:69-75`）と `isVerifiedTlaModelReceipt` の schema 判別（`:132-140`）から新 `schema` 値は機械的には可能だが、§4(c) の 6 判別サイトへの波及は**未測定**
- **H3** — vocabulary 等価検査（`fs-tlc-toolchain.ts:1657-1672`）は自己完結 receipt でも変更なく通る。`describeMutant` は語彙をハッシュ対象と同じバイト列から導く（`tla-referee-toolchain.ts:108-112`）ので自己整合のはずだが、これは推論であって測定ではない

**未測定（明示的に持ち越す 3 件）**:

1. いずれの経路でも実 TLC の完走は観測していない（失敗が TLC 到達前のため）
2. 修正下で登録済みモデルの回帰スイートが green を保つかは未確認
3. 重複 Issue 検索は未閉包（reviewer-2 も INCONCLUSIVE と記録、reviewer-1 も閉じていない）

---

## 適用範囲外（明示）

修正の設計・選定（D1 の解の形、D2 のエンコーディング統一の方向、probe の CI 配線可否とその形、`tests/formal-verif/**` 全体の扱い）は requirements-analysis / application-design の所掌。本 RE は裁定を証拠から下せる状態にすることのみを行った。
