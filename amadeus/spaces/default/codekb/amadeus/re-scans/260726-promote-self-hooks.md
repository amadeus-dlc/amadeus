# 再スキャン記録 — 260726-promote-self-hooks（promote-self の kimi hooks managed block 未配線欠陥）

上流入力（consumes 全数）: 本 intent の reverse-engineering ステージ Step 2（Developer スキャン結果）

- Developer スキャン結果 — 区間サマリ（32 コミット、主対象 PR #1522 kimi harness 追加）、`scripts/promote-self.ts` 現状（managedDirs / preserved / apply / promoteSelfMain の file:line）、setup の kimi-hooks 機構（domain/module/cli 配線と再利用 seam、OC-1 契約）、doctor の "kimi managed block" チェック（KIMI_MANAGED_BLOCK_FIX 単一ソース）、テスト既習様式（6 ファイル）、区間内その他の影響候補、本 intent 実装への含意 5 件 — を引き継いだ。**file:line・件数はすべて本 Step 3 で observed `46678234e` に対してスポット再実測し、不一致は下記「上流主張の再実測と訂正」に記録した。**

## メタ

| 項目 | 値 |
| --- | --- |
| Date | `2026-07-26` |
| Base commit | `1c43438df0348fed63c5fe88af46c9417258d4e0`（前 intent `260726-metrics-visualization` の observed） |
| Observed commit | `46678234e1f993047e9c1132216367bf29f4ee71`（= 現 HEAD、`git rev-parse HEAD` 実測。ブランチ `main`） |
| 祖先性 / 距離 | `git merge-base --is-ancestor 1c43438df HEAD` exit **1（非祖先）**。merge-base は `e12259ba78b8c56bf3572c9bfd44a7bdf84d681c`、`git rev-list --count 1c43438df..HEAD` = **32**。前 run の観測点が HEAD 系統に無いため base..HEAD は merge-base 起点の区間として読む（cid:reverse-engineering:rescan-base-ancestry） |
| 区間規模 | **1206 files changed, 213451 insertions(+), 2194 deletions(-)**（`git diff --shortstat 1c43438df HEAD` 転記） |
| Scope | `amadeus-bugfix`、Brownfield、単一 repo `amadeus` |
| 方式 | 差分リフレッシュ（cid:reverse-engineering:c1）。フルスキャン不実施 |
| 測定 ref | 全 file:line・件数は observed `46678234e` の実ファイル直読、および `git diff --numstat` / `git log --oneline` / `grep -n` / `grep -c` / `wc -l` / `git ls-files` 出力からの転記 |

## Focus

promote-self がユーザー級 `~/.kimi-code/config.toml` の kimi hooks managed block を配線しない欠陥の修正。本 scan の主眼は (1) `scripts/promote-self.ts` の現状把握（ユーザー級 I/O の不在）(2) setup の kimi-hooks 機構（`packages/setup/src/domain/kimi-hooks.ts` / `modules/kimi-hooks.ts`）と再利用 seam の同定 (3) doctor の "kimi managed block" チェックと修復アドバイスの単一ソースの同定 (4) テスト既習様式（in-process seam / mkdtemp KimiHome / ports 注入 / fixture 様式）の抽出 の4点。

## 区間サマリ

`git log --oneline 1c43438df..HEAD` 全 32 件の系統分類（実測）:

| 系統 | 件数 | 内訳 |
| --- | --- | --- |
| feat | 3 | `a45b01bd3` feat(harness): add Kimi Code CLI harness (kimi)（[PR #1522](https://github.com/amadeus-dlc/amadeus/pull/1522)）← **主対象**、`8fd9d4138` feat(metrics)（[PR #1504](https://github.com/amadeus-dlc/amadeus/pull/1504)）、`aef8fad20` feat(metrics) ダッシュボード（[PR #1500](https://github.com/amadeus-dlc/amadeus/pull/1500)） |
| fix | 9 | #1532 upstream-sync、#1524 audit shards、#1523 election reportDelivery、#1518 graph dangling symlink、#1517 / #1516 election-model、#1507 benchmark gate、#1508 OpenCode/benchmark、#1499 grants scope-grid |
| refactor | 1 | `071cb2f7b` core tools 重複排除（#1521） |
| docs | 1 | #1513 S13 learnings |
| CI | 1 | #1528 検証ジョブ分割 |
| chore | 14 | metrics snapshot 10 + record sync 4 |
| merge | 3 | Merge branch 'main' |

重点ファイルの区間差分はすべて PR #1522 由来（`git diff --numstat 1c43438df HEAD` 実測）: `scripts/promote-self.ts` **+4/-3**、`packages/setup/src/cli.ts` **+60/-2**、`packages/framework/core/tools/amadeus-utility.ts` **+282/-1**、新規 `packages/setup/src/domain/kimi-hooks.ts` **+401/-0**（401 行）、新規 `packages/setup/src/modules/kimi-hooks.ts` **+234/-0**（234 行）、`packages/framework/core/tools/amadeus-lib.ts` **+98/-8**（#1521 重複排除を含む）、新規 `packages/framework/harness/kimi/**` 一式、`dist/kimi/**` 一式、`.kimi-code/**` 一式（kimi 系3系統の numstat 対象 591 ファイル）。

区間内で `package.json` / `bun.lock` / `scripts/distribution-transaction.ts` / `packages/setup/src/ports/**` の diff は**空**（`git diff --shortstat` / `git diff --numstat` 出力 0 行で機械確認）。

## 重点領域の実測要約

### 重点 1: `scripts/promote-self.ts`（395 行）の現状

- `managedDirs`（`:40-47`）: dist→ルート **6 本**（`dist/kimi/.kimi-code → .kimi-code` は #1522 で追加）。repo ルート相対のみで、ユーザー級 `~/.kimi-code` への言及・I/O はゼロ。`KIMI_CODE_HOME` seam も存在しない。
- `preserved`（`:88-101`）: kimi 系の preserved エントリなし。
- composed scope 保護機構: `COMPOSED_SCOPE_RE` / `SCOPE_GRID_RE`（`:111-112`）、`scopeGridInSync`（`:117`）、`mergeScopeGrid`（`:134`）。
- `apply`（`:312`）: orphan 削除 + `DistributionTransactionCoordinator.apply`（`mirrorProjectionRegistryDigest` 付き）+ `ensureActiveSpaceCursor`。hooks マージに相当するステップは不在。
- `promoteSelfMain(argv, repoRoot, freshness)`（`:338`）: in-process テスト seam。`import.meta.main` ガード（`:395`）あり。
- import 面の先例: `:23` で `../packages/framework/harness/projections.ts` を import 済（scripts→packages 方向の依存は既存）。
- `PACKAGE_HARNESSES`（`:173`）: self-install 対象 **5 面**（claude / codex / cursor / opencode / kimi）。

### 重点 2: setup の kimi-hooks 機構と再利用 seam

- domain `packages/setup/src/domain/kimi-hooks.ts`（401 行、純粋・I/O なし）: export = `MANAGED_BLOCK_BEGIN/END`（`:11-12`）、`checkTomlSyntax`（`:65`）、`renderManagedBlock`（`:82`）、`planMerge`（`:94`）、`applyMerge`（`:129`）、`removeManagedBlock`（`:152`）、型 `MergePlanError`（`:28`）/ `LineSpan`（`:30`）/ `MergePlan`（`:35`）/ `RemovalPlan`（`:43`）。
- module `packages/setup/src/modules/kimi-hooks.ts`（234 行）: export = `resolveKimiHome`（`:29`、`$KIMI_CODE_HOME ?? ~/.kimi-code`）、`kimiConfigPath`（`:33`）、`runHooksMerge`（`:69`）、`runHooksRemoval`（`:98`）、`renderHooksError`（`:133`）、型 `KimiHooksPorts`（`:37`）/ `HooksArgs`（`:57`、`kimiHome?` / `now?` 注入 seam あり）。
  - 契約上の注意（OC-1）: `approve()`（`:155`）は `interactive=false` では書き込まず `not-applied / non-interactive` を返す（`:160`）。書込には `ports.tty.confirm()` の true が必須。promote-self（非対話）から再利用するには auto-confirm の fake tty を ports 注入するか、domain の `planMerge` + `applyMerge` + 独自書込に留めるかの設計判断が要る。バックアップ命名規約と pre-write TOML guard は module 側（`backupConfig` `:203`）にのみ存在。
- 呼び出し元 `packages/setup/src/cli.ts`（413 行）: import `:19`、`createDefaultPorts` `:53`、本体 `wireKimiHooks` `:169`（snippet は payload の `hooks/amadeus-hooks.snippet.toml` を読み、install `:279` / upgrade `:385` の verify 通過後に呼ぶ。not-applied は exit 1）。
- snippet 正本: `packages/framework/harness/kimi/hooks/amadeus-hooks.snippet.toml`（88 行、ADR-4 単一ソース）。**10** `[[hooks]]` + **5** `[[permission.rules]]`（`grep -c` 実測）。shipped コピー: `.kimi-code/hooks/amadeus-hooks.snippet.toml`、`dist/kimi/.kimi-code/hooks/amadeus-hooks.snippet.toml`（いずれも存在確認済）。

### 重点 3: doctor の "kimi managed block" チェック

- 正本は `packages/framework/core/tools/amadeus-utility.ts`（`.kimi-code/tools/amadeus-utility.ts` と byte-identical を `diff -q` で確認済）。
- 実装箇所: `KIMI_MANAGED_BLOCK_BEGIN/END` `:849-850`、`KIMI_MANAGED_GIT_PATTERNS` `:852`、修復アドバイス `KIMI_MANAGED_BLOCK_FIX` `:855-856` — 現状テキスト: 「re-run the installer (`bunx @amadeus-dlc/setup install --target <workspace>`) to merge the managed block, or wire it manually: copy everything between "# >>> amadeus-kimi-hooks >>>" and "# <<< amadeus-kimi-hooks <<<" (inclusive) from .kimi-code/hooks/amadeus-hooks.snippet.toml to the end of the config.toml」。
- `detectKimiManagedBlock` `:902`、`readKimiConfig` `:939`、`kimiManagedBlockDoctorCheck` `:954`（FAIL 経路で fix を付けるのは `:960` config 欠落時と `:994` block 未検出時の2箇所）、`kimiGitResidueDoctorCheck` `:1004`。
- KimiHome 解決: `resolveDoctorContext` `:586`（env `KIMI_CODE_HOME` → `homedir()/.kimi-code`。`:593-597` のコメントが setup の `resolveKimiHome` との規則一致を明記）。
- doctor 配線: harness が `.kimi-code` の分岐 `:1674-1682` で `kimiManagedBlockDoctorCheck` / `kimiGitResidueDoctorCheck` を push（`:1674-1680` のコメントが「no project-level wiring config — the hook wiring lives in the user-level KimiHome config.toml」を明記）。
- マーカー定数は setup domain との意図的複製（ADR-6）、parity テスト（`tests/integration/t-kimi-doctor-arm.test.ts`）が drift guard。

### 重点 4: テスト既習様式（行数は `wc -l` 実測）

- `tests/integration/t-kimi-hooks-merge.test.ts`（452 行）: mkdtemp KimiHome + real fs ports + real snippet master。`runHooksMerge` / `runHooksRemoval` / `resolveKimiHome` を in-process 駆動。auto-confirm の fake TtyIO を ports 注入する様式が既存。
- `tests/unit/setup-kimi-hooks-domain.test.ts`（309 行）: fs 不使用、コンパクト fake snippet で domain 全分岐。
- `tests/integration/t-kimi-doctor-arm.test.ts`（335 行）: `kimiManagedBlockDoctorCheck` を mkdtemp KimiHome に直接駆動、`KIMI_CODE_HOME` env の save/restore、marker parity ピン。
- `tests/e2e/t-print-kimi-doctor.serial.test.ts`（179 行）: `kimi -p` ライブ、`KIMI_CODE_HOME` を tmp home に向け、(b) 状態は `runHooksMerge` を production 経路で適用して seeded config を作る。LIVE GATE `AMADEUS_KIMI_PRINT_LIVE=1`（`:35`）。
- promote-self 系: `tests/unit/t209-promote-self-dangling-symlink.test.ts`（205 行）— `promoteSelfMain(["--apply","--no-build"], fixtureRoot)` を in-process 駆動（`promoteSelfMain` 出現 21 箇所）、fixture は最小 dist ツリー。`tests/unit/t200-promote-self-composed-scope.test.ts`（102 行）— export 関数の純粋テスト。
- `KIMI_CODE_HOME` seam によるテスト可能性: promote-self 側に `HooksArgs.kimiHome` 注入（または env `KIMI_CODE_HOME`）を通せば mkdtemp home で検証可能。domain/module は両方ともその設計済。
- 全テスト冒頭に `// covers:` / `// size:` ヘッダ規約あり（coverage registry 連動）。

### 重点 5: 区間内その他の影響候補

- `packages/framework/harness/kimi/manifest.ts`（98 行、新規 +98/-0）: dist/kimi 構成の定義。snippet が payload に乗る経路。
- `packages/framework/core/tools/amadeus-lib.ts` **+98/-8**（#1521 重複排除を含む）: harness dirs の一元化。
- `.kimi-code/hooks/amadeus-kimi-adapter.ts`（28 行）/ `amadeus-kimi-lib.ts`（352 行）: フック実行本体。
- `docs/guide/harnesses/kimi-code.md`: 手動配線手順と managed block 説明を文書化済（`## Hook wiring` `:44`、version floor `:105`）。doctor fix 文言変更時は整合確認候補。
- `.kimi-code/scopes/amadeus-amadeus-bugfix.md:18`: 自己開発 bugfix scope は build-and-test 境界で `promote:self:check` を要求。
- `package.json:12-13`: `promote:self` / `promote:self:check` スクリプト定義（scripts 全 **15** エントリ）。
- ハーネス登録面の基数: `packages/framework/harness/` = 7 harness dir、`scripts/plugin-projection.ts:46-54` `PACKAGE_HARNESSES` = **7 面**、同 `:60` `SELF_INSTALL_HARNESSES` = **5 面**、`amadeus-harness.ts`（型 `:11` / dir 写像 `:21` / probe `:42` / rules `:60`）、setup `domain/harness.ts:9,:28` / `engine-layout.ts:15`、swarm `HARNESS_VALUES :99-100`（5 値）、`scripts/detect-ci-changes.sh:20`（`.kimi-code/*` を drift 検知対象に含む）。`amadeus-lib.ts` の実ファイル総数は **13**（正本 1 + self-install 5 + dist 7、`git ls-files '*tools/amadeus-lib.ts' | wc -l` 実測）。
- 区間内で `scripts/distribution-transaction.ts`・`packages/setup/src/ports/*` に破壊的変更なし（numstat 出力 0 行）。

## 上流主張の再実測と訂正

| # | 上流スキャンの記述 | 本 scan の実測 | 判定 |
| --- | --- | --- | --- |
| 1 | `scripts/promote-self.ts` の区間差分は **+7/-1** | `git diff --numstat 1c43438df HEAD` で **+4/-3** | **訂正**。本 codekb は numstat 値を採用 |
| 2 | `amadeus-lib.ts` **+98/-1**（#1521 重複排除を含む） | numstat 実測 **+98/-8** | **訂正** |
| 3 | 系統分類: chore **11**（metrics snapshot / record sync） | `git log --oneline` 全 32 件の実数: chore **14**（metrics snapshot 10 + record sync 4）。feat 3 / fix 9 / refactor 1 / docs 1 / CI 1 / merge 3 は一致 | **訂正** |
| 4 | `resolveDoctorContext` `:598` | **`:586`**（`grep -n` 実測） | **訂正** |
| 5 | fix 付与は `:959-960`（config 欠落時）と `:993-994`（block 未検出時） | **`:960`** と **`:994`**（`grep -n 'fix: KIMI_MANAGED_BLOCK_FIX'` 実測） | **訂正** |
| 6 | cli.ts: port 配線 `createDefaultPorts` `:63-69`、本体 `wireKimiHooks` `:157-189`、install `:278-281` / upgrade `:384-387` | `createDefaultPorts` **`:53`**、`wireKimiHooks` **`:169`**、install 呼出 **`:279`** / upgrade 呼出 **`:385`**（`grep -n` 実測） | **訂正** |
| 7 | OC-1: runHooksMerge は interactive=false で not-applied/non-interactive を返す（`:155-161`） | 拒否判定は `approve()` **`:155`**、non-interactive 拒否の return は **`:160`**（`sed` 直読） | **微訂正**（位置の特定を精緻化） |
| 8 | `managedDirs` `:40-47` / `preserved` `:88-101` / `COMPOSED_SCOPE_RE` `:111` / `SCOPE_GRID_RE` `:112` / `scopeGridInSync` `:117` / `mergeScopeGrid` `:134` / `apply` `:312-332` / `promoteSelfMain` `:338-391` / `import.meta.main` `:395` / projections import `:23` | `grep -n` / `sed` で全数一致（`apply` は非 export の `function apply` `:312`） | **一致（追認）** |
| 9 | domain: `MANAGED_BLOCK_BEGIN/END` `:11-12` / `checkTomlSyntax` `:65` / `renderManagedBlock` `:82` / `planMerge` `:94` / `applyMerge` `:129` / `removeManagedBlock` `:152` | `grep -n` で全数一致 | **一致（追認）** |
| 10 | module: `resolveKimiHome` `:29` / `kimiConfigPath` `:33` / `runHooksMerge` `:69` / `runHooksRemoval` `:98` / `renderHooksError` `:133` / `KimiHooksPorts` `:37` / `HooksArgs` `:57` | `grep -n` で全数一致（`KimiHooksPorts` / `HooksArgs` は `export type`） | **一致（追認）** |
| 11 | snippet 正本 88 行、10 `[[hooks]]` + 5 `[[permission.rules]]`、shipped コピー2件 | `wc -l` = **88**、`grep -c` = **10** / **5**、2 コピーとも存在確認 | **一致（追認）** |
| 12 | doctor 正本は `.kimi-code/tools/amadeus-utility.ts` と byte-identical、主要行 `:849-850` / `:852` / `:855-856` / `:902` / `:939-940` / `:954` / `:1004` / `:1674-1682` | `diff -q` で IDENTICAL、`grep -n` で全数一致 | **一致（追認）** |
| 13 | テスト行数: t-kimi-hooks-merge 452 / setup-kimi-hooks-domain 309 / t-kimi-doctor-arm 335 / t-print-kimi-doctor 179 | `wc -l` で全数一致（t209 = 205 行 / t200 = 102 行も計測） | **一致（追認）** |
| 14 | merge-base `--is-ancestor` → 否、merge-base `e12259ba78`、`base..HEAD` = 32 コミット、1206 ファイル変更 | 全コマンド再実行で一致（shortstat は 1206 files / 213451 insertions / 2194 deletions） | **一致（追認）** |

## センサー不適用と代替検証

RE ステージが宣言する3センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**のため発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わない。**

代替検証として以下2点を実施した。

1. **H2 構成の機械確認**: 更新した全成果物（本ファイルを含む10件）に `grep -c '^## '` を実行し、いずれも **2 以上**であることを確認した。結果は本 intent の最終報告に表として記載。
2. **上流入力参照の直接検証**: Developer スキャン結果が主張する file:line・件数を observed `46678234e` に対してスポット再実測し、14項目中 **6件の訂正と1件の微訂正**を検出した（上表参照）。訂正はすべて更新成果物本文へ反映済み。

## Delivery boundary

本 scan は **codekb 9成果物 + 本 re-scan 記録**の更新のみを成果物とする。実装コード・intent record・state・audit・生成配布物・git 操作はいずれも未実施。修正方式（再利用 seam の選択: `runHooksMerge` ports 注入か domain 直利用か、doctor fix 文言の一本化/コンテキスト分岐、マージの `--apply` 常時実行かフラグ制か、`promote:self:check` の検査範囲）は後続の requirements-analysis 以降で裁定する。
