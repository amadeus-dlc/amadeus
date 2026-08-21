# リバースエンジニアリング差分スキャン記録: 260821-fmc-retirement

## 0. メタデータ

| 項目 | 値 |
|---|---|
| Date | `2026-08-21`（UTC） |
| Intent | `260821-fmc-retirement` |
| Scope / depth / project type | `self-feature` / Standard / Brownfield |
| Repository | `amadeus`（単一 repo、root `/Users/j5ik2o/worktrees/j5ik2o.github.com/amadeus-dlc/amadeus/enhance-1`） |
| Base commit | `e86fbe125c85ddcbe7264f3a9a9a2377a06136da` |
| Observed commit | `6a0c3b9940163f1f2ab9e44bbd7f10970097befa`（= `origin/main`） |
| Distance | `65` commits |
| Scan mode | 通常の差分リフレッシュ + **退役消費者の全数 census**（xrev differential 不採用。理由は §1.2） |
| Focus | formal-model-check（以下 FMC）プラグインの完全退役 — 消費者の全数確定 |
| 実行形態 | 本記録は Developer scan として作成。**読取専用**（git 状態変更・record 書込・GitHub 書込・engine/state ツール実行はいずれもゼロ） |

### Base commit の選定根拠

`cid:reverse-engineering:c1`（「observed のうち HEAD の祖先で距離最小」）を `re-scans/` の直近 observed 群へ適用した。判定は本スキャンの実行。

| 候補 | 出典 re-scan | `git merge-base --is-ancestor <c> 6a0c3b994` | `git rev-list --count <c>..6a0c3b994` |
|---|---|---|---|
| **`e86fbe125c85ddcbe7264f3a9a9a2377a06136da`** | `260820-fmc-drift-batch` の observed | **exit 0** | **65**（最小 → 採用） |
| `c8c393bba927e4c00a8c6de9ef2da76068d04bfa` | `260818-issue-3029-sensor-gate` の observed | exit 0 | 162 |
| `127be70c5d7a584016f88a5d44e8715904020721` | `260818-priority-bug-batch-4` の observed | exit 0 | 163 |

### 差分規模

| 対象 | files | insertions | deletions | 取得コマンド |
|---|---|---|---|---|
| 全体 | 455 | +20,632 | −2,942 | `git diff --shortstat e86fbe125 6a0c3b994` |
| workflow exhaust 除外後 | 212 | +11,196 | −2,931 | 同上 + `':(exclude)amadeus/spaces/*/intents/**' ':(exclude)amadeus/spaces/*/elections/**' ':(exclude)amadeus/spaces/*/codekb/**' ':(exclude)amadeus/spaces/*/memory/**' ':(exclude)amadeus/spaces/*/metrics/**'` |

### 上流入力の consume 方法

focus は `<record>/ideation/intent-capture/intent-statement.md`、`ideation/scope-definition/scope-document.md`、`intent-backlog.md` から導出した（読取のみ）。上流が申告する数値（テスト 153 ファイル、tools 16,217 行、authoring 約 3,760 行）は**所与として消費せず、observed 断面で再測定**した。再測定の結果、153 は過小であること（§2.1）と authoring 行数が区間内に増加していること（§3.4）を確認している。

---

## 1. 検索述語の健全性と scan mode

### 1.1 述語健全性の担保（`cid:build-and-test:bt-zsh-census-false-negative` / `cid:reverse-engineering:c6-absence-predicate-exit-code`）

本 census の全述語は次の規律で実行した。再実行時も同じ結果を得られる。

- **ファイル集合の走査**は `while IFS= read -r f` ループで行い、クォートなし変数展開のワード分割に依存しない
- **ERE の `\b`（語境界）を使わない**（`cid:reverse-engineering:c6-ugrep-word-boundary`）
- **不在主張には対照リテラルを併置**し、対照が期待どおり一致することを確認してから 0-hit を根拠にする
- **exit code を確認**する（`grep` の exit 1 = 一致なし、exit 2 = エラー。空出力だけを根拠にしない）
- 測定 tree は全述語で `6a0c3b994`（`git grep <pattern> 6a0c3b994 -- <path>` 形式で固定）

不在主張に用いた対照リテラルの実測:

| 述語 ID | 不在主張 | 対照リテラル | 対照の結果 | 被検の結果 |
|---|---|---|---|---|
| P-A | `plugins/github-pr-convergence/` は model-map / specs/tla / FMC を参照しない | `pr-convergence` | 11 ファイル一致、exit 0 | **0 行、exit 1**（エラーではない） |
| P-D | `packages/` に FMC への機能的ハードコードがない | `pr-convergence` | 3 ファイル一致、exit 0 | 4 行のみ（すべて散文・コメント。§5.1） |

### 1.2 xrev differential を採らない理由

`cid:reverse-engineering:c5-xrev-currency-schema-migration` の判定手順を適用した。本 intent は Issue クロスレビュー起点ではなく**ユーザー直接裁定**（2026-08-21 実 HUMAN_TURN）起点であり、参照すべき過去の verdict 断面が存在しない。さらに区間 65 commits のうち 3 件（`1a1ffb58f` / `e28ed4cf3` / `40090987e` / `3ae6223f4`）が FMC の表現形式そのもの（`authoringProvenance` 必須化、applicability arms の新設、モデル実装境界の単一正本化）を変えているため、currency 条件は構造的に不成立である。**全主張を observed 断面で取り直した。**

---

## 2. Census 1 — tests/ の全数分類

### 2.1 検索キーの多軸化と、上流「153 ファイル」の訂正

上流 intent-statement は `git grep -l "formal-model-check" -- tests/` = **153 ファイル**を退役対象の母集団としている。本スキャンはこれを再実測（153 で一致）したうえで、`cid:application-design:dual-key-consumer-inventory`（複数軸の検索キー）に従い**キーを 8 軸へ拡張**した。

| キー | 述語（すべて `git grep -l -F <key> 6a0c3b994 -- tests/`） | 一致ファイル数 |
|---|---|---|
| K1 | `formal-model-check` | 153 |
| K2 | `tla-authoring` | 26 |
| K3 | `formal-verif` | 43 |
| K4 | `model-completeness` | 12 |
| K5 | `specs/tla` | 63 |
| K6 | `model-map` | 41 |
| K7 | `TLC` | 41 |
| K8 | `tla-evidence` | （K5/K6 に包含） |
| **和集合** | `git grep -l -E "formal-model-check\|tla-authoring\|formal-verif\|model-completeness\|specs/tla\|model-map\|TLC\|tla-evidence" 6a0c3b994 -- tests/` | **164** |

さらに、**内容 grep では捕まらない「ファイル名だけが FMC 由来」の面**が存在する。`git ls-tree -r --name-only 6a0c3b994 | grep -i -E "formal\|tla"` から tests/ 配下 83 件を取り、和集合との差を取ると 3 件が残った。

| ファイル名のみで一致した 3 件 | 判定 |
|---|---|
| `tests/fixtures/formal-verif-ci-baseline.sha256` | **真** — 中身は `7cf2b460adbe645c05060d6c9edfda2c75e17d7536c040278013c46820d57a9c  .github/workflows/ci.yml`。ci.yml の sha256 ピンであり、内容に FMC 語彙を含まないため内容 grep が漏らした |
| `tests/integration/t-formal-model-plugin-boundary.integration.test.ts` | **真** — plugins/ を動的列挙する境界ガード（§5.2） |
| `tests/conformance/pi-formal-evidence.schema.json` | **偽陽性** — Pi ハーネスの conformance evidence スキーマであり FMC 非関連。除外 |

**確定した母集団: 166 パス**（テスト・fixture 161 + 台帳 5）。上流の 153 に対し **+13**。

```
164（内容 8 キー和集合）− 5（台帳）= 159 テスト・fixture
159 + 2（ファイル名のみ一致の真陽性）= 161 テスト・fixture
161 + 5（台帳）= 166
```

### 2.2 機械分類の判定基準

上流 questions Q1=A が定める「import 先 or 被検コマンドが `plugins/formal-model-check` か」を、次の機械述語へ具体化した。

| クラス | 述語 | 意味 | 処遇 |
|---|---|---|---|
| **A1** | `plugins/formal-model-check/tools/{tla-*,run-model-check*,tlc-*,ci-*,canonical,contract,fs-tlc,node-ci,authoring-routes,amadeus-*}` から import、**または** `tests/formal-verif/` 配下、**または** basename が `formal-verif` / `tla` / `model-check` / `formal-model` を含む | 被検 subject が FMC の TLA / model-check 本体 | **削除** |
| **A2** | import が `plugins/formal-model-check/tools/plugin-activation.ts` **のみ** | 被検 subject は**コア側 advisory / activation 機構**で、実装がたまたま FMC プラグイン内に同居している | **処遇は §5.3 の設計裁定に従属**（無条件削除にしてはならない） |
| **B1** | A に該当せず、`join(REPO_ROOT, "plugins", "formal-model-check")` で**実ディレクトリを fixture として使う** | 被検 subject はプラグイン基盤。FMC は「同梱リファレンスプラグイン」の標本 | **代替 fixture へ差し替え**（単純除去では成立しない） |
| **B2** | 上記いずれにも該当しない | 名前・パス文字列・散文・scope grid セルなどの参照のみ | **依存部分の除去 / 文字列差し替え** |

### 2.3 分類結果

| クラス | 件数 | テスト層の内訳 |
|---|---|---|
| **A1** | **92** | integration 45 / unit 26 / formal-verif 16 / e2e 4 / fixtures 3 / lib 1 / harness 0 …（`formal-verif-ci-baseline.sha256` を含む） |
| **A2** | **8** | integration 6 / unit 1 / harness 1 |
| **B1** | **16** | integration 13 / e2e 2 / perf 1 |
| **B2** | **45** | integration 27 / unit 12 / fixtures 4 / e2e 2 |
| 台帳 | 5 | §4.1 |
| **合計** | **166** | |

A（A1+A2）= 100 ファイルの総行数は **25,580 行**（`git show 6a0c3b994:<f> | wc -l` の総和。`formal-verif-ci-baseline.sha256` の 1 行を含む）。

### 2.4 A2（8 件）— 無条件削除にしてはならない集合

`plugin-activation.ts` **のみ**を import する。被検 subject はコア側の advisory 機構である。

```
tests/harness/formal-model-fixture.ts
tests/integration/t2967-advisory-handoff-directive.integration.test.ts
tests/integration/t320-activation-spec-hash.integration.test.ts
tests/integration/t322-activation-lifecycle-behaviour.integration.test.ts
tests/integration/t378-advisories-directive-field.integration.test.ts
tests/integration/t381-advisory-checkpoints-latch.integration.test.ts
tests/integration/t382-activation-real-layout-spec-root.integration.test.ts
tests/unit/t319-activation-judgment.test.ts
```

述語: `git grep -c -F "plugins/formal-model-check/tools/plugin-activation.ts" 6a0c3b994 -- <f>` が正、かつ他の FMC ツールからの import が 0。

### 2.5 B1（16 件）— 同梱リファレンスプラグインの fixture 依存

述語: `git grep -l -F '"plugins", "formal-model-check"' 6a0c3b994 -- tests/`（A 該当分を除く）。

```
tests/e2e/t341-plugin-conformance-journey.serial.test.ts        ← CI blocking job の唯一のテスト
tests/e2e/t415-plugin-optin-cross-harness.serial.test.ts
tests/integration/t2790-plugin-staging-seed-harness-dir.integration.test.ts
tests/integration/t299-plugin-cli-walking-skeleton.integration.test.ts
tests/integration/t302-plugin-cli-failure-branches.integration.test.ts
tests/integration/t328-adapter-auto-compose-launch.integration.test.ts
tests/integration/t338-conformance-recompile-selfheal.integration.test.ts
tests/integration/t339-plugin-doctor-standalone-render.integration.test.ts
tests/integration/t340-plugin-drop-fs-restore.integration.test.ts
tests/integration/t352-plugin-cli-runner-gen-wiring.integration.test.ts
tests/integration/t353-plugin-install-verb.integration.test.ts
tests/integration/t415-plugin-optin-reconciliation.integration.test.ts
tests/integration/t415-plugin-optin-selection.integration.test.ts
tests/integration/t445-advisory-declaration-supply.integration.test.ts
tests/integration/t526-advisory-handoff-stage.integration.test.ts
tests/perf/t415-plugin-optin-startup-performance.test.ts
```

`t341-plugin-conformance-journey.serial.test.ts:30` の逐語コメント: `Fixture: the SHIPPED reference plugin `plugins/formal-model-check`, copied read-only`。同 `:47-48` が `PLUGIN_FIXTURE` / `PLUGIN` を FMC に束縛し、`:54` が `dist/plugins/formal-model-check/codex/INSTALL.md` を読む。

### 2.6 B2（45 件）— 文字列・散文レベルの参照

```
tests/e2e/t-live-llm-ts-tool-journey.serial.test.ts       tests/integration/t377-plugin-boundary-guard.integration.test.ts
tests/e2e/t416-self-projection-fresh-git.serial.test.ts   tests/integration/t416-self-install-plugin-projection.integration.test.ts
tests/fixtures/plugin-boundary-guard/stage-with-scripts-ref.md
tests/fixtures/pr-convergence/measured-pr-2268.graphql.json  tests/integration/t449-pr-convergence-packaging-e2e.integration.test.ts
tests/fixtures/pr-convergence/measured-pr-2269.graphql.json  tests/integration/t458-advisory-auto-resolution.integration.test.ts
tests/fixtures/u3-scope-promotion/pre-migration-15-key-grid.json
tests/integration/t-advisory-choice-record.test.ts         tests/integration/t470-advisory-store-recovery.integration.test.ts
tests/integration/t-coverage-mechanism-ratchet.test.ts     tests/integration/t488-depth-budget-sensor.integration.test.ts
tests/integration/t-formal-model-plugin-boundary.integration.test.ts
tests/integration/t-scope-promotion-canonical.test.ts      tests/integration/t529-advisory-hold-trace.integration.test.ts
tests/integration/t-self-scope-consistency-sensor.test.ts  tests/integration/t532-plugin-manifest-argv-guard.integration.test.ts
tests/integration/t-sensor-undefined-term.test.ts          tests/integration/t534-pr-convergence-mandatory-lifecycle.integration.test.ts
tests/integration/t222-ci-snapshot-branch.integration.test.ts   tests/unit/t-package-write-sweep.serial.test.ts
tests/integration/t2415-re-scan-exclusion-contract.integration.test.ts   tests/unit/t113.test.ts
tests/integration/t2415-re-scan-exclusion.integration.test.ts   tests/unit/t203-mint-presence-classify.test.ts
tests/integration/t254-reference-plugin-lifecycle.test.ts  tests/unit/t210-adapter-mint-classifier.test.ts
tests/integration/t2967-advisory-record-outcome.integration.test.ts   tests/unit/t314-doctor-plugin-rows.test.ts
tests/integration/t2997-plugin-settings.integration.test.ts   tests/unit/t350-runner-gen-plugin-targets.test.ts
tests/integration/t3026-plugin-sensor-declaration.integration.test.ts  tests/unit/t356-promote-self-plugin-carveout.test.ts
tests/integration/t3078-plugin-tool-declaration.integration.test.ts    tests/unit/t397-composed-scope-drop-compose.test.ts
tests/integration/t3249-parked-scope-binding-divergence.integration.test.ts  tests/unit/t431-structured-config.test.ts
tests/integration/t327-hook-wiring-xor-closure.integration.test.ts     tests/unit/t444-advisory-declaration.test.ts
tests/integration/t351-runner-gen-plugin-runner.integration.test.ts    tests/unit/t457-advisory-auto-resolve.test.ts
tests/integration/t356-promote-self-plugin-carveout.integration.test.ts   tests/unit/t459-advisory-receipt.test.ts
```

B2 のうち**編集不要**と判定できるのは `t-formal-model-plugin-boundary.integration.test.ts` のみ（§5.2 のとおり plugins/ を動的列挙するため、FMC の消滅がそのまま反映される）。他は文字列・パス・fixture セルの編集を要する。

---

## 3. Census 2 — tests/ 以外の全消費者

### 3.1 プラグイン本体

`git ls-tree -r --name-only 6a0c3b994 plugins/formal-model-check/` = **43 ファイル**。

| サブツリー | ファイル数 | 行数 |
|---|---|---|
| `tools/` | 37 | 16,217 |
| `stages/`（`formal-model-check.md` / `tla-authoring.md`） | 2 | — |
| `sensors/amadeus-model-completeness.md` | 1 | — |
| `docs/terminal-route-receipt-audit.md` | 1 | — |
| `plugin.json` / `README.md` | 2 | — |
| **合計** | **43** | **16,881** |

行数は `git show 6a0c3b994:<f> | wc -l` の総和（本スキャンの実行）。上流 intent-statement が申告する `tools 16,217 行` は observed でも一致する。

### 3.2 リポジトリ全体の分布

`git grep -l -i -F "formal-model-check" 6a0c3b994` = **1,033 ファイル**。上位ディレクトリ別内訳（`awk -F/` で 2 階層へ丸めて `sort | uniq -c`）:

| 面 | ファイル数 | 備考 |
|---|---|---|
| `amadeus/spaces/**`（intents 704 / elections 102 / codekb 46 / specs 1 / memory 1） | 854 | 大半は workflow exhaust（履歴記録）。退役対象は memory 1 と specs 1 のみ |
| `tests/**` | 152 | §2 |
| `plugins/formal-model-check/**` | 10 | 自己言及 |
| `docs/**` | 10 | §3.3（多軸キーでは 24） |
| `scripts/detect-ci-changes.sh` | 1 | §3.5 |
| `packages/framework/**` | 1 | §5.1 |
| `.github/workflows/ci.yml` | 1 | §3.5 |
| `mise.toml` | 1 | §3.6 |
| `book-pack/scripts/verify-dummy.sh` | 1 | コメントのみ（`.claude/plugins` の削除は汎用処理） |
| `amadeus/config.json` | 1 | §3.4 |

### 3.3 docs 対訳面 — 24 ファイル（英語単独キーでは 15、多軸で +9）

述語（多軸 + 日本語語彙）:
```
git grep -l -E "formal-model-check|tla-authoring|formal-verif|model-completeness|specs/tla|model-map|TLC|TLA\+|formal model|Formal model|形式モデル|形式検証|モデル検査" 6a0c3b994 -- docs/
```
→ 23 ファイル。これに `docs/reference/12-state-machine.md`（`:363` の `formal-check` — ハイフン形のため上記キーで漏れる）を加え **24 ファイル**。

**全数削除する対訳ペア（4 ファイル）**

- `docs/reference/21-formal-model-following.md` / `.ja.md`
- `docs/reference/22-formal-model-supply.md` / `.ja.md`

**部分除去（20 ファイル）**

| ファイル | 参照の性質 |
|---|---|
| `docs/README.md` / `.ja.md` | 上記 2 章への索引リンク（`README.md:52-53`、`README.ja.md:37-38`） |
| `docs/reference/00-overview.md` / `.ja.md` | 同上（`:45-46` の表行） |
| `docs/reference/07-sensor-system.md` / `.ja.md` | `model-completeness` センサーの記述 |
| `docs/reference/12-state-machine.md` / `.ja.md` | advisory receipt / `run_now_receipts_reset` の記述（EN `:363`、JA `:285-287`） |
| `docs/guide/19-plugins.md` / `.ja.md` | FMC を同梱プラグイン例として使用（各 7 hit） |
| `docs/guide/21-layered-config.md` / `.ja.md` | `plugin.scope-bindings` の例 |
| `docs/guide/12-cli-commands.md` / `.ja.md` | `model-completeness` の言及 |
| `docs/guide/09-rules-and-the-learning-loop.md` / `.ja.md` | 同上 |
| `docs/harness-engineering/06-sensors.md` / `.ja.md` | 同上 |
| `docs/amadeus-files.md` / `.ja.md` | `specs/tla` / `model-map.json` のファイル一覧 |

**対照検査**: `git grep -l -F "amadeus" 6a0c3b994 -- docs/` = 212 / 全 218 ファイル（exit 0）。0-hit を不在根拠にしていないことの担保。

**EN/JA 非対称の実例**: 英語キーのみの census（15 件）は `docs/README.ja.md`（「形式モデル」表記）と `docs/reference/12-state-machine.ja.md`（「モデル検査」表記）を漏らし、一方で日本語キーを足した census（23 件）は `docs/reference/12-state-machine.md`（`formal-check` 表記）を漏らした。`cid:application-design:dual-key-consumer-inventory` が要求する「対訳ドキュメントの実語彙（逐語訳とは限らない）」の実測例である。

### 3.4 設定・生成 runner

**`amadeus/config.json`**（`git show 6a0c3b994:amadeus/config.json` を実読）:

- `plugin.activation.names`: 4 要素（`coverage-patch-quick`, `formal-model-check`, `git-drift`, `github-pr-convergence`）のうち 1 要素を除去
- `plugin.scope-bindings.formal-model-check`: ブロック全体を除去。内訳は 2 ステージキー（`formal-model-check` / `tla-authoring`）× 4 スコープ（`self-document` / `self-feature` / `self-fix` / `self-refactor`）

**生成 runner skill**: `.claude/` の追跡ファイルは 3 件のみ（`CLAUDE.md` / `hooks/amadeus-dispatch.ts` / `settings.json`）で、`.claude/skills/amadeus-tla-authoring/` と `.claude/skills/amadeus-formal-model-check/` は**未追跡のビルド生成物**である（`git ls-tree -r --name-only 6a0c3b994 .claude/` の実測）。`amadeus-runner-gen.ts:3-11` の逐語コメントどおり runner 集合はコンパイル済み stage graph から生成されるため、config からステージが消えれば `bun run build` の再生成で自動的に消滅する。**手動削除の対象ではない。**

**authoring パイプラインの行数（上流「約 3,760 行」の再測定）**: 本スキャンが authoring 面として列挙した 10 ファイルの合計は observed で **5,162 行**。

| ファイル | 行数 |
|---|---|
| `tla-authoring.ts` | 893 |
| `tla-referees.ts` | 849 |
| `tla-arm.ts` | 712 |
| `tla-evidence.ts` | 628 |
| `tla-applicability-arms.ts` | 559 |
| `tla-applicability.ts` | 533 |
| `tla-registration.ts` | 395 |
| `tla-model-receipt.ts` | 312 |
| `tla-referee-toolchain.ts` | 275 |
| `authoring-routes.ts` | 6 |
| **合計** | **5,162** |

上流の 3,760 との差は (a) ファイル集合の取り方の違い (b) 本区間での増加（`tla-applicability-arms.ts` 559 行は `3ae6223f4` で新設）の双方に由来する。**矛盾ではなく、母集団宣言の差**として扱う。

### 3.5 CI 配線

`.github/workflows/ci.yml`（全 1,004 行）における FMC 配線は 3 箇所。

| 位置 | 内容 |
|---|---|
| `:765-870` | `# U4 formal-model-check begin` / `end` のマーカーで囲まれた job ブロック（**106 行**）。`:770` の `if:` は `workflow_dispatch` または `(pull_request｜merge_group) && needs.changes.outputs.risk == 'true'` |
| `:905` | `ci-success` 集約の `needs:` リストの 1 要素 |
| `:989` | `ci-success` 本体 `require_result "formal-model-check" "${{ needs['formal-model-check'].result }}"` — **`risk == true` の case アーム内**に置かれている |

`scripts/detect-ci-changes.sh:13-16` の risk 判定:
```
    packages/framework/core/tools/amadeus-*.ts|\
    amadeus/spaces/default/specs/tla/*|\
    plugins/formal-model-check/*)
      risk=true
```
**3 パターンのうち 2 つが FMC 由来**である。この 2 つを除去すると risk トリガは `packages/framework/core/tools/amadeus-*.ts` のみとなる。risk は FMC job だけでなく **`e2e`（フル e2e 層）job のゲートも兼ねている**（`ci.yml:905` の `needs` と `:988` の `require_result "e2e"`）ため、この除去は「FMC を消すだけ」では終わらず**フル e2e 層の発火条件を狭める**。単純な減算ではない。

`tests/integration/t222-ci-snapshot-branch.integration.test.ts:44` が `detectChanges(["plugins/formal-model-check/tools/run-model-check-ci.ts"]).risk` が `"true"` であることを pin しており、同時修正が必要（B2）。

### 3.6 toolchain（mise）

`mise.toml` の `[tools]` は `java = "temurin-26.0.1+8"` と `"npm:takt" = "0.58.0"` の 2 件。冒頭 13 行のコメントは、この JDK ピンが **FMC の TLC のために存在する**ことを逐語で述べている（`formal-model-check verifies the JDK by major version …` / `#2410` の再発コスト）。

JDK 消費者の全数（`git grep -l -i -E "JAVA_HOME|jdk|\bjava\b" 6a0c3b994 -- packages/ scripts/ tests/ .github/ book-pack/ plugins/` → 37 ファイル、exit 0）はすべて (a) `plugins/formal-model-check/tools/` 12 件 (b) FMC README 1 件 (c) class A テスト 22 件 (d) 台帳 2 件 に分解される。**FMC 以外の JDK 消費者は存在しない** → `mise.toml` の java ピンは退役後に死重となる。

### 3.7 book-pack

`book-pack/scripts/verify-dummy.sh:35` はコメント中に FMC を例示するのみで、実処理 `rm -rf "$TMP/.claude/plugins" "$TMP/.claude/.amadeus-plugin-"*` は汎用。**動作面の変更不要**（コメント文言の更新は任意）。

---

## 4. Census 3 — specs/tla と台帳

### 4.1 版管理下の台帳（5 + 1）

各台帳の FMC 該当エントリ数（`git show 6a0c3b994:tests/<f>` を bun で parse、または `grep -c -i -E "formal-model-check|formal-verif|/tla|tla-"`）:

| 台帳 | 該当 | 是正手順 |
|---|---|---|
| `tests/.coverage-registry.json` | **4 unit** が FMC テストを coveredBy に持つ | `bun tests/gen-coverage-registry.ts` で regen（`cid:build-and-test:c1`）。ただし §4.2 の覆域喪失に注意 |
| `tests/.coverage-patch-allowlist.json` | **6 エントリ**（`contract.ts` / `fs-tlc-toolchain.ts` / `tlc-spawn-planner.ts` / `tla-authoring.ts` の `<module>`、`tla-referee-toolchain.ts` の `runOnce`、`tla-referees.ts` の `prepareMutation`） | エントリ削除。行シフトを跨ぐ場合は `createSemanticSelector` で残存エントリを再アンカー（`cid:code-generation:c5-ratchet-census-at-final-base`） |
| `tests/.complexity-baseline.json` | **2 エントリ**（`contract.ts` の `parseArmSuiteResult` / `parseCellResult`） | エントリ削除 |
| `tests/.silent-success-baseline.json` | **6 エントリ**（すべて `t-formal-verif-run-model-check-real.integration.test.ts`） | ファイル削除に伴いエントリ削除 |
| `tests/.test-time-factor-allowlist.json` | **3 エントリ**（`:45` / `:51` / `:519`） | 同上 |
| `tests/fixtures/formal-verif-ci-baseline.sha256` | ci.yml の sha256 ピン 1 行。消費者は `tests/integration/t-formal-verif-ci-workflow.integration.test.ts:10` | **ci.yml から FMC job を除去すると sha256 が変わる**。消費者ごと削除するのが整合的（消費者は class A1） |

FMC 該当が **0** だった台帳: `.callsite-allowlist.json` / `.coverage-project-baseline.json` / `.coverage-project-policy.json` / `.coverage-ratchet.json` / `.test-size-purity-allowlist.json` / `.unchecked-cast-allowlist.json`。`tests/no-silent-drop/` も FMC エントリ 0（`ast-scan.ts` の 2 hit は `AstLang` への部分一致による偽陽性で、`import type { Lang as AstLang … }` と `function languageFor(...)` の 2 行）。

### 4.2 coverage-registry の覆域喪失 — class A 削除で唯一の被覆源を失う 3 unit

`tests/.coverage-registry.json`（642 unit）の `coveredBy` を class A（100 ファイル）と突き合わせた結果:

| unit | クラス | 唯一の被覆源 |
|---|---|---|
| `function:advisoryLatchDir` | function | `tests/integration/t381-advisory-checkpoints-latch.integration.test.ts`（A2） |
| `function:PluginStageError` | function | `tests/integration/t-formal-verif-plugin-stage-discovery.integration.test.ts`（A1） |
| `amadeus-log advisory-decision` | subcommand | `tests/integration/t-advisory-human-choice-boundaries.test.ts`（A1） |

class A を含むが**他の非 A テストでも覆われる** unit は 2 件、166 パス集合に何らかの形で触れる unit は計 18 件。

**3 件はいずれも FMC 側ではなくコア側の unit である。** うち 2 件は advisory 機構（§5.3）に属する。regen 後の `coveredByClass` が減るため、coverage ratchet（shrink-only）との整合を退役 PR 内で解決する必要がある。

### 4.3 `specs/tla` / `specs/tla-evidence`

| 対象 | ファイル数 | 行数 |
|---|---|---|
| `amadeus/spaces/default/specs/tla/` | 14（7 `.tla` + 6 `.cfg` + `model-map.json`） | — |
| `amadeus/spaces/default/specs/tla-evidence/` | 7（内容ハッシュ名の JSON） | — |
| **合計** | **21** | **1,686** |

`model-map.json`（`schemaVersion` / `models`）は 4 モデル、実装ハッシュピン計 **21 エントリ**。

| モデル | entries | implPath の内訳 |
|---|---|---|
| `BoltPrAttestationGate` | 6 | core 2（`amadeus-orchestrate.ts` / `amadeus-state.ts`）+ **`plugins/github-pr-convergence/tools/` 4** |
| `FormalElection` | 5 | core 5（`amadeus-election*.ts`） |
| `MirrorLifecycle` | 4 | core 4（`amadeus-mirror-*.ts`） |
| `PrConvergenceGate` | 6 | core 2 + **`plugins/github-pr-convergence/tools/` 4** |

### 4.4 github-pr-convergence 側からの参照 — **不在を実測**

述語 P-A（§1.1）:
```
git grep -n -E "model-map|specs/tla|tla-evidence|formal-model-check|formal-verif" 6a0c3b994 -- plugins/github-pr-convergence/
→ 出力 0 行、exit 1（一致なし。エラーではない）
対照 git grep -c -F "pr-convergence" 6a0c3b994 -- plugins/github-pr-convergence/ → 11 ファイル、exit 0
```

**結論: 依存は一方向（model-map → github-pr-convergence）であり、逆向きの参照は存在しない。** model-map.json の削除は github-pr-convergence の動作へ影響しない。scope-document が「requirements で実測確認する」とした項目は、本スキャンで **blocking 発見なし**として確定した。

**副次的帰結**: `cid:build-and-test:bt-ledger-resync` が課す「`amadeus-orchestrate.ts` / `amadeus-state.ts` を変更する PR は model-map の実装ハッシュピンを resync せよ」という義務は、model-map の削除とともに**失効する**（ピン 21 件のうち core 側 13 件がこの義務の対象だった）。ノルム整理（B4）で扱う。

### 4.5 `specs/tla` を「除外しない」と宣言している面

`packages/framework/core/amadeus-common/stages/inception/reverse-engineering.md:139-140` の逐語:
```
**Not excluded: `amadeus/spaces/*/specs/`.** `specs/tla/model-map.json` and
`specs/tla-evidence/` sit under `amadeus/spaces/` but are build ledgers a code
```
同趣旨のコメントが `packages/framework/core/tools/amadeus-lib.ts:1548`。

この散文は **blocking テストで pin されている**:

- `tests/integration/t2415-re-scan-exclusion-contract.integration.test.ts:118-119` — `expect(section).toContain("model-map.json")` / `toContain("tla-evidence")`
- `tests/integration/t2415-re-scan-exclusion.integration.test.ts:64-65, 201-204` — fixture に `specs/tla/model-map.json` と `specs/tla-evidence/deadbeef.json` を置き、`test("specs/tla and specs/tla-evidence stay in the scan input")` で scan 入力への残留を assert

`specs/tla` を削除する場合、**ステージ本文（正本）とテストの両方**を同一変更で更新する必要がある（`cid:code-generation:cg2-agreeing-predicate-drift` の同意述語ドリフト面）。

---

## 5. Census 4 — エンジン側の結合点とプラグイン境界

### 5.1 `packages/` における FMC 参照 — 4 hit、すべて散文

述語 P-D（§1.1、対照 `pr-convergence` = 3 ファイル exit 0）:
```
git grep -n -i -E "formal-model-check|tla-authoring|formal-verif|model-completeness|specs/tla|model-map" 6a0c3b994 -- packages/
```

| 位置 | 種別 | 内容 |
|---|---|---|
| `packages/framework/core/amadeus-common/stages/inception/reverse-engineering.md:139` | ステージ本文（散文） | §4.5 |
| 同 `:140` | 同上 | §4.5 |
| `packages/framework/core/knowledge/amadeus-shared/audit-format.md:90` | ナレッジ（散文） | `Formal-model-check checkpoint choices use an authoritative side ledger at …` |
| `packages/framework/core/tools/amadeus-lib.ts:1548` | コメント | `// amadeus/spaces/*/specs/ is deliberately absent — model-map.json and the` |

**実行コードにおける FMC のハードコードは 0 件。** プラグイン境界（「dropping the plugin restores 0-plugin baseline」）は**エンジン側で成立している**。

### 5.2 境界を強制している blocking テスト

`tests/integration/t-formal-model-plugin-boundary.integration.test.ts`（49 行）が 2 つの不変量を守っている。

1. `core names no concrete plugin` — `readdirSync(PLUGINS)` で `plugin.json` を持つディレクトリを**動的に列挙**し、`packages/framework/core` 配下の全ファイル（相対パス + 内容）にその名前が現れないことを assert
2. `plugins leave workflow scope assignment to the host` — 各プラグインの stage frontmatter が `scopes: []` であることを assert

1 が現在 green である理由は微妙で、`audit-format.md:90` は `Formal-model-check`（先頭大文字）であり `haystack.includes("formal-model-check")` に一致しないためである。**大小文字の偶然に依存した green** であり、退役後は plugin 名リストから FMC が消えるため無関係になるが、`audit-format.md:90` の散文自体は残ると FMC 退役後に「存在しないプラグインを説明する散文」になる。docs 整理の対象に含めるべき面。

このテストは**動的列挙であるため FMC 削除に伴う編集を要しない**（B2 のうち唯一）。

### 5.3 **設計上の中核発見 — advisory 機構の孤児化**

`plugins/formal-model-check/plugin.json:57-76` の `advisories` 宣言は、**同梱 4 プラグインのうち唯一の advisory 宣言**である。

| プラグイン | plugin.json のトップレベルキー |
|---|---|
| `coverage-patch-quick` | name, stages(空), seams, fragments, tools |
| **`formal-model-check`** | name, stages(2), seams, fragments, sensors, tools, **advisories** |
| `git-drift` | name, stages(空), seams, fragments, sensors, tools, settings |
| `github-pr-convergence` | name, stages(1), seams, fragments, sensors, tools |

述語: `git grep -n -E '\.advisories|"advisories"' 6a0c3b994 -- packages/ plugins/ scripts/` の `plugins/` 側 hit は `plugins/formal-model-check/plugin.json:57` の 1 件のみ。

**この宣言を失うコア側の機構（observed の実測）:**

| 面 | 規模 |
|---|---|
| `packages/framework/core/tools/amadeus-advisory-choice.ts` | **1,463 行** |
| `packages/framework/core/tools/amadeus-advisory-declaration.ts` | **497 行** |
| `amadeus-directive.ts` の advisory 配線 | `:547` / `:561` / `:564`（`EXECUTE_ADVISORY_HANDOFF_FIELDS`）/ `:893` / `:941-945` / `:988-990` |
| `amadeus-orchestrate.ts` の advisory ルート | `:879-884`（`await-advisory-choice`）/ `:921-923` |
| `amadeus-utility.ts` の doctor / scan 表示 | `:2730` / `:3918` / `:3942` / `:4171` / `:5481-5514` |
| ハーネス conductor 面の散文 | **7 面**（claude / codex / cursor / kimi / kiro / kiro-ide / opencode の `await-advisory-choice` / `execute-advisory-handoff` 行）+ pi の `:110` / `:129` |
| coverage-registry の unit | §4.2 の 3 件中 2 件（`advisoryLatchDir` / `amadeus-log advisory-decision`） |
| テスト | A2 8 件 + B1 2 件（t445 / t526）+ B2 8 件（t113 / t203 / t210 / t314 / t444 / t457 / t458 / t459 / t470 / t529 / t-advisory-choice-record / t2967-advisory-record-outcome） |

**帰結**: FMC を削除すると、コア側 1,960 行超 + 7 ハーネス面 + 多数のテストからなる advisory 機構が、**供給者ゼロの休眠機構になる**。これは inception フェーズガードレールが禁じる「adapter・外部契約の先行着地」と同じ形（配線先のない機構）が、削除によって**事後的に**生じるケースである。

これは本スキャンが判定すべき事項ではない（設計裁定に属する）。requirements / application-design で次の 3 択を裁定すべき **open item** として記録する。

| 選択肢 | 内容 |
|---|---|
| (a) advisory 機構も同時退役 | 母集団が §2 の 166 パスを超えて拡大する。scope-document の In Scope 外 |
| (b) `plugin-activation.ts` をコアへ再配置 | A2 8 件のテストは import パス変更で存続。FMC 固有部分（spec hash 判定・handoff `formal-model-check`）の切り離しが必要 |
| (c) 供給者ゼロのまま残置 | 休眠機構を意図的に残す判断。根拠を ADR へ記録すること（org.md Forbidden の「要求されない互換レイヤー」との境界を明示） |

なお、直近区間（`1a1ffb58f`、#3187）で **advisory authoring-hold 経路の完全退役**が既に着地している。advisory 機構の一部退役は前例があり、(a) は非現実的ではない。

### 5.4 リファレンスプラグイン fixture の代替可能性

同梱プラグインのうち **stage を持つのは FMC（2 stage）と github-pr-convergence（1 stage）のみ**（`coverage-patch-quick` / `git-drift` はいずれも `stages: []`）。B1 の 16 件（とくに blocking job `plugin-conformance-e2e` が実行する `t341`）は stage graph の再コンパイルを journey に含むため、**代替 fixture は github-pr-convergence しか存在しない**。

scope-document の制約「`plugins/github-pr-convergence` は非接触（#3382 で別エージェントが作業中）」との関係:

- fixture としての利用は **`plugins/github-pr-convergence/` への書込を伴わない**（`tests/` 側のみを編集する）ため、制約と両立する
- ただし `t341` は `dist/plugins/formal-model-check/codex/INSTALL.md` を読むなど FMC のプラグイン形状（stages 2 / sensors 1 / advisories 1 / tools 37）に依存した assertion を持つ可能性があり、github-pr-convergence（stages 1 / sensors 1 / advisories 0 / tools 13）への差し替えは形状差の吸収を要する
- **advisories を持つプラグインが 0 になる**ため、`t445-advisory-declaration-supply` / `t526-advisory-handoff-stage` / `t2997-plugin-settings`（`test("formal-model-check still carries its advisories field")`）は fixture 差し替えでは成立しない。§5.3 の裁定に従属する

---

## 6. Census 5 — ノルム面

### 6.1 `memory/project.md`（11 行 / 8 個の distinct cid）

述語: `git grep -n -i -E "formal-model-check|tla-authoring|model-map|formal-verif|tlc|TLA\+" 6a0c3b994 -- amadeus/spaces/default/memory`。cid は各行から `grep -o 'cid:[a-z0-9-]*:[a-z0-9-]*' | tail -1` で抽出。

| 行 | cid | 退役との関係 |
|---|---|---|
| `:35` | `cid:application-design:finite-exploration-not-detected-proof` | TLA+/TLC の有限探索を前提とする規則 — **全面失効候補** |
| `:180` | `cid:build-and-test:bt-ledger-resync` | model-map 実装ハッシュピンの resync 義務 — **model-map 部分のみ失効**（coverage-patch-allowlist / coverage-registry 部分は存続） |
| `:209` | `cid:formal-model-check:c2` | FMC のローカル実行手順 — **全面失効候補** |
| `:210` | `cid:build-and-test:bt-prose-literal-test-ledger` | model-map を「第4の台帳クラス」の一例として挙げる — **例示の除去のみ**（規則本体は存続） |
| `:213` | `cid:tla-authoring:tla-impl-only-evidence-shape` | **全面失効候補** |
| `:214` | `cid:tla-authoring:tla-spec-change-discriminator` | **全面失効候補** |
| `:217` | `cid:pr-convergence:prc-bolt-pr-record-scope` | Bolt PR が運ぶ record 範囲に `specs/tla/model-map.json` を含める — **model-map 部分のみ失効** |
| `:218` | `cid:formal-model-check:fmc-no-activation-record-on-not-applicable` | **全面失効候補** |
| `:220` | `cid:build-and-test:c3-manual-sensor-fire-scope` | 近接則として FMC 則を相互参照 — **参照の除去のみ** |
| `:221` | `cid:tla-authoring:c1-internal-claims-are-untrusted` | **一般則**（選挙 rationale の事実主張は untrusted）。tla-authoring は発見文脈にすぎない — **cid 名の付け替え候補、内容は存続** |
| `:222` | `cid:formal-model-check:c1-authornew-separation-halt-exemption` | **全面失効候補** |

### 6.2 `memory/team.md`（1 行 / 1 cid）

| 行 | cid | 退役との関係 |
|---|---|---|
| `:85` | `cid:build-and-test:two-layer-verification-posture` | 「並行プロトコルの spec 変更時のみ単一形式モデルの完全探索（TLA+/TLC 等）を専用ジョブで追加する」— **形式検証面の削除**。日常 CI の PBT/unit/integration 部分は存続 |

### 6.3 未蒸留 Learnings Inbox

`project.md` の Learnings Inbox にも FMC / TLA 由来の具象学習が複数残る（`cid:reverse-engineering:xrev-scan-mode-cid-hollowing` が記す「空洞化」の再発リスク）。**本則が消えて追補だけが残る形**を作らないよう、B4 のノルム整理では追補側も同時に棚卸しすること。とくに `:213` / `:214` / `:221` / `:222` は本文節（`## Corrections` / Inbox）に散在しており、cid 単位ではなく行単位の棚卸しが要る。

---

## 7. 区間（65 commits）の観測

### 7.1 直前 intent の FMC 投資 — 退役直前 2 日間で +2,214 行

区間内の FMC 面への差分（`git diff --stat e86fbe125 6a0c3b994 -- <paths>`）:

| 対象 | files | insertions | deletions |
|---|---|---|---|
| `plugins/formal-model-check/` + `specs/tla/` + `ci.yml` + core advisory 2 ファイル | 14 | **+1,032** | −253 |
| FMC 関連テスト（`tests/*formal-verif*` / `tests/*tla*` / `tests/formal-verif/`） | 12 | **+1,182** | −74 |
| **合計** | 26 | **+2,214** | **−327** |

内訳となる主要 commit:

| commit | 内容 |
|---|---|
| `1a1ffb58f` (#3362) | `[fmc-drift-batch/1/advisory-retirement]` advisory authoring-hold 経路の完全退役（#3187） |
| `e28ed4cf3` (#3363) | `[fmc-drift-batch/2/revise-model-commit]` registration committer の replace-by-name（#2289） |
| `40090987e` (#3364) | `[fmc-drift-batch/2/boundary-three-face]` モデル実装境界 3 面の単一正本化（#2929） |
| `3ae6223f4` (#3374) | `[fmc-drift-batch/3/applicability-arms]` 適用性判定に語彙 drift / 欠陥再発の 2 本の腕を追加（#3186）— `tla-applicability-arms.ts` 559 行新設 + テスト 819 行 |
| `22c15f896` (#3348) | `fix(formal-model-check): preserve authoringProvenance in updateModelMap --impl-only` |
| `220ef8abe` (#3316) | `fix(plugin): gitignore diagnostic/ output from formal-model-check diagnostic tool` |
| `ab01010e8` (#3368) | `feat(ci): promote risky PRs to full e2e and formal checks` — FMC job の risk-tier 化（ci.yml +54、detect-ci-changes.sh +17） |
| `15abd5dfe` (#3376) | `test(tests): compare t448 against shipped plugin bundle` |

**観測**: 退役裁定（2026-08-21）の直前 2 日間に、退役対象そのものへ 2,214 行が投入されている。うち #3368 は **FMC job の CI 配線を新設し直した**もので、本 intent はその配線を除去することになる。これは技術的な blocker ではないが、退役範囲の見積りに影響する（区間内の新規面も削除対象に含まれる）。

### 7.2 退役の総フットプリント（observed 実測）

| 面 | ファイル | 行 |
|---|---|---|
| `plugins/formal-model-check/` | 43 | 16,881 |
| class A テスト（A1 92 + A2 8） | 100 | 25,580 |
| `specs/tla/` + `specs/tla-evidence/` | 21 | 1,686 |
| docs（全面削除分 4 のみ） | 4 | （未計測） |
| **削除小計** | **168** | **44,147+** |
| B1 差し替え | 16 | — |
| B2 部分除去 | 45 | — |
| 台帳 resync | 6 | — |
| 設定・CI・toolchain（`config.json` / `ci.yml` / `detect-ci-changes.sh` / `mise.toml` / `book-pack`） | 5 | — |
| docs 部分除去 | 20 | — |
| ノルム（`project.md` 11 行 + `team.md` 1 行） | 2 | — |

行数は `git show 6a0c3b994:<f> | wc -l` の総和。A2 8 件は §5.3 の裁定次第で削除小計から外れる。

---

## 8. 判定サマリ

### 8.1 blocking 発見

**なし。** scope-document が requirements で確認せよとした「github-pr-convergence 側から model-map / specs への参照」は §4.4 のとおり **0 hit（exit 1、対照 11 ファイル exit 0）** で、退役を阻む構造的依存は存在しない。エンジン側の FMC ハードコードも 0 件（§5.1）で、プラグイン境界の主張は成立している。

### 8.2 設計裁定を要する open item（requirements / application-design へ送る）

| # | 項目 | 節 |
|---|---|---|
| O-1 | advisory 機構の処遇（同時退役 / コアへ再配置 / 供給者ゼロで残置） | §5.3 |
| O-2 | B1 16 件のリファレンス fixture を github-pr-convergence へ差し替える是非と、形状差（stages / advisories）の吸収方法 | §5.4 |
| O-3 | `specs/tla` 削除に伴う RE ステージ本文（`reverse-engineering.md:139-140`）と t2415 の同時更新 | §4.5 |
| O-4 | risk-tier トリガから FMC 2 パターンを除いた後の、フル e2e 層の発火条件 | §3.5 |
| O-5 | coverage-registry の 3 unit が唯一の被覆源を失うことへの対処（ratchet 整合） | §4.2 |
| O-6 | `mise.toml` の java ピン除去の是非 | §3.6 |
| O-7 | 失効 cid（全面 5 / 部分 4 / 名称のみ 1 / team.md 1）の整理単位 | §6 |

### 8.3 上流数値の訂正

| 上流の申告 | observed 実測 | 差の理由 |
|---|---|---|
| テスト 153 ファイル | **166 パス**（テスト・fixture 161 + 台帳 5） | 単一キー（`formal-model-check`）による過小計上。多軸キー + ファイル名 census で +13 |
| docs（節数未指定） | **24 ファイル**（全面削除 4 / 部分除去 20） | 英語キーのみでは 15、日本語語彙 + `formal-check` 追加で 24 |
| tools 16,217 行 | **16,217 行**（一致） | — |
| authoring 約 3,760 行 | **5,162 行**（10 ファイル、母集団を明示） | 母集団の取り方の差 + 区間内の増加（`tla-applicability-arms.ts` 559 行新設） |

---

## 9. 本スキャンが実行していないこと

- テスト・build・lint・typecheck・coverage・TLC の実行（**すべて未実行**）
- git 状態の変更、record への書込、GitHub への読み書き、engine / state ツールの実行（**すべてゼロ**）
- FMC 系 open Issue（#3246 ほか）の棚卸し — GitHub 読取を伴うため本スキャンの mandate 外。intent-backlog B5 で扱う
- B2 45 件の**個別の**編集内容の確定 — 本スキャンは分類と編集要否の判定までを行い、具体的な差し替え文字列は code-generation の担当

## 10. codekb 面の衛生に関する付随観測

`reverse-engineering-timestamp.md` は observed 断面で **2 つの「現在」マーカー**を持っていた。`:3` が `## 実行メタデータ（最新: 260818-issue-3029-sensor-gate）`、`:2252` が `## 実行メタデータ（現在: 260820-fmc-drift-batch）` である。260820 の節がファイル冒頭ではなく末尾へ追記され、冒頭節の「最新」ラベルが降格されなかったことによる。本 intent の更新で両方を履歴ラベルへ降格し、本 intent の節を冒頭へ置いて解消した（§ timestamp ファイル）。
