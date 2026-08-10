# re-scan: 260810-plugin-prose-seed-guard（Issue #2810 / #2812、兄弟 #2823 分離）

**Date**: `2026-08-10`
**測定 ref (observed)**: `c51afbd0a99b2eb3f0b9c1ee4e2cef2772378131`（`origin/main` 系譜。worktree HEAD `ff06d945b` は record-only merge のため observed に採らない — `cid:reverse-engineering:c2-observed-mainline-commit` / `measurement-ref-in-artifacts`）
**Base**: `df1c874cfb397fafe877a72f00a82664a59689ae`（直前 intent `260810-plugin-harness-dir-token` の observed。`cid:reverse-engineering:rescan-base-ancestry`）
**区間**: `git log --oneline "${B}..${S}"` → **8 コミット**。非 record の実質変更は **`c51afbd0a`（PR #2811）1 本のみ**（他 7 本は record / metrics）。`git diff --shortstat "${B}" "${S}" -- . ':(exclude)amadeus/'` → **16 files / +721 / -101**。record 側は `git diff --name-only "${B}" "${S}" -- amadeus/ | wc -l` → **38 files**
**Scope**: `self-fix`、Brownfield、単一 repo `amadeus`、build `bun`、Depth: **Minimal**
**Focus**:
- [Issue #2810](https://github.com/amadeus-dlc/amadeus/issues/2810)（bug / P2 / S3-MAJOR / in-progress）— plugin stage prose の root-relative ツール参照 **11 行**が consumer ワークスペースで解決しない疑い
- [Issue #2812](https://github.com/amadeus-dlc/amadeus/issues/2812)（bug / P2 / S3-MAJOR / in-progress）— **ユーザー承認のうえ reframe 済み**: `transform()` / `seedBytesForHarness()` の rename 規則は将来ドリフトの懸念ではなく、`KNOWN_RULES_SUBDIR` の 2 キー欠落により **`.cursor` / `.opencode` で既に乖離**している。`KNOWN_RULES_SUBDIR` の修正が in scope、等価性テストは `transform()` に manifest の `rulesRename` を与える形で書く
- [Issue #2823](https://github.com/amadeus-dlc/amadeus/issues/2823)（bug / P2 / **S2-CRITICAL**）— 兄弟欠陥 `plugins/formal-model-check/plugin.json:61` は分離済みで**本 intent の射程外**

（3 件の state / label はいずれも `gh issue view <n> --json labels,title,state` で本 RE 中に実測確認。すべて OPEN。）

**Scan mode**: **xrev differential scan**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue` / `c1-xrev-mechanism-resolution`）— クロスレビュー 2 名 × 2 Issue。収束: #2810 = **ESTABLISHED_WITH_REFINEMENTS** / #2812 = **REFRAME_REQUIRED** → ユーザー承認のうえ本文へ訂正節を追記して reframe 適用済み(`KNOWN_RULES_SUBDIR` 修正を in scope 化、S3-MAJOR/P2 へ引上げ)。run ID = `xrev-2810-20260810T080817Z` / `xrev-2812-20260810T080817Z`。レビュー verdict を Developer scan の一次入力とし、Architect が observed 断面の verbatim 実読で二重化
**副作用**: git 状態変更・GitHub 書込・`bun run build`・engine/state 操作は**すべてゼロ**。書き込みは codekb 配下のみ

---

## 行番号引用の currency（実測の記録であり、免除の主張ではない）

- **#2810 の 11 行**: 全 11 行を observed 断面で**全数**逐語照合（spot ではない）。Issue の表と逐語一致し、`df1c874cf` からの行番号シフトは**ゼロ**。ただし Issue の表は `formal-model-check.md:48` の**先頭 3 半角スペースのインデントを落としている**（reviewer-1 の訂正 1 を確認）。
- **#2812 の引用**: 患部 `amadeus-harness.ts` / `amadeus-plugin.ts` は区間で変更されている（`M` 判定）ため、免除条件は成立しない。両レビュアーと Developer scan がいずれも observed で再解決し、Architect が独立に再実測した（`cid:reverse-engineering:c1-xrev-single-issue` の「レビュー対象 SHA ≠ observed のときは全引用を再解決」に従う）。
- 引用取得は `git show "${S}:<path>"` に統一（zsh のブレース必須 — `cid:requirements-analysis:zsh-revpath-brace-quoting`）。

### Architect 独立再実測による scan 訂正 2 件

| # | scan / brief の記載 | 実測 | 影響 |
|---|---|---|---|
| 1 | `tests/integration/t149-opencode-cursor-dist-structure.test.ts:81` / `:87` | パスは **`tests/smoke/`**（`git ls-tree -r --name-only "${S}" \| grep t149` で実測）。行番号 `:81` / `:87` は正 | 引用先の層が違うだけで結論不変 |
| 2 | cursor の `amadeus-rules` は「manifest 6 行のみ」 | **6 hits = manifest 5 行（`:3` / `:11` / `:33` / `:44` / `:74`）+ `emit.ts:3` のコメント 1 行**。実行コードのヒットは 0 | 「cursor に emit 側 hardcode なし」の結論は不変（強化） |

---

## 検索述語（再実行可能・結果と同所に記録 — `cid:requirements-analysis:enumeration-completeness-review` / `c2c5` 系の述語記録要求）

すべて `S=c51afbd0a99b2eb3f0b9c1ee4e2cef2772378131` を明示 rev として worktree ルートで実行。exit code はパイプ非経由で取得（`cid:code-generation:no-exit-capture-through-pipe`）。

| ID | 述語（逐語） | 結果 |
|---|---|---|
| P1 | `git grep -nE '(^\|[^/A-Za-z0-9._-])plugins/[a-z0-9-]+/(tools\|stages\|specs\|hooks)/' "${S}" -- plugins/` | **16 hits**（exit 0）。対象母集団は `git ls-tree -r --name-only "${S}" -- plugins/` → **44 tracked files**、除外なし |
| P2 | P1 の末尾 `(tools\|stages\|…)/` 制約を外した広義形 | **17 hits**。追加 1 件は `formal-model-check/README.md:101` |
| P3 | `git show "${S}:packages/framework/harness/<h>/manifest.ts" \| grep -n 'rulesRename\|harnessDir:'`（8 面） | 8 面すべて取得（下表） |
| P4 | `git grep -n 'rulesSubdirFor' "${S}"` | 非 record hit **3 件**（定義 `amadeus-harness.ts:71` / import `amadeus-plugin.ts:32` / 呼出 `:672`）。`scripts/` と `tests/` は **0 hit** |
| P5 | `git grep -n 'rulesSubdir' "${S}" -- packages scripts tests .github docs plugins` | `rulesSubdir()`（`amadeus-harness.ts:191-197`）が `KNOWN_RULES_SUBDIR` を**直接**読む第二経路を検出 |
| P6 | `git grep -ln 'harness-transform' "${S}" -- tests/` | **6 ファイル**。`transform` の実 import は `tests/smoke/t-pi-dist-structure.test.ts:11` の **1 件のみ**、残り 5 件はコメント言及 |
| P7 | `git grep -ln 'seedBytesForHarness' "${S}" -- tests/ scripts/` | **1 ファイル**（`t2790-…`）。P6 との交わりは **0** |
| P8 | `git grep -lE 'from "[^"]*scripts/' "${S}" -- tests/ \| wc -l` | **88**（tests → scripts の import に層の壁は無い） |
| P9 | `git grep -nE '/rules/' "${S}" -- plugins/` | **exit 1 / 0 行**（plugin コーパスは rename 規則を一度も踏まない） |
| P10 | `git grep -nE '(^\|[^/A-Za-z0-9._-])plugins/[a-z0-9-]+/' "${S}" -- 'packages/framework/core/**/*.md'` | **1 hit**（`amadeus-pr-convergence-report-format.md:54`、意図的非 import の説明散文） |
| P11 | `git grep -nE '(cursor\|opencode)' "${S}" -- tests/integration/t144-harness-seam.cli.test.ts` | **0 hits**（現行 `.cursor`/`.opencode` fallback を pin するテストは存在しない） |
| P12 | `git ls-files dist .claude \| wc -l` | **3**（`.claude/CLAUDE.md` / `.claude/hooks/amadeus-dispatch.ts` / `.claude/settings.json`）。`.gitignore:19` `/dist/**`、`:24` `/.claude/**` |
| P13 | `git diff --name-status "${B}" "${S}" -- tests/ scripts/ packages/ plugins/` | A 4 件 / M 9 件（`code-structure.md` の同 intent 節に全数） |

---

## 中核所見 1 — 直前 intent の中核前提は #2811 で解消された

直前節（`260810-plugin-harness-dir-token`）の N-3 は「経路B（runtime compose）に置換器は存在せず、self-install 5 面は `transform()` を一度も通らない」を中核所見としていた。PR #2811 が `seedBytesForHarness`（`amadeus-plugin.ts:669-675`）を新設し、`copyRealFiles` の書き出し点 `:738` へ配線したことで、**この非対称は解消済み**である。

`harnessDir` は**書き出し先**から導かれる（`stagingHarnessDirOf(dst)`、`:659-664`）。`seedStaging`（`:894-900`）の宛先は常に `pluginSourceRootOf(hostRoot)/<name>` = `<harnessTree>/.amadeus-plugin-src/<name>` なので、`collectPluginSources`（`:874-889`）が authoring `plugins/` を優先しても解決は効く。`null` を返すのは authoring `plugins/<name>` **へ書き戻す**場合（`install --force`）だけで、これは意図的な設計（`:656-658` の逐語コメント）であり `t2790:83` が pin する。

---

## 中核所見 2 — 非対称は「置換器の有無」から「rename データ源」へ移動した

規則の**形**は逐語同一（token → rename の順序、`replaceAll` によるアンカー `${harnessDir}/rules/`、prose ゲートは `.md` / `.md.example`）。`amadeus-plugin.ts:666-668` は自ら「Mirrors the packager's transform()」と宣言する。**差はデータ源のみ**:

| 面 | rename のデータ源 |
|---|---|
| `transform()`（`scripts/harness-transform.ts:33-45`） | 呼び出し元が渡す引数 `rulesRename`（`:37`）= harness manifest |
| `seedBytesForHarness()`（`amadeus-plugin.ts:669-675`） | `rulesSubdirFor(harnessDir)`（`:672`）= `KNOWN_RULES_SUBDIR` 表 |

### すでに乖離している（PROVEN）

`amadeus-harness.ts:59-65` の表は **5 キー**、`KNOWN_HARNESS_DIRS`（`:38-46`）は **7 個の相異なるディレクトリ**。差分 2 個は `:72` の `?? "rules"` fallback に落ちる。

| face | harnessDir | manifest `rulesRename`（行） | `rulesSubdirFor` | 一致 |
|---|---|---|---|---|
| claude | `.claude` | `null`（`:112`） | `rules` | ✅ 双方 no-op |
| codex | `.codex` | `"amadeus-rules"`（`:74`） | `amadeus-rules` | ✅ |
| **cursor** | `.cursor` | **`"amadeus-rules"`（`:74`）** | **`rules`** | ❌ **乖離** |
| kimi | `.kimi-code` | `null`（`:109`） | `rules` | ✅ |
| kiro | `.kiro` | `"steering"`（`:91`） | `steering` | ✅ |
| kiro-ide | `.kiro` | `"steering"`（`:111`） | `steering` | ✅ |
| **opencode** | `.opencode` | **`"amadeus-rules"`（`:76`）** | **`rules`** | ❌ **乖離** |
| pi | `.pi` | `null`（`:114`） | `rules` | ✅ |

**8 manifest → distinct `(harnessDir, rulesRename)` ペアは 7**。

### 2 キー追加が効く観測点は 3 つ（1 つは両レビュー未指摘）

`rulesSubdirFor` の消費者は 1 件（P4）だが、`KNOWN_RULES_SUBDIR` を直接読む第二の消費者が存在する（`amadeus-harness.ts:191-197`）:

```ts
export function rulesSubdir(): string {
  if (process.env.AMADEUS_RULES_SUBDIR) return process.env.AMADEUS_RULES_SUBDIR;
  if (process.env.AMADEUS_HARNESS_DIR) {
    return KNOWN_RULES_SUBDIR[process.env.AMADEUS_HARNESS_DIR] ?? "rules";   // :194
  }
  return shippedRulesSubdir() ?? KNOWN_RULES_SUBDIR[harnessDir()] ?? "rules"; // :196
}
```

(1) `rulesSubdirFor` → `seedBytesForHarness` のみ、(2) `:194` の env 分岐 — **descriptor を一切見ない**、(3) `:196` の descriptor 欠落時 fallback。reviewer-2 は `rulesSubdir()` を「descriptor 優先 + map fallback」と記述したが、`:194` に descriptor 優先は無い — **これが未指摘の第 4 の面**である。

方向性の評価（事実に接地）: (2)(3) は `.cursor` / `.opencode` で現在 `"rules"` を返すが、実インストールの descriptor は `"amadeus-rules"` を出荷する（`tests/smoke/t149-opencode-cursor-dist-structure.test.ts:81` / `:87`）。`cursor/manifest.ts:44` の `{ src: "rules", dst: "amadeus-rules" }` は実ディレクトリ名も `amadeus-rules` であることを示す。**2 キー追加は (2)(3) をより正しい値へ寄せる**。回帰リスクは P11（0 hits）により実測でゼロ。

---

## 中核所見 3 — ガードに見えてガードではない（#2812 の本体）

P6 / P7 により、`transform` と `seedBytesForHarness` を**同時に参照するファイルは 0** — 差分比較は現状構造的に不可能である。

さらに `t2790:87-102`（`seedBytesForHarness transforms prose only, and applies the rules rename`）が叩くキーは `.claude`（`:89`）/ `.codex`（`:92`）/ `.kiro`（`:95`）と非 prose `.codex`（`:99` / `:100`）/ `null`（`:101`）のみ。**乖離する `.cursor` / `.opencode` は不在**であり、サンプルされたキー集合は「一致する部分集合」と完全に一致する。テストは緑だが生きた乖離を 1 件も観測しない。

コーパス側も遮蔽している: P9 により plugin `.md` コーパス（4 ファイル）は `/rules/` を 1 件も含まない。したがって **#2810 の 11 行を修正しても #2812 の乖離は自然には露出しない**。

---

## PATCH-SURFACE INVENTORY

### #2810 — 患部本体 11 行（必修）

| ファイル | 行 | 件数 |
|---|---|---|
| `plugins/pr-convergence/stages/pr-convergence.md` | 54, 80, 162, 214 | 4 |
| `plugins/formal-model-check/stages/formal-model-check.md` | 48 | 1 |
| `plugins/formal-model-check/stages/tla-authoring.md` | 65, 68, 110, 113, 116 | 5 |
| `plugins/formal-model-check/README.md` | 111 | 1 |

代表 3 件の逐語:

- `pr-convergence.md:54` → `bun plugins/pr-convergence/tools/pr-convergence-cli.ts status \`
- `formal-model-check.md:48` → `   bun plugins/formal-model-check/tools/run-model-check.ts \`（**先頭に半角スペース 3 つ**）
- `formal-model-check/README.md:111` → `mise x java@temurin-26.0.1+8 -- bun plugins/formal-model-check/tools/run-model-check.ts …`（末尾は U+2026 の省略記号リテラル）

**候補スコープ拡張（要件段で採否裁定）**: `formal-model-check.md:12`（frontmatter `inputs:` の説明参照）、`README.md:101`（自ファイルへの自己ポインタ）。いずれも `.md` なのでトークン化可能。

**トークンが構造的に届かない面**（`.ts` / `.json` は両置換器とも拡張子分岐で Buffer 素通し — `harness-transform.ts:39` / `amadeus-plugin.ts:671`）:

- `plugins/formal-model-check/plugin.json:61`（**#2823** へ分離済み）
- `plugins/formal-model-check/tools/node-ci-model-check-port.ts:223`（spawn argv）
- `plugins/formal-model-check/tools/run-skeleton-ci.ts:19`（`// Usage:` コメント）と `:60`（`"usage: …"` 実文字列）

> 件数の突き合わせ: reviewer-1 の 16 は P1 と一致。reviewer-2 の 17 は述語が異なり（`plugins/` 固定部分文字列 × `*.md` + `*.json` のみ、正しい `<hostRoot>/plugins/…` 3 行を含み `.ts` を含まない）、**同じ 17 でも構成が違う**。P2 の 17 = 患部 11 + 追加 6 で両者を包含する。

### #2810 — 両経路とも到達実証済み（事実）

- **経路A（packager）**: `tests/integration/t-plugin-projection-packaging.test.ts:171` のコメントが逐語で「the consumer install bundle is path A (build-time packager), which DOES run harness-transform's transform()」と述べ、`:180-196` が患部 4 行を含む `pr-convergence.md` を全 8 面で `installArtifacts` から取り出しトークン解決を assert する。
- **経路B（seed）**: `copyPluginSource`（`:702`）→ `copyRealFiles(..., stagingHarnessDirOf(dst))`（`:710`）→ `:738`。`t2790:104-120` が実 CLI（`bun <hostRoot>/tools/amadeus-plugin.ts compose --if-stale --project-root <hostRoot>`、`:67-71`）で駆動し、合成後 `<harnessDir>/plugins/pr-convergence/stages/pr-convergence.md` について (i) `${harnessDir}/tools/amadeus-sensor.ts` がちょうど 1 回（`:96`）(ii) 生トークン残存なし（`:97`）(iii) foreign dir リテラルなし（`:98-100`）を assert する。

したがって **11 行のトークン化は新機構を必要とせず、既存の 2 置換器にそのまま乗る**。

### #2812 — 修正面

| 面 | 所在 | 内容 |
|---|---|---|
| プロダクション修正 | `packages/framework/core/tools/amadeus-harness.ts:59-65` | `".cursor": "amadeus-rules"` / `".opencode": "amadeus-rules"` を追加（値は manifest 実測値） |
| 等価性テスト（新規） | `tests/integration/` 想定 | `transform` と `seedBytesForHarness` の**両方**を import し、`transform()` には manifest の `rulesRename` を与えて byte 比較 |
| ペア供給ヘルパー | `tests/helpers/harness-dir-fixture.ts` | 既に `HarnessManifest` 型を import（`:11`）し `harnessDirOf` が manifest を `require`（`:22`）。**`rulesRename` を返すヘルパーは未実装** — ここへの最小追加で足りる |
| 付随 | `tests/integration/t-coverage-mechanism-ratchet.test.ts` | #2811 が t2790 追加時に 1 行追記した先例あり |

### ガード述語の設置先（2 択、要件段の裁定事項）

| 候補 | コーパスの実体 | `plugin.json:61` と `.ts` の扱い |
|---|---|---|
| `tests/unit/t146-core-hygiene.test.ts` | `STRAY_ROOTS = [CORE, PLUGINS]`（`:42-43`）だが `walkMd`（`:66-72`）の `full.endsWith(".md")`（`:70`）により **`.md` のみ** | **構造的にコーパス外** → カーブアウト不要 |
| `tests/integration/t531-…` | `PLUGIN_SCAN_ROOTS = ["plugins"]`（`:47`）+ `git grep -lE …`（`:71`）で**全 tracked file** | `.json` / `.ts` が入る → **恒久赤かカーブアウトの二択** |

これは reviewer-2 の「完了条件 3 への順序制約」に対する決定的な解である: **t146 に置けば `.md`-only 走査により制約自体が発生せず、t531 に置く場合のみ #2823 の裁定待ちになる。**

既存述語の射程: `tests/lib/boundary-guard.ts:122` `HARNESS_LITERAL_TOKEN_RE = /\.(?:claude|codex|cursor|kimi-code|kiro-ide|kiro|opencode|pi)\/[A-Za-z0-9._/-]*/g` は harness dotdir 専用で `plugins/<name>/tools/…` を捕捉しない。predicate 3 は `scanPluginProseForHarnessLiterals`（`:205-210`）。t146 側は `HARNESS_PATH_RE`（`:80-82`、`allHarnessDirs()` 導出）、走査本体 `strayLiterals`、カーブアウト `isCarvedOut`（`:46-64`）。

P10 により、t146 の CORE 半分へ `plugins/` 相対述語を足したときの偽陽性は **1 件のみ**（`amadeus-pr-convergence-report-format.md:54` — `:51-58` を実読すると「The checker re-reads the report with its own minimal line reader **instead of** importing …」で意図的非 import の説明散文）。PLUGINS 根に限定すれば発生しない。P12 により composed 面（untracked）はどちらの走査にも入らず、危険要因にならない。

---

## TEST LANDSCAPE — 明示改訂が要るテストは 1 件も無い

| テスト | 固定内容 | 修正後の帰結 |
|---|---|---|
| `t2790:87-102` | `.claude`/`.codex`/`.kiro`/非prose/`null` の出力文字列 | **緑維持**（乖離キーを触らない） |
| `t2790:104-120` compose E2E | 上記 (i)(ii)(iii) | **緑維持**（置換後は自 dir、対象パスも別） |
| `t2790:122-131` 再 compose no-op | 2 回目の compose がバイト同一 | 緑維持 |
| `t-plugin-projection-packaging.test.ts:180-196` | 同形を 8 面で | 緑維持 |
| `t531:88-94` / `:96-110` / `:162-171` | dotdir リテラル 0 件 / 落ちる実証 / vacuity guard（`RAW_PLUGIN_ALLOWLIST` は `:53` で空・fail-closed） | 緑維持（トークン形は dotdir でない） |
| `t146:104-118` ほか | CORE+PLUGINS の `.md` に dotdir 0 件 | 緑維持 |
| `t144-harness-seam.cli.test.ts:207` / `:228` / `:245` | `rulesSubdir()` の descriptor / `AMADEUS_HARNESS_DIR` / `AMADEUS_RULES_SUBDIR` 解決 | **緑維持**。P11 = 0 hits |
| `tests/smoke/t149-…:81` / `:87` | 両面 `harness.json` の `rulesSubdir` が `"amadeus-rules"` | **緑維持かつ整合強化** |

これは両 Issue の修正が既存 pin と衝突しないことを意味する（`cid:reverse-engineering:c1-pinned-behavior-ruling` の適用対象外）。

---

## 事実と仮説の分離

**事実（実測・逐語）**: 区間の構成、11 行の全数逐語一致、全スイープ件数と述語（P1〜P13）、manifest 8 面の実測値、`KNOWN_RULES_SUBDIR` の 5 キー、3 消費経路、両経路の到達実証、テスト所在と assert 内容、P10 の 1 hit と P12 の untracked 判定。

**仮説（未実測、下流へ引き継ぐ）**:

1. **#2810 の中核主張「consumer ワークスペースで解決しない」は依然 DEDUCED。** reviewer-1 が repo 外の同型レイアウトで A/B 対照（A: exit 1 Module not found / B: exit 2 CLI 到達）を取り measured-supported へ昇格させたが、`INSTALL.md → compose → 実行` の end-to-end は本 scan でも未実行。
2. `rulesSubdir():196` fallback の到達条件（descriptor 不在ツリーの実在形態）は**未計測**。
3. `.ts` 内 usage 文字列 3 件（`node-ci-model-check-port.ts:223` / `run-skeleton-ci.ts:19` / `:60`）の consumer 実挙動は未計測。修正手段が `{{HARNESS_DIR}}` トークンでは届かない点のみ静的に確定。
4. `.cursor` / `.opencode` が plugin staging の compose 対象として**実運用される**かは未確認。`SELF_INSTALL_HARNESSES` に両者が含まれることは `scripts/plugin-projection.ts:20` で実測済み（reviewer-2）。

---

## 後続検証者向けメソッドメモ（`cid:requirements-analysis:review-method-memo`）

- `plugins/` 配下のスイープを `.md` で止めない。`.json` と `.ts` を含めて初めて #2823 クラス（修正手段が構造的に不在）が見える。ただし**ガードのコーパスをどこまで広げるかは別判断** — t146 は `.md` only、t531 は全 tracked file という非対称が実在する。
- 「単一ソース化済み」の主張は**関数名の grep ではなくデータ源の追跡**で検証する。`rulesSubdirFor` は importer 1 件だが、その裏の `KNOWN_RULES_SUBDIR` は `rulesSubdir()` が別ルートで直接読む。関数境界で止めると第 3・第 4 の消費経路を見落とす。
- **テストが keyed map を叩くときは、叩いているキーを map の全キー空間と突き合わせる。** t2790 は一致する部分集合だけをサンプルしており、ガードに見えてガードではない。
- `git grep -nE '…' "${S}" -- path | sed …` の直後の `$?` は `sed` の exit。`git grep` 自身の 0/1（match / no-match）を読むにはリダイレクト後に取る（P9 の実測で一度踏んだ）。
- テストパスは層まで含めて実測する。scan / brief の `tests/integration/t149-…` は実際には `tests/smoke/` にあり、`git ls-tree -r --name-only "${S}" | grep t149` で初めて判明した（`cid:requirements-analysis:mechanism-cite-verify-at-draft` の追補「フルパスで引く」の実例）。

---

## 本 RE の適用範囲外（明示）

修正案の設計・選定（#2810 のトークン化範囲、ガード述語の設置先、#2812 の等価性テストの層と形）は本段の所掌ではない。本記録は、その裁定を証拠から下せる状態にすることのみを目的とする。
