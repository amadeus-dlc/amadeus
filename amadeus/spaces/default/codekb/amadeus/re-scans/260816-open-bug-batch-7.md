# リバースエンジニアリング差分スキャン記録: 260816-open-bug-batch-7

## 0. メタデータ

| 項目 | 値 |
|---|---|
| Date | `2026-08-16` |
| Intent | `260816-open-bug-batch-7` |
| Scope / depth / project type | `self-fix` / Minimal / Brownfield |
| Repository | `amadeus`（単一 repo、root `/Users/j5ik2o/orca/workspaces/amadeus/gh-issue`） |
| Base commit | `83e1dbeefb3278a00e86f69d3c79071a35ccf043`（前回 observed = 260815-stale-epoch-landed。本 intent 初回スキャンのため差分 base はこれ 1 つ） |
| Observed commit | `5c5911ee3f107152c3173701caf178a746b6e3aa`（`git rev-parse HEAD`、`origin/main` 一致断面） |
| Scan mode | **通常の差分リフレッシュ**（xrev differential 不採用。理由は §1） |
| Focus | 差分棚卸し + オープンバグ 3 件の深掘り — [#2363](https://github.com/amadeus-dlc/amadeus/issues/2363) / [#2162](https://github.com/amadeus-dlc/amadeus/issues/2162) / [#3097](https://github.com/amadeus-dlc/amadeus/issues/3097) |
| 分担 | Developer scan（`amadeus-developer-agent`）→ 本 Architect synthesis。本記録の実測値は出典を「Developer scan §N」と「本 synthesis の再実行」で書き分ける |

**祖先性と距離**（`cid:reverse-engineering:rescan-base-ancestry`）:

- `git merge-base --is-ancestor 83e1dbee HEAD` → **exit 0**
- `git rev-list --count 83e1dbee..HEAD` → **28**

## 1. Scan mode の選択 — xrev differential を採らない理由

`cid:reverse-engineering:c5-xrev-currency-schema-migration` の判定手順を適用した。

1. **患部の表現形式そのものを変える移行が、Issue 起票断面と observed の間に挟まっているか** → **#2162 で挟まっている**。`fe8c701ba`（2026-08-06、`fix(nsd): replace previousDigest ledger with append-only ULID events (#2338) (#2353)`、`git merge-base --is-ancestor fe8c701ba 83e1dbee` → **exit 0**）が `tests/no-silent-drop/baseline.json` を append-only ULID event 台帳へ全面移行しており、Issue #2162 本文が引く `baseline.json` / `candidate.digest` / `baseline.generatedFrom.revision` は現行スキーマへ写像できない。
2. したがって #2162 については currency 条件が**構造的に不成立**であり、Issue 断面の主張は背景としてのみ受け取り、**全主張を observed 断面で取り直した**（結果は §2.3）。
3. #2363 / #3097 は表現形式の移行こそ無いが、単独で differential mode を採る利得が無いため、3 件とも**通常の差分リフレッシュ**に揃えた。

## 2. 測定述語と実測値

断りのない限り observed tree（`5c5911ee3`）に対して実行した。working tree の変更は `amadeus/spaces/default/intents/intents.json` と本 intent の record dir 追加のみ（Developer scan の実測、本 synthesis でも codekb 配下以外へは書き込んでいない）。

### 2.1 区間規模と帰属

| 述語 | 結果 | 出典 |
|---|---|---|
| `git rev-list --count 83e1dbee..HEAD` | **28** | 本 synthesis |
| `git diff --shortstat 83e1dbee HEAD` | **399 files changed, 22808 insertions(+), 1198 deletions(-)** | 本 synthesis |
| `git diff --shortstat 83e1dbee HEAD -- ':!amadeus/' ':!metrics/'` | **165 files / +11114 −1126** | 本 synthesis |
| `git diff --name-only --diff-filter=A 83e1dbee HEAD -- 'tests/**' \| wc -l` | **30**（新規テスト） | 本 synthesis |
| `git diff --name-only --diff-filter=M 83e1dbee HEAD -- 'tests/**' \| wc -l` | **59**（変更テスト） | 本 synthesis |
| `git diff --name-only 83e1dbee..HEAD -- .github/` | **空出力・exit 0**（CI 面は不変） | Developer scan §1、本 synthesis で再確認 |
| `git diff --name-status 83e1dbee..HEAD -- packages/framework/core/tools/` | 新規（`^A`）**5** / 変更（`^M`）**21** | 本 synthesis |

区間の主体は intent `260815-rfc-autonomy-modes`（RFC-0001 intent autonomy modes、Issue #3116）の全 unit 着地である。あわせて #3110 の是正 PR #3113（`8ceeb2dc18`。`git merge-base --is-ancestor 8ceeb2dc18 HEAD` → exit 0、同述語を base へ → exit 1 で区間内着地を確認）、RFC 0002 ドラフト（#3126）、metrics snapshot 12 件を含む。

### 2.2 #2363 — self-install 配布経路（全数棚卸し）

すべて `sed -n` による逐語直読（本 synthesis の再実行）。

| 面 | 実測 |
|---|---|
| `scripts/plugin-projection.ts:44-53` | `PACKAGE_HARNESSES` = 8 面、`:52` が `"pi"` |
| `scripts/plugin-projection.ts:59` | `export const SELF_INSTALL_HARNESSES = ["claude", "codex", "cursor", "opencode", "kimi"] as const;`（pi 不在） |
| `scripts/promote-self.ts:64-71` | `managedDirs` 6 エントリ（claude / codex の `.codex` と `.agents` / cursor / opencode / kimi）。pi 不在 |
| `scripts/promote-self.ts:45-48` | コメント逐語「The self-install face set is defined ONCE, next to the eight package faces it is deliberately narrower than.」— これは `SELF_INSTALL_HARNESSES` を指し、`managedDirs` と allowlist はその主張の外 |
| `packages/framework/core/tools/data/self-install-allowlist.ts:12-19` | `GENERATED_SELF_INSTALL_ROOTS` 6 ルート（`.pi` なし） |
| `packages/framework/harness/pi/manifest.ts:83` / `:106-108` / `:112` | `{ src: "agents", dst: "agents" }` / `frontmatterAdditions`（`agents/amadeus-architecture-reviewer-agent.md` へ `tools: read, grep, find, ls`）/ `modelPins: PI_MODEL_PINS` |
| `packages/framework/harness/pi/drivers/amadeus-pi-driver.ts:32` | `PERSONA_CHARTER_DIRS = [".pi/agents", ".codex/agents", ".claude/agents", ".agents/agents"]` |
| `tests/integration/t531-plugin-harness-literal-guard.integration.test.ts:143-148` | テスト名逐語 `PACKAGE_HARNESSES enumerates every self-install face`。本体は `for (const harness of SELF_INSTALL_HARNESSES) expect(PACKAGE_HARNESSES).toContain(harness);` = **片方向** |
| `scripts/promote-self.ts:327-329` | `packageFreshnessArgs` が `SELF_INSTALL_HARNESSES.map(...)` を返す（doctor の鮮度検査が同じ盲点を継承） |
| 作業ツリーの実ルート | `ls -d .agents .claude .codex .cursor .kimi-code .opencode .pi` → **`.pi` のみ `No such file or directory`**、他 6 件は列挙される |
| 固定件数ピン（Red 点） | `tests/integration/t-plugin-projection-packaging.test.ts:148-149`（`toEqual(["claude","codex","cursor","kimi","opencode"])` / `toHaveLength(5)`）、`tests/unit/t-plugin-projection.test.ts:308`（`toHaveLength(5)`）、`tests/unit/t209-promote-self-dangling-symlink.test.ts:146-150`（`packageFreshnessArgs("apply")` 逐語配列） |

**kimi との対比**（Developer scan §2 からの転記）: kimi は `a45b01bd3`（2026-07-26、`feat(harness): add Kimi Code CLI harness (kimi) (#1522)`）で**ハーネス追加と同一 PR で** promote-self に載った。pi は `f7273b9ab`（2026-08-04、`feat(pi): add Pi agent core support (#2166)`）で追加されたが promote-self には載っていない。

**実害の射程**: charter 本体と model ピンは driver の fallback（`.claude/agents` / `.codex/agents` は実在）で解決されるため、未配布なのは `frontmatterAdditions` が投影する read-only allowlist の 1 点。外部ユーザー向け導入経路（`docs/guide/harnesses/pi.md:36-48` の `bunx @amadeus-dlc/setup install --harness pi`）は塞がっていない。

### 2.3 #2162 — no-silent-drop bootstrap provenance（observed 断面で取り直し）

| 述語 | 結果 |
|---|---|
| `ls tests/no-silent-drop/baseline.json` | **exit 1**（不在） |
| `ls tests/no-silent-drop/events/ \| wc -l` | **222** |
| `sed -n '435,461p' tests/no-silent-drop/bootstrap.ts` | `loadTrustedPreviousLedgers`。`:448` で `trustedSha` の `events/` 存在を判定 → 在なら `:449` `assertStrictAncestorOfHead`、不在なら `:451` `validateBootstrapHistory` |
| `sed -n '348,358p'` 同ファイル | `:348-351` 等値契約（`bootstrapBaseRevision === preRevision`）、`:352-356` `preRevision` の `gitObjectExists` + `isAncestor`、`:358` `validateEvidenceBundle(..., provenance.postRevision, ...)` |
| `sed -n '283p'` 同ファイル | `if (approved.revision !== revision` — **文字列等値比較のみ** |
| `grep -n postRevision tests/no-silent-drop/*.ts` | **3 hit**: `:53`（型）/ `:186`（パース）/ `:358`（唯一の実消費） |
| `sed -n '226,227p;301,302p' tests/no-silent-drop/ledger.ts` | `baselineAtRevision`（`git show ${sha}:tests/no-silent-drop/baseline.json`）と `CANONICAL_PATHS.baseline` — **不在ファイルを指す** |
| `sed -n '164p' .github/workflows/ci.yml` | `timeout --signal=TERM --kill-after=5s 30s bun run no-silent-drop -- --base-revision "${BASE_REVISION}"` |

**Developer scan §3 が実測した revision の到達性**（本 synthesis では再実行していない — 出典明示）: `fc49f8de26f85c56ddc7ba94ee7522276ed3ec60` は `git cat-file -t` → commit（exit 0）だが `git branch -a --contains` / `git for-each-ref --contains` はいずれも空出力で **どの ref からも到達不能な dangling commit**、`git merge-base --is-ancestor <sha> HEAD` → **exit 1**。`preRevision = 47574fbabf274e11cb8e0b37bf35a0309a7b3d42` は `--is-ancestor` → exit 0（健全）で、`bootstrapBaseRevision == preRevision` の等値契約は成立している。

**結論**: Issue 本文が挙げた 3 不整合のうち `candidate.digest` と `baseline.generatedFrom.revision` に関する 2 点は `fe8c701ba` の台帳移行で**消滅済み**。残る実体は (i) `postRevision` に git 到達性検査が存在しないこと (ii) `CANONICAL_PATHS.baseline` / `baselineAtRevision` が死んだ経路であること（唯一の呼出は `tests/integration/no-silent-drop-gate.test.ts:839` の negative test）。現行 CI は `validateBootstrapHistory` を通らないため、恒久 fail-closed は潜在状態である。

### 2.4 #3097 — センサー列挙 drift（検索述語を明記）

| 述語 | 結果 |
|---|---|
| `ls packages/framework/core/sensors/ \| wc -l` | **11** |
| 各 `plugins/*/plugin.json` の `sensors` 配列 | **3**（`formal-model-check` → `sensors/amadeus-model-completeness.md`、`git-drift` → `sensors/amadeus-git-drift.md`、`github-pr-convergence` → `sensors/amadeus-pr-convergence-report-format.md`） |
| `for f in packages/framework/core/sensors/*.md plugins/*/sensors/*.md; do grep -q "^matches:" "$f" && basename "$f"; done \| sort \| wc -l` | **13**（`matches` 宣言を持つ集合） |
| `grep -c "^matches:" plugins/git-drift/sensors/amadeus-git-drift.md` | **0**（exit 1）— 唯一の非宣言 manifest |
| 07 en の表行の抽出（述語は本表の直下に併記） | **9**（表の実体は `:200-208`、ヘッダ行は `:198`） |
| `comm -23`（13 − 9） | **4 件**: `amadeus-nfr-budget.md` / `amadeus-pr-convergence-report-format.md` / `amadeus-question-budget.md` / `amadeus-scope-sizing.md` |
| `comm -13`（表にあるが実在しない） | **0 件** |
| `grep -n "^matches:" packages/framework/core/sensors/amadeus-{required-sections,upstream-coverage}.md` | 両者とも `:8` で `**/{amadeus-docs,intents,codekb}/**`。07 の `:200` / `:201` は `**/{amadeus-docs,intents}/**` で **`codekb` を欠く** |
| `sed -n '209,212p' docs/reference/07-sensor-system.md` | 逐語「`matches` **is** the fire filter … an entry **without** a `matches` glob never fires at all」 |
| `sed -n '1,2p;20,51p' tests/integration/t3028-sensors-docs-sync.integration.test.ts` | `covers:` は `docs/harness-engineering/06-sensors.md` と `.ja.md` のみ。`derivedCorpus()`（`:20-45`）は core + plugin 宣言 = 14、`tableRows()`（`:47-51`）は `docs/harness-engineering` 直下だけを読み、行頭のパイプに続く `amadeus-*.md` のコードスパンを正規表現で抽出する |

表行抽出の再実行可能な述語（パイプを含むため表外に置く）:

```bash
# 07 en の matches 表から manifest 名を抽出（対象 tree = observed 5c5911ee3）
grep -o '^| `amadeus-[a-z0-9-]*\.md`' docs/reference/07-sensor-system.md \
  | sed 's/^| `//;s/`$//' | sort -u          # → 9 件

# matches 宣言を持つ manifest の集合
for f in packages/framework/core/sensors/*.md plugins/*/sensors/*.md; do
  grep -q "^matches:" "$f" && basename "$f"
done | sort                                   # → 13 件
```

**同期先は 14 ではなく 13**。`amadeus-git-drift.md` を 14 件目として機械的に足すと、07 自身の `:210-212` の発火規約と矛盾する行が生まれる。ja 面（`.ja.md`）は表 `:199-207`、例示表 `:48-49`、散文 `:377-384` で対応する（Developer scan §4 からの転記）。

### 2.5 品質指標と台帳

**測定元**: `metrics/2026-08-15T15-18-46-261Z-8ceeb2dc1823.json` と `metrics/2026-08-16T11-04-41-875Z-3e1c6a19ed5b.json` の `collectors.<name>.values` 直読（本 synthesis の再実行。Developer scan §5 と一致）。

| 指標 | base | observed |
|---|---|---|
| coverage percent | 93.3805400500996 | 93.41934476465595 |
| coverage hits / lines | 94686 / 101398 | 95724 / 102467 |
| test files / assertions | 1017 / 13600 | 1044 / 13879 |
| failed files / assertions | 0 / 0 | 0 / 0 |
| unit_small / integration_medium | 258 / 565 | 270 / 580 |
| loc core | 146600 | 148942 |
| ccn 関数数 / 閾値超過 | 7218 / 32 | 7301 / 32 |
| open bugs | 4 | 4 |

台帳（`git diff --stat 83e1dbee..HEAD -- <5 台帳>`、本 synthesis）: allowlist **+187 行** / registry **+128 行** / model-map **12 行** / complexity-baseline **4 行** / coverage-ratchet **4 行**。区間内で健全に resync 済み。

是正時の係り（`grep -c` の転記）: `promote-self` は allowlist **1**（`tests/deletion-gate.ts` の `runDistributionGuards` エントリの reason 文中）/ registry 0 / model-map 0。`plugin-projection` と `self-install-allowlist` は 3 台帳とも 0。`no-silent-drop` は allowlist **5** / registry **3**（すべて `tests/perf/t-no-silent-drop-text-mutation.test.ts`）/ model-map 0。

### 2.6 codekb からの引用可能性（本 intent 固有の確認）

`cid:requirements-analysis:c4-consume-header-is-not-citable-content` に従い、後続ステージが codekb から本 intent の事実を引けるかを確認した。

`grep -c "07-sensor-system" *.md`（`amadeus/spaces/default/codekb/amadeus/` の 9 面、本 intent の追記前）→ **全 9 面で 0**（exit 1 = エラーなく不一致）。対照として `grep -c "sensor"` は `architecture.md` **71** / `component-inventory.md` **64** であり、センサー機構自体は収載済みで、**この docs パスだけが未収載**という限定的な不在だった。本 intent で `component-inventory.md` §D と `code-structure.md` の C 節に収載し、後続が引ける状態にした。`promote-self` / `no-silent-drop` は既存収載あり（Developer scan §1 の `grep -c`: `promote-self` は architecture 20 / component-inventory 14 / code-quality 8、`no-silent-drop` は component-inventory 34 / api-documentation 18 / code-quality 18）。

## 3. 主要知見のポインタ

| 知見 | codekb の写像先 |
|---|---|
| RFC-0001 autonomy の全 unit 着地（新規 core tool 5 本の責務、権限の単一正本化、waiting terminal、監査語彙 +5） | `architecture.md` §1、`component-inventory.md` §A、`api-documentation.md` §1〜4、`dependencies.md` |
| #2363: 配布経路の集合定義が 3 重化し、包含検査が片方向 | `architecture.md` §2、`component-inventory.md` §B、`code-structure.md` A 節、`code-quality-assessment.md` §3-A |
| #2363: 実害は read-only allowlist 1 点、外部導入経路は無傷 | `architecture.md` §2、`business-overview.md`、`api-documentation.md` |
| #2162: 台帳移行で正本が消えたのに参照と検査の穴が残った（3 残滓） | `architecture.md` §3、`component-inventory.md` §C、`code-structure.md` B 節 |
| #2162: Issue 本文の 3 不整合のうち 2 つは消滅済み（修理対象の再定義が先） | `architecture.md` §3、本記録 §2.3 |
| #3097: 導出可能な集合を 2 doc が手書き、検査は 06 のみ | `architecture.md` §4、`component-inventory.md` §D、`code-quality-assessment.md` §3-C |
| #3097: 同期先は 14 ではなく 13 | `architecture.md` §4、`api-documentation.md`、本記録 §2.4 |
| 3 件に共通する構造クラス（#2363 / #3097 は同型、#2162 は移行残滓） | `architecture.md` §5、`business-overview.md` |
| 品質指標の改善と台帳の健全性 | `code-quality-assessment.md` §1〜2 |

## 4. 訂正・申し送り

**上流入力からの訂正 1 件。** Developer scan §1 は RFC-0001 の record を「11 unit 分」と記録していたが、record 上の unit ディレクトリを列挙すると **13** である。

- 述語: `ls amadeus/spaces/default/intents/260815-rfc-autonomy-modes/construction/ | grep -v -x -e code-generation -e functional-design -e nfr-design | wc -l` → **13**（ステージスラッグ 3 件を除外した unit ディレクトリの列挙）
- 内訳: `completion-report` / `config-visibility` / `d6-investigation` / `docs-norms` / `grant-ceremony` / `interactive-carveout` / `merge-provenance` / `presence-closure` / `presence-detection` / `recommendation-core` / `s13-zero` / `semi-authority-projection` / `waiting-interruption`
- 対応する PR も 13 本（`git log --oneline 83e1dbee..HEAD` の `[rfc-autonomy-modes/...]` プレフィックス付きコミット）
- codekb では **13** を採用した。この差は結論に影響しない（本 intent の 3 件は autonomy 実装と独立）

**その他の実測はすべて再現した。** Developer scan §2〜§5 の file:line と件数は、本 synthesis で再実行した範囲（§2.2 の全行、§2.3 の bootstrap / ledger / ci.yml、§2.4 の全述語、§2.5 の metrics と台帳）で**不一致ゼロ**だった。再実行していない項目（dangling commit の到達性、ja 面の行番号、docs の逐語列挙位置、`dist/pi/.pi/agents/` の 15 charter）は出典を Developer scan と明記して転記した。

**申し送り**:

- **1 intent に 3 Issue を載せられない**（最重要）。`cid:code-generation:oq-singleton` により、degrade スコープ（`self-fix` は units-generation / delivery-planning を SKIP）では pr-convergence の Delivery Bolt authority が construction 配下の unit ディレクトリを**ちょうど 1 つ**であることを要求する。2 つ目の unit を作った時点で全 unit の report mint（create / report / override）が構造的に不成立になる。intent 分割か、非 degrade スコープの選択が要る。
- **#2363 の Red 点は既にある**が、それは「pi が足された」ことを示すだけである。固定件数ピン 3 本は pi 追加で必ず赤くなる一方、**欠陥そのもの（逆向きガードの不在）の落ちる実証**には新設ガードとその注入赤が別途要る。
- **#2162 は「何を修理するか」の合意が先**。Issue 本文の 3 不整合のうち 2 つは消滅済みで、実体は §2.3 の (i)(ii) の 2 点である。到達性検査の追加は公開契約（`bootstrap-provenance.json` のフィールド契約）の追加になる。
- **#3097 は Issue 本文をそのまま受けると誤った表になる**。同期先は 13 で、既存 2 行の値（`codekb` の欠落）も直す必要がある。ja 面も同じ 2 クラスの drift を持つ。
- **未決事項**（本スキャンでは決めていない、`memory/team.md` P1 の裁定事項）: 3 件の是正方式、#2363 の逆向きガードの形（双方向の literal guard か、charter 宣言の有無を条件にした選択的検査か）、#2162 の死んだ経路の削除範囲と negative test の去就、#3097 を t3028 の射程へ入れるか 07 専用の検査を新設するか。

## 5. Verification

- git 状態変更（commit / branch / checkout / stash / merge）: **ゼロ**
- GitHub 書込・読取: **ゼロ**（本 synthesis では `gh` を一切実行していない）
- engine / state ツール実行（`amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-log.ts` / `amadeus-bolt.ts`）: **ゼロ**
- `bun run build` / フルスイート / coverage / TLC: **すべて未実行**（本スキャンは読取専用。`bun -e` による metrics JSON の読取のみ実行）
- 書き込み範囲: `amadeus/spaces/default/codekb/amadeus/` 配下のみ（本体 8 面 + `reverse-engineering-timestamp.md` + 本ファイル）
