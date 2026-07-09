# u702-release-sync-atomic コード生成サマリー

対象: GitHub #702 — `scripts/release-version-sync.ts` の prerelease バッジ前進不能 + 半適用(half-applied)バグ
ブランチ: `fix/702-release-sync-prerelease-atomic`(`origin/main` から分岐)
スコープ: bugfix(FR-702、選定判断 Q1=A: regex 対称化 + validate-then-write の all-or-nothing)

## バグの根因(確認済み)

- version 受理 regex(`:22`)は prerelease サフィックスを許容する一方、README バッジ regex(`:53-54`)は stable `X.Y.Z` の直後に即 `-blue` を要求し **非対称**。バッジが一度 prerelease になると以後どの版へも一致せず exit 1 に張り付く(前進不能)。
- `patchFile` は `amadeus-version.ts` を先に書込(`:47-51`)→ その後 README バッジで exit 1(`:37-40`)。**version.ts のみ更新された半適用状態**が残り、再実行も恒久的に exit 1(冪等性破綻)。

## 設計: 純粋な validate/plan シーム

テスト専用の分岐・フラグを本番コードに置かない制約(construction guardrail)を守るため、副作用のない純粋関数を別モジュールへ抽出した。

新規モジュール `scripts/release-version-sync-plan.ts`(IO なし・argv/git 副作用なし)がエクスポートする API:

- `VERSION_SURFACES: readonly VersionSurface[]` — パッチ対象(version.ts と README バッジ)の**唯一の定義**。CLI とプランナーが同一定義を消費する(手書き二重定義を排除)。
  - `VersionSurface = { relPath: string; accept: RegExp; replacement: (v: string) => string }`
  - README の `accept` を version 受理 regex と対称化: `/badge\/version-[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?-blue/`(FR-702-1)。
- `planVersionSync(version, contentsByPath, surfaces?) => PlanResult` — 対象版と各ファイルの現内容を受け取り、
  - 全パターンが一致した場合のみ `{ ok: true, entries: PatchPlanEntry[] }`(各ファイルの `next`/`changed` を含む全プラン)を返す。
  - いずれか1つでも不一致(または内容未供給)なら `{ ok: false, relPath, pattern }`(欠落ファイル/パターンを名指しする型付き失敗)を返し、**部分プランは一切返さない**(FR-702-2)。
- 型: `PatchPlanEntry = { relPath; next; changed }`、`PlanResult = {ok:true; entries} | {ok:false; relPath; pattern}`。

CLI `scripts/release-version-sync.ts` は2フェーズ化:
1. 全対象を read(`VERSION_SURFACES` から `contentsByPath` を構築)
2. `planVersionSync` で **全パターンを先に検証**。`!ok` なら書込ゼロで exit 1。
3. `ok` のときのみ、`changed` なエントリを write。
4. 何か書いた場合のみ、既存の再生成テール(`bun scripts/package.ts` + `bun run promote:self`)を**一切変更せず**実行。

これにより半適用状態は構造的に発生不能となる(検証は全対象で書込前に完了)。

## Red-first エビデンス(修正前の実測 exit code)

テストを先にコミット(`test(release): red-first regression tests ...`)し、未修正コードに対して実行:

- `bun test tests/integration/t-release-sync-atomicity.test.ts` → **EXIT=1(RED)**
  - version.ts 有効(一致)+ README バッジ破損(`CORRUPT`、両 regex 不一致)の git fixture に対し `0.2.0-beta.1` を sync。
  - 実測失敗行: `expect(readFileSync(versionPath).equals(versionBefore)).toBe(true)` → `Received: false`。すなわち exit 1 は満たすが **version.ts が書き換わっている**(半適用バグの実証)。
- `bun test tests/unit/t-release-sync-plan.test.ts` → **EXIT=1(RED)**
  - 理由: シーム未実装のため `Cannot find module '../../scripts/release-version-sync-plan.ts'`。
  - in-process シームテスト(prerelease 4遷移 + all-or-nothing)はシーム存在後にのみ実行可能なため、その RED 証跡は上記 CLI レベルの atomicity テストが担う(タスク指示どおり)。
- `bun test tests/unit/t68-version-changelog-sync.test.ts` → **EXIT=0(GREEN)**
  - t68 のバッジ regex を optional prerelease サフィックス対応へ拡張(FR-702-3)。現行 stable(0.1.1)状態では拡張後も一致するため緑を維持。他アサーションは不変。

## 修正後の実測 exit code(GREEN)

- `bun test tests/unit/t-release-sync-plan.test.ts` → EXIT=0(9 pass — 4遷移 stable↔prerelease + 冪等 + all-or-nothing 3種 + canonical surfaces)
- `bun test tests/integration/t-release-sync-atomicity.test.ts` → EXIT=0(1 pass — 失敗時に全対象がバイト同一)
- `bun test tests/unit/t68-version-changelog-sync.test.ts` → EXIT=0(4 pass)
- `bun test tests/unit/gen-coverage-registry.test.ts` → EXIT=0(33 pass)

## 検証コマンド exit code

- `bun run typecheck` → **0**
- `bun run lint`(`tests/ packages/setup/`)→ **0**、加えて変更した `scripts/` 2ファイルの `bunx @biomejs/biome check` → **0**
- `bun run dist:check` → **0**(release-version-sync は dist/self-install に含まれないため差分なし)
- `bun run promote:self:check` → **0**
- `bash tests/run-tests.sh --ci` → **1**、ただし失敗は `t92.test.ts` **1件のみ**(下記の環境要因)。本修正由来の失敗は解消済み。

### `bash tests/run-tests.sh --ci` の残存失敗(本修正と無関係・環境要因)

- 失敗: `tests/integration/t92.test.ts` case 44「tsc non-zero + zero parseable diagnostics -> Note=script-error: exit-2」— 実測 `Received: script-error: exit-1`。
- 根因: 本 isolated worktree には `node_modules` が存在しない(`bun run typecheck`/`lint` は bunx でオンザフライ解決)。t92 の fixture は `#657/#679` で pin された tsc 解決のため `REPO_ROOT/node_modules` を symlink するが、そのリンク先が本 worktree に無いためフォールバック解決となり exit code が変わる。
- 実測補強: 空 glob tsconfig への `bunx tsc` は **exit 2**(`TS18003`)を返す(`BUNX_TSC_EMPTY_GLOB_EXIT=2`)。したがってセンサー側の tsc 解決経路が壊れていることが原因で、tsc 自体の挙動ではない。
- 影響範囲: 変更ファイル(`scripts/release-version-sync*.ts` + テスト3件)は t92 の依存集合と disjoint。CI(GitHub Actions)は `bun install` 実行後に走るため node_modules が存在し t92 は緑になる。**bugfix スコープ外のため本 PR では是正せず、leader へトリアージ報告する。**

### 本修正由来だった失敗と是正(解消済み)

- `tests/unit/gen-coverage-registry.test.ts`「none->cli reclassification set」: 新規の atomicity テストが subprocess を spawn する(cli 機構)ため none→cli の新メンバーとなり、手動ラチェット `EXPECTED_NONE_TO_CLI` に不在で RED 化した。同テストの MAINTENANCE ノートの明示指示どおり `integration/t-release-sync-atomicity.test.ts` を配列へ追加して是正(再実行 33 pass)。純粋な in-process シームテストは spawn しないため none のまま(追加不要)。

## 実 CLI エンドツーエンド健全性(throwaway fixture)

prerelease→prerelease(`0.2.0-beta.1` → `0.2.0-beta.2`)を実 CLI で実行:
- version.ts と README バッジの **両方が書込成功**(いずれも `0.2.0-beta.2` へ前進)。
- CLI EXIT=1 は再生成テール(`scripts/package.ts` が bare fixture に不在)によるもので、**書込完了後**に発生。検証パス→書込→テール失敗の順序を確認。本番コードの緩和は行っていない。

## 変更ファイル(origin/main 比、行数)

- `scripts/release-version-sync-plan.ts` — 新規 +66
- `scripts/release-version-sync.ts` — +43/-24 の差分(2フェーズ化)
- `tests/integration/t-release-sync-atomicity.test.ts` — 新規 +99
- `tests/unit/t-release-sync-plan.test.ts` — 新規 +102
- `tests/unit/t68-version-changelog-sync.test.ts` — バッジ regex 拡張(+8/-2)
- `tests/unit/gen-coverage-registry.test.ts` — ラチェット追記 +1
