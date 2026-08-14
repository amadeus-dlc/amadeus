# re-scan 記録 — 260814-fmc-macos-provider

## メタデータ

| 項目 | 値 |
|---|---|
| Date | `2026-08-14` |
| Intent | `260814-fmc-macos-provider`（scope `self-fix`、depth `Minimal`、Brownfield、単一 repo `amadeus`） |
| Base commit | `89532174c30ef9cc7ff29496cd6916586fdda00a` |
| Observed commit | `5f6b5bf97068f59dee53dcd4a2f6564967c3d164` |
| Focus | [Issue #2361](https://github.com/amadeus-dlc/amadeus/issues/2361)（ミラー [#2995](https://github.com/amadeus-dlc/amadeus/issues/2995)）— formal-model-check の macOS 既定 provider 不通 + JDK ピンの脆弱性 |
| Scan mode | **xrev differential scan**（run `xrev-260814-2361`） |
| 書込範囲 | `codekb/amadeus/` 配下のみ（コード・テスト・state・audit の変更ゼロ、git 状態変更・build・engine/state ツール実行ゼロ） |

### base 選定根拠

`reverse-engineering-timestamp.md` と `re-scans/*.md` が記録する全 observed のうち、**HEAD の祖先で距離最小**のものを選んだ（`cid:reverse-engineering:rescan-base-ancestry`）。

- `git merge-base --is-ancestor 89532174c HEAD` → **exit 0**（祖先であることの実測）
- `git rev-list --count 89532174c..HEAD` → **9**（距離。全 observed 中の最小）

### observed 選定根拠

`git rev-parse HEAD` = `5f6b5bf97068f59dee53dcd4a2f6564967c3d164`。本 worktree HEAD は `origin/main` と一致する系譜上のコミットであり、ローカル merge コミットではない（`cid:reverse-engineering:c2-observed-mainline-commit`）。

### scan mode と currency の判定根拠

Issue #2361 のクロスレビューは 2 名とも **CONFIRMED_WITH_REFINEMENTS** で成立しており、verdict を Developer scan の一次入力とする xrev differential scan を採った（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）。target-sha は `52f1f1b2575ea35bd23b761697b2d17a5e9a7ac3`。

- **currency 成立**: `52f1f1b25..HEAD` の変更は `amadeus/spaces/default/elections/` 配下 1 件のみで、verdict の被引用パス集合との**交差はゼロ**。行番号の再解決は構造的 no-op（`cid:reverse-engineering:E-XBB-RE-S13-c2`）。
- **表現形式の移行検査**（`cid:reverse-engineering:c5-xrev-currency-schema-migration`）: review 断面以後に患部のスキーマ・セレクタ形式を変える移行 PR は着地していない。c5 の構造的不成立条件には該当しない。
- ただし verdict を一次入力にしたうえで、**全主張を observed 断面の verbatim 実読で二重化**した。その結果 xrev の 6 事実のうち **2 件を訂正**している（後述）。

### focus 領域の差分

`git diff --name-only 89532174c..HEAD -- plugins/formal-model-check tests/unit/t-formal-verif-tlc-spawn-planner.test.ts mise.toml` は**空出力**（exit 0）。患部は base..observed で無変更である。

## 述語一覧（再実行可能、測定 ref = `5f6b5bf97`）

すべて `git grep`（tracked files のみ）、cwd = repo root。exit code は各実行で個別採取した（0 = 一致あり、1 = 一致なし）。

**共通除外**: `':!amadeus/spaces'`（intent record / codekb — 一次コードではない）、`':!tests/fixtures'`（PR 本文を収めた GraphQL 固定データで、コード引用が偶然一致する）。

| ID | 検索述語 | 対象集合 | 件数 | exit |
|---|---|---|---|---|
| A | `git grep -n "FIXED_JDK_RUN_PROFILE" -- . ':!amadeus/spaces'` | 全 tracked | 38 行 / 13 ファイル | 0 |
| B | `git grep -n "26\.0\.1" -- . ':!amadeus/spaces'` | 全 tracked | 47 行 / 21 ファイル | 0 |
| C | `git grep -ni "temurin" -- . ':!amadeus/spaces'` | 全 tracked | 12 行 / 8 ファイル | 0 |
| D | `git grep -n 'provider === "auto"' -- . ':!amadeus/spaces' ':!tests/fixtures'` | 全 tracked | **2 行**（`tlc-spawn-planner.ts:68`, `:526`） | 0 |
| E | `git grep -n "selectTlcSpawnPlanner" -- . ':!amadeus/spaces' ':!tests/fixtures'` | 全 tracked | 11 行 / 5 ファイル（定義 1 + import 4 + 呼出 6） | 0 |
| F | `git grep -n "createNotRunPlannerReceipt" -- . ':!amadeus/spaces' ':!tests/fixtures'` | 全 tracked | 9 行 / 3 ファイル | 0 |
| G | `git grep -n "ModelCheckProvider" -- . ':!amadeus/spaces' ':!tests/fixtures'` | 全 tracked | 6 行 / 2 ファイル | 0 |
| H | `git grep -n 'openjdk version' -- . ':!amadeus/spaces' ':!tests/fixtures'` | 全 tracked | 9 行 / 6 ファイル | 0 |
| I | `git grep -n "ENVIRONMENT_UNAVAILABLE" -- . ':!amadeus/spaces' ':!tests/fixtures'` | 全 tracked | 16 行 / 5 ファイル | 0 |
| J | `git grep -n -- "--provider" -- . ':!amadeus/spaces' ':!tests/fixtures'` | 全 tracked | 12 行 / 8 ファイル（うち 3 行は pi harness の無関係な `--provider-id`） | 0 |
| K | `git grep -n "snapshotEnvironment" -- . ':!amadeus/spaces' ':!tests/fixtures'` | 全 tracked | 9 行 / 5 ファイル | 0 |
| L | `git grep -niE "\bJDK\b\|\bJava\b\|\bDocker\b" -- docs` | `docs/**` | **0 行** | **1** |
| M | `git grep -niE "sandbox-exec\|JAVA_HOME\|temurin" -- docs` | `docs/**` | **0 行** | **1** |
| N | `git grep -niE "provider\|jdk\|java\|sandbox\|docker" -- plugins/formal-model-check/stages plugins/formal-model-check/sensors` | plugin md | 1 行（`stages/formal-model-check.md:45`） | 0 |
| O | `git ls-files plugins/formal-model-check \| grep -iE "\.md$"` | plugin md | 4 ファイル（README.md / sensors/amadeus-model-completeness.md / stages/formal-model-check.md / stages/tla-authoring.md。**`.ja.md` 対訳なし**） | 0 |
| P | `git ls-files \| grep "tlc-spawn-planner"` | 全 tracked | 2 ファイル（正本 + unit test。**dist 投影・複製なし**） | 0 |

**L / M が exit 1（不在）である点が重要**: `docs/` 配下に JDK / provider / sandbox-exec の記述は一切存在しないため、文書の同期対象は `plugins/formal-model-check/README.md` と `mise.toml`(と必要なら `stages/formal-model-check.md:45`)に閉じる。`docs/` の formal-model-check 言及 39 行（`git grep -c "formal-model-check" -- docs`、8 ファイル）は plugin 機構と model supply の話で、toolchain 契約に触れない。

### base..observed の非 focus 差分（測定 ref 併記）

`git rev-list --count 89532174c..HEAD` = 9 commits。

| 主題 | commit | 規模（`git diff --numstat`／`git show --numstat`） |
|---|---|---|
| Lifecycle Guard Runtime 導入（#2986） | `0fbbec42b` | `amadeus-lifecycle-guard.ts` 新設（236 行、`wc -l`）+ `amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-directive.ts` 改修、`docs/reference/26-lifecycle-guard-runtime.md` +222 / `.ja.md` +214 |
| team-up 撤去（#2975） | `8b6089275` | `core/tools/team-up.sh` / `team-up-codex-safety-wait.ts` / `team-msg.sh` 削除、`tests/e2e` −869（222+204+443）、`docs/guide/20-team-mode{,.ja}` −77/−96 ほか |
| advisory run-now の handoff 経路修正（#2980） | `86feb2ee5` | `core/tools/amadeus-advisory-choice.ts` ほか |
| docs/norms（#2990, #2992） | `52f1f1b25`, `5f6b5bf97` | `amadeus/spaces` 配下のみ |
| metrics snapshot / record checkpoint | `689b2d288`, `97a57fe09`, `7f1363938`, `490e71cf1` | `metrics/*.json` 3 件 + record |

免除台帳の縮小（`git diff --numstat 89532174c..HEAD`）: `tests/.coverage-patch-allowlist.json` **−22 行 / 追加 0**（observed のエントリ数 **430**）、`tests/.test-time-factor-allowlist.json` **−12 行 / 追加 0**。いずれも対象コード消滅に伴う縮小で、免除の追加はない。

## 患部機構の要約（observed 断面の実読）

### 1. `auto` 分岐は 2 箇所のみ、いずれも同期

`plugins/formal-model-check/tools/tlc-spawn-planner.ts:520-539`:

```ts
export function selectTlcSpawnPlanner(
  provider: ModelCheckProvider,
  config: DockerPlannerConfig,
  environment: PlannerEnvironmentPort,
  platform: NodeJS.Platform = process.platform,
): Result<TlcSpawnPlanner, TlcToolchainError> {
  const selected = provider === "auto"
    ? (platform === "darwin" ? "sandbox-exec" : "docker")
    : provider;
```

**関数は同期**（`Promise` を返さない）。可用性判定（JDK 検出・`sandbox-exec` バイナリ・docker CLI）は一切なく、返すのはコンストラクタ呼び出しのみ（`:533` / `:537`）。

もう 1 箇所は `createNotRunPlannerReceipt`（`:62-75`）内の `:68`:

```ts
const docker = provider === "docker" || (provider === "auto" && platform !== "darwin");
```

述語 D のとおり `provider === "auto"` の出現は repo 全体でこの 2 行のみ。**片方だけ変えると、フォールバックで Docker が走ったのに receipt が `DARWIN_INSPECTION_PLAN` を名乗る不整合が出る**。

呼出元（3 件、production 2 件）:

| 位置 | provider 実引数 | platform 実引数 |
|---|---|---|
| `run-model-check-execution.ts:225-234` | `input.provider`（CLI 由来、既定 `auto`） | `dependencies.platform`（DI。既定 `run-model-check.ts:98`） |
| `tla-referee-toolchain.ts:224-228` | リテラル `"auto"` | **省略**（既定 `process.platform`） |
| `tests/formal-verif/tla-referee-real-toolchain.test.ts:183-184` | リテラル `"auto"` | 省略 |

referee 経路は platform を注入していないため、フォールバック実装時のテスト seam が run-model-check 経路と非対称である。

### 2. JDK ピンは二重ではなく 6 面（xrev 事実3・4 への補正）

| # | 位置 | verbatim / 内容 | 種別 |
|---|---|---|---|
| A | `tlc-toolchain.ts:90-92` | `export const FIXED_JDK_RUN_PROFILE = deepFreeze({ vendor: "OpenJDK", version: "26.0.1",` | データ正本 |
| B | `tlc-toolchain.ts:754-756` | `input.vendor !== …vendor \|\| input.version !== …version` → `fail("JDK vendor or version differs from the fixed run profile")` | manifest 生成時の完全一致要求 |
| C | `tlc-toolchain.ts:709-710` | `readonly vendor: "OpenJDK";` / `readonly version: "26.0.1";` | **型レベルのリテラル固定**（`JdkDistributionManifest`。xrev 未把握） |
| D | `tlc-spawn-planner.ts:152` | `!/^openjdk version "26\.0\.1(?:"\|\+)/m.test(versionOutput)` | Darwin 実行時 probe（患部の直撃点） |
| E | `fs-tlc-toolchain.ts:1331` | 同一正規表現（`#verifyJavaVersion`） | distribution snapshot 経路（`:1237` / `:1270` / `:1404` から呼出） |
| F | `tlc-spawn-planner.ts:50` | `{ id: "jdk-snapshot", expected: "OpenJDK 26.0.1", … }` | env-receipt の expected 文字列 |

C を広げないと B の実行時比較も通らず、`fs-tlc-toolchain.ts:659-660` と `tests/unit/t401-directive-and-toolchain-rejections.test.ts:67-68` へ型が波及する。**D だけを緩めても E が残ればパッチ版不一致は依然 fail する。**

### 3. 可用性判定が走る段階（フォールバック挿入点の構造）

```text
run-model-check-execution.ts:225  selectTlcSpawnPlanner   ← 同期・可用性検査ゼロ
   ↓ planner.value
run-model-check-execution.ts:238  toolchain.preparePlanned({…, planner})
   ↓
fs-tlc-toolchain.ts:1831          await input.planner.snapshotEnvironment({…})
   ↓
tlc-spawn-planner.ts:292          DarwinTlcSpawnPlanner.snapshotEnvironment
   ↓ try { await this.environment.inspectDarwin(context) }
tlc-spawn-planner.ts:131-191      NodePlannerEnvironmentPort.inspectDarwin
     :132  platform !== "darwin"                → throw
     :134  !JAVA_HOME                           → throw
     :150-166 JDK version regex 不一致          → throw（#2361 の実観測点）
     :167-168 !probe.available()（sandbox-exec）→ throw
     :177-179 network-deny probe 未 deny        → throw
   ↓ catch
tlc-spawn-planner.ts:316-321      → ENVIRONMENT_UNAVAILABLE
   ↓
fs-tlc-toolchain.ts:1838          if (!environmentSnapshot.ok) return environmentSnapshot;
```

Docker 側も対称: `DockerTlcSpawnPlanner.snapshotEnvironment`（`:415`）→ `inspectDocker`（`:193`）→ `NodeDockerCommandPort.inspectImage`（`:246-265`）。`absoluteCommand("docker")`（`:113-124`）と `docker image inspect`（`:261`）のみで、**デーモン起動の独立検査は存在しない**。

`:1838` が即 return するため、**現状フォールバックを差し込める唯一の自然な合流点は `snapshotEnvironment` 失敗の直後**である。env-receipt スキーマ（`amadeus.env-receipt.v1`、`run-model-check-domain.ts:93-98`）は provider 中立なので schema 変更は不要。`DARWIN_INSPECTION_PLAN`（`:46-52`）と `DOCKER_INSPECTION_PLAN`（`:54-60`）は同じ 5 つの `EnvInspectionId`（`run-model-check-domain.ts:71-76`）を持つ平行構造で、not-applicable 理由だけが異なる。

### 4. xrev 事実5 の訂正 — 矛盾は「実装 vs 文書」ではなく文書内部

`plugins/formal-model-check/README.md:60-62` は確かに `a JDK (Eclipse Temurin, major 26)` と書く。しかし同じ README の `:74-79` に別節がある:

```text
## Local execution requirements

The planner verifies the JDK by **exact patch version** — it accepts only
`openjdk version "26.0.1…"` from `$JAVA_HOME/bin/java`. That strictness is
deliberate: the model-check receipt is a reproducibility contract (NFR-1), and a
different JDK is a different toolchain identity.
```

同趣旨は `mise.toml:3-5` にもある。したがって **矛盾は `:60-62` 対 `:74-79` という文書内部のもの**であり、しかも新しい節が patch 完全一致を意図的な契約として明文化している。「実装が文書契約に違反しているから bug」という論法は observed 断面では成立しない。

### 5. xrev 事実6 の訂正 — 既存テストは退行を検出しない

`tests/unit/t-formal-verif-tlc-spawn-planner.test.ts:178-192`:

```ts
  test("rejects Docker tags and selects auto provider by platform", () => {
    ...
    expect(selectTlcSpawnPlanner("auto", config, environment, "darwin").ok).toBe(true);
    expect(selectTlcSpawnPlanner("auto", config, environment, "linux").ok).toBe(true);
    expect(selectTlcSpawnPlanner("sandbox-exec", config, environment, "linux")).toMatchObject({
      ok: false,
      error: { code: "PROVIDER_PLATFORM" },
    });
  });
```

`:186-187` は **`.ok === true` しか検査していない**。どの planner クラスが返るかを assert していないため、auto/darwin が Docker planner を返すよう変えても**このテストは緑のまま通る**。したがって「修正時にテスト更新必須」は誤りで、正しくは「**現行テストは退行を検出しないので、フォールバックの意図を assert するテストを新設する必要がある**」。

同ファイルの 5 test のうち影響があるのは `:153`（`createNotRunPlannerReceipt` を `docker` / `sandbox-exec` でのみ検査。**`auto` を渡さないので `:68` を変えても検出しない**）と `:178` の 2 件。`:188` の `PROVIDER_PLATFORM`（明示 `sandbox-exec` × 非 darwin）は真に固定されており維持すべき契約である。

その他のピン:
- `tests/integration/t-formal-verif-run-model-check.integration.test.ts:263-272` — `OpenJDK 26.0.1 verification failed` を 3 箇所で `toContain`。**文言変更で赤**。
- `tests/integration/t-formal-verif-run-model-check-real.integration.test.ts:30-32` — `REAL_TLC_AVAILABLE = AMADEUS_RUN_REAL_TLC === "1" && process.platform === "darwin" && JAVA_HOME !== undefined`。実 JDK を要する唯一の面だが **CI 既定では skip**。
- `tests/unit/t-formal-verif-tlc-toolchain.test.ts:79-81,107,132,167` / `t401-directive-and-toolchain-rejections.test.ts:67-68` / `tests/formal-verif/support/tla-toolchain-harness.ts:183` — 値・型の転記。
- `tests/integration/t-formal-verif-tlc-runtime.integration.test.ts:186` / `t-formal-verif-node-toolchain-ports.integration.test.ts:113` — fake port が `openjdk version "26.0.1"` を返す（緩和方向なら緑のまま）。
- `tests/e2e/t-formal-verif-run-model-check.test.ts:65,120` — 明示 `--provider docker`。

### 6. coverage patch allowlist の指紋が患部を覆っている（未把握制約の発見）

`tests/.coverage-patch-allowlist.json:1469-1477`:

```json
"selector": {
  "function": "<module>",
  "fingerprint": "sha256:05d28d0a8b61d6c33dd0cd1386fdf459b759a9c7917d31e8615c7023a2b75c70",
  "anchorLines": 58,
  "targetLines": "1-58"
},
"reason": "NodePlannerEnvironmentPort.inspectDarwin runs the live sandbox-exec / JAVA_HOME / java probe on real Darwin — requires a real JDK, exercised only by the real-toolchain probe outside CI."
```

指紋は `sha256(lines.join("\n"))`（`tests/coverage-patch-gate.ts:323-325`）で、`resolveSemanticSelector`（`:430-455`）が `<module>` スコープ内をスライドさせて**ちょうど 1 箇所**一致することを要求する。

**照合実測**（Developer scan の測定を Architect が独立再実行して一致を確認）: `bun -e` で `tlc-spawn-planner.ts` を読み、`s = 1..N` の 58 行窓 sha256 を上記値と比較したところ、一致は `[128]` の **1 件のみ**。すなわち **anchor は 128 行目、免除範囲は 128-185 行**である。

128-185 は `NodePlannerEnvironmentPort` の constructor から `inspectDarwin` の戻り値構築までで、**JDK regex `:152` とエラーメッセージ `:161-165` を丸ごと含む**。患部を 1 行でも編集すると指紋が不一致となり、`coverage-patch-gate` が `source fingerprint for … resolved 0 times (expected exactly one)` で throw する。**免除エントリの指紋再計算を同一変更に含める必要がある**（`tests/.coverage-patch-allowlist.json` は codekb の 8 body artifact ではなくテスト面の同期対象）。

さらに、フォールバックを入れると当該範囲に CI で実行可能な分岐（Docker へ倒す判断）が入りうる。その場合は免除を**縮める**のが正しく、指紋を張り直して同じ範囲を温存すると新設分岐が無検査で免除下に入る（`cid:code-generation:c-measure-not-prose`）。

## requirements-analysis への申し送り

1. **JDK ピン緩和は仕様変更に当たる可能性が高い。** patch 完全一致は `README:74-79` と `mise.toml:3-5` が「reproducibility contract (NFR-1) ゆえに deliberate」と明示宣言した既存契約である。緩和は既決の設計判断の変更であり、bug fix（仕様への回復）ではない。`memory/team.md` のエスカレーション正準リスト (4) に照らして、`self-fix` スコープで扱えるかを明示的に裁定する必要がある。`README:60-62` の「major 26」表記は `:74-79` と矛盾する誤記であり、こちらの是正だけなら documentation 相当で閉じる。
2. **provider フォールバック側は bug としての性格が明確。** フォールバック不在を宣言した文書は存在せず（述語 N の該当記述は `stages/formal-model-check.md:45` の 1 行のみで、逐語 `letting it select the execution provider for the current environment` はむしろ環境適応を約束している）、`--provider auto` という CLI 既定の意味にも反する。
3. 修正 1 箇所につき連動する面: (a) `:526` と `:68` の同期（述語 D の 2 行）、(b) JDK ピン緩和なら A〜F の 6 面、(c) allowlist 指紋の再計算、(d) `README:60-62` / `:74-79` / `mise.toml:3-5`（`docs/` は述語 L/M が exit 1 のため対象外）。
4. **落ちる実証の所在**が検証設計の主要論点。patch 版緩和を実環境で実証できる唯一の面（`t-formal-verif-run-model-check-real.integration.test.ts`）は CI 既定で skip されるため、どこで赤を取るかは build-and-test で設計する必要がある。

## 未実測・推測として明示する項目

- **UNMEASURED-1**: base..observed 9 commits のうち、患部外（Lifecycle Guard Runtime / team-up 撤去 / advisory 修正）の変更内容は `git show --numstat` と主要ファイルの実読に留め、全行の実読は行っていない。
- **UNMEASURED-2**: 述語 A〜C（`FIXED_JDK_RUN_PROFILE` 38 行 / `26.0.1` 47 行 / temurin 12 行）のヒットのうち、テスト・文書側の各行が「修正で更新必須か」の個別判定は未実施。§5 に挙げた主要ピンを超える網羅判定は code-generation 段の所掌。
- **UNMEASURED-3**: フォールバック方式 3 択（`selectTlcSpawnPlanner` の async 化 / `preparePlanned` 内での再試行 / 安価な同期 probe の追加）の優劣は評価していない。実測から確定した事実は「同期 probe 案では JDK **バージョン**不一致を捕まえられず #2361 の実観測ケースを解決しない」ことのみ。

## 更新した成果物

`architecture.md` / `component-inventory.md` / `code-structure.md` / `api-documentation.md` / `business-overview.md` / `code-quality-assessment.md` / `reverse-engineering-timestamp.md` の 7 面、および本ファイル（新規）。`dependencies.md` と `technology-stack.md` は**レビュー済み無変更**（依存・スタックいずれも base..observed で不変）。

直前の現在節は本文保持のまま履歴へ降格した（`cid:reverse-engineering:c3-relabel`）。あわせて、`260813-lifecycle-guard-runtime` の 4 節（「Guard Runtime は存在しない」を現在時制で宣言）と `code-structure.md` の `260813-remove-team-up` 節（撤去済み 4 パスを現在時制で列挙）に **#2986 / #2975 着地前の断面である旨を見出しへ明記**した（`cid:reverse-engineering:c1`）。

## 適用範囲外（明示）

フォールバックの挿入方式、JDK ピン緩和の可否とその適用面、落ちる実証の取得先、既存テスト 2 件（`:153` / `:178`）の改訂方針 — いずれも requirements-analysis / application-design / build-and-test の所掌である。
