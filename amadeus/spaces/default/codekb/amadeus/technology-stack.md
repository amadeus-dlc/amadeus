# 技術スタック

## オープンバグ3件の技術断面（260730-open-bug-batch-3、現在、observed `3f73823b1`）

技術選定に変更はない。Bun-only の TypeScript/ESM モノレポで、常駐 service・database・application server を持たず、外部境界は CLI・Shell・Git/GitHub・OTLP のままである。本 intent（#1773 / #1772 / #1752）は既存スタックだけで修正し、新規 runtime / development dependency を導入しない（区間内の `package.json` 依存変化も 0）。

**構成カウント（測定 ref: observed `3f73823b1`。すべて `ls` / `git ls-files` / `git ls-tree` 出力からの転記 — `cid:requirements-analysis:numbers-from-command-output-only`）**

| 面 | 実測値 | 測定コマンド | 区間の変化 |
| --- | --- | --- | --- |
| core tools トップレベル `*.ts` | `88` | `ls packages/framework/core/tools/*.ts \| wc -l` | base `a38a1f4d3` は `79`（`git ls-tree -r --name-only a38a1f4d3 packages/framework/core/tools/ \| grep -c '^packages/framework/core/tools/[^/]*\.ts$'`）。**新規9件** |
| core sensors | `7` | `ls packages/framework/core/sensors/*.md \| wc -l` | 変化なし |
| core hooks | `12` | `ls packages/framework/core/hooks/*.ts \| wc -l` | 変化なし |
| core scopes | `10` | `ls packages/framework/core/scopes/*.md \| wc -l` | 変化なし |
| tracked な `ledger.json` | `183` | `git ls-files \| grep -c 'ledger\.json'` | #1773 の git 露出面の規模。選挙ディレクトリは非 ignore（`git check-ignore` exit 1） |

**本 intent が交差するスタック面**

- **選挙層は core tools 内で閉じている（#1773 / #1772）**: 患部は `amadeus-election-store.ts`（格納）と `amadeus-election-model.ts`（型 / parse / view / tally）で、いずれも `packages/framework/core/tools/` 配下。core 正本の変更となるため 7 dist + 5 self-install の再生成対象（`cid:build-and-test:bt-dist-regen-seven-harnesses`）。運用面の `skills/amadeus-election/SKILL.md` は harness ごとの authored ファイルではなく core からの投影である点が SKILL.md 系の患部（前 intent #1736）と異なる。
- **`.gitignore` が修正面候補になりうる（#1773）**: 選挙 ledger を version control 面から外す方式を採る場合、tracked な 183件の扱い（履歴からの除去 vs 以後の非追跡）が設計判断になる。`packages/framework/core/` の外側を触る唯一の候補面である。
- **engine 層は単一ファイル（#1752）**: `amadeus-orchestrate.ts` の `:4219-4278` のみ。同ファイルは本区間で `unitDirsUnderConstruction`（`:3054`）と初回 create 分岐（`:486-500`）の追加を受けており、**行番号が base から大きくシフトしている** — Issue 起票時点の行引用を HEAD で照合しない（`cid:reverse-engineering:upstream-cite-reresolve-on-shift`）。
- **テスト採番の衝突帯**: 本区間で `t366` / `t367` / `t368` に番号重複が生じている（各3 / 2 / 3ファイル）。新規テストの採番は `t371` より後を使う（詳細は `code-structure.md` の対応節）。

**区間で導入された技術面（本 intent の患部外）**

- **GitHub 連携層の一般化**: mirror 専用だった GitHub 呼出を `amadeus-github-gateway.ts`（+953）へ抽出し、`gh` の spawn を `amadeus-process-runner.ts`（+306）という**単一の不純エッジ**へ集約。階層設定は `amadeus-layered-config.ts`（+610）が global → space → intent の順で解決する（`:48` `auto-mirror` / `:50` `auto-solo-election` / `:51` `auto-file-findings`）。
- **CI 面**: `metrics-maintenance.yml` 新設と `ci.yml` 更新（`.github/` は 2ファイル `+74 / -31`）。メトリクス公開は `scripts/metrics-publication{,-domain,-github}.ts`（`scripts/` 全体で `+1492 / -19`）。

## オープンバグ5件の技術断面（260730-open-bug-batch-2、履歴、observed `c42ef4d77`）

**判断: 実質更新なし。** 区間 `8b8016f62..c42ef4d77`（12コミット）で core tools・sensors・hooks・scopes のいずれも件数変化がなく、ランタイム・依存・ツールチェーンの構成も不変。5件のバグはすべて既存構成内の欠陥であり、技術スタックの断面としては直前節（`260730-skill-reviewer-fixes`、observed `278d61d8e`）の記述がそのまま有効である。区間の変化は `amadeus-orchestrate.ts` への関数追加（#1760）・SKILL.md の文言修正（#1753）・`scripts/formal-verif/` の parse 修正（#1745）に留まる。

## SKILL/reviewer 2件の技術断面（260730-skill-reviewer-fixes、履歴、observed `278d61d8e`）

技術選定に変更はない。Bun-only の TypeScript/ESM モノレポで、常駐 service・database・application server を持たず、外部境界は CLI・Shell・Git/GitHub・OTLP のままである。本 intent（#1736 / #1711）は既存スタックだけで修正し、新規 runtime / development dependency を導入しない。

**構成カウント（測定 ref: observed `278d61d8e`。すべて `ls` / `git ls-files` / `git ls-tree` 出力からの転記）**

| 面 | 実測値 | 測定コマンド | 区間の変化 |
| --- | --- | --- | --- |
| core tools トップレベル `*.ts` | `79` | `ls packages/framework/core/tools/*.ts \| wc -l` | base `22ee27dbe` は `76`（`git ls-tree -r --name-only 22ee27dbe packages/framework/core/tools/ \| grep -c '^packages/framework/core/tools/[^/]*\.ts$'`）。新規3件 |
| core sensors | `7` | `ls packages/framework/core/sensors/*.md \| wc -l` | base は `6`（`git ls-tree -r --name-only 22ee27dbe packages/framework/core/sensors \| wc -l`）。`amadeus-self-scope-consistency.md` 新設 |
| core hooks | `12` | `ls packages/framework/core/hooks/*.ts \| wc -l` | 変化なし |
| core scopes | `10` | `ls packages/framework/core/scopes/*.md \| wc -l` | 件数は不変だが `amadeus-bugfix.md` → `amadeus-fix.md` へ改名（#1683 `dd8532d1c`）。現行10件は `chore` / `enterprise` / `feature` / `fix` / `infra` / `mvp` / `poc` / `refactor` / `security-patch` / `workshop` |
| `self-*` スコープファイル（tracked） | `20` | `git ls-files \| grep -c "scopes/amadeus-self-"` | 4スコープ（`self-document` / `self-feature` / `self-fix` / `self-refactor`）× dogfood 5ハーネス自己インストール面（`.claude` / `.agents` / `.cursor` / `.opencode` / `.kimi-code`）。**core・dist には出荷されない** |

`self-*` の4スコープは自己開発専用であり、`packages/framework/core/scopes/` にも `dist/<harness>/` にも存在しない。したがって配布物の利用者から見えるスコープ集合は上表の10件で、`self-*` はこのリポジトリの dogfood 面のみに存在する非出荷面である。

**本 intent が交差するスタック面**

- **13コピー同期境界（#1736）**: 患部は `packages/framework/harness/<name>/skills/amadeus/SKILL.md` で、core からの投影ではなく harness ごとに authored された独立ファイルである。`packages/framework/harness/claude/manifest.ts:73` の `{ src: "skills/amadeus/SKILL.md", dst: "skills/amadeus/SKILL.md" },` を `scripts/package.ts:396` の `for (const { src, dst, projectRoot } of m.harnessFiles) {` が `dist/<name>/<harnessDir>/<dst>` へコピーする。正本5面（claude / codex / kimi / kiro / kiro-ide）を個別編集 → `bun scripts/package.ts` で dist 7ハーネス再生成 → `bun run promote:self` の3段が必須（`cid:build-and-test:bt-dist-regen-seven-harnesses`）。
- **`self-fix` スコープ自体が #1711 の直撃経路**: `.claude/tools/data/scope-grid.json` の実測で `self-fix.stages` は `units-generation` = `SKIP` / `code-generation` = `EXECUTE`。加えて `self-fix` は `packages/framework/core/tools/amadeus-lib.ts:4032` の `SKELETON_OFF_SCOPES` に含まれ（判定は `:4069` `if (SKELETON_OFF_SCOPES.has(scope)) return false;`）skeleton-gate も通らない。本 intent は自身が患部経路を走る当事者である。
- **新規 core tool 3件（区間追加、いずれも本 intent の患部ではない）**: `amadeus-caller-authorization.ts`（122行、Kimi subagent role の state 変更拒否層）、`amadeus-sensor-self-scope-consistency.ts`（231行、上記センサーの実装）、`amadeus-workflow-completion.ts`（110行、ワークフロー完了の2相化）。

## Open bug 6件の技術断面（260729-open-bug-batch、履歴、observed `22ee27dbe`）

技術選定は Bun-only の TypeScript/ESM モノレポである。常駐 service、database、application server はなく、短命 CLI・Shell・Git/GitHub・OTLP が外部境界となる。本 intent は既存スタックだけで修正し、新規 runtime/development dependency を導入しない。

| 項目 | 現行値 / 技術 | 本 intent との関係 |
| --- | --- | --- |
| Runtime | Bun `1.3.13` 以上 | test runner、core CLI、safety-wait child、setup build |
| Language | TypeScript `^6.0.3`、ESM | #1662 / #1664 / #1607 の正本 |
| Shell | POSIX Shell / Bash、git worktree | #1336 / #1663、book-pack verifier |
| Lint / format | Biome `2.5.5`、formatter 無効 | `bun run lint` |
| Property test | fast-check `^4.9.0` | 既存テスト依存。追加不要 |
| Agent integration | `@anthropic-ai/claude-agent-sdk` `0.3.158` | 本 intent の直接対象外 |
| Release | release-it `^20.2.1`、setup `0.1.6` | 本 intent では version bump しない |
| Test runner | `bun:test` + `tests/run-tests.ts` | smoke 15 / unit 323 / integration 314 / e2e 85、合計739 |
| Coverage | Bun coverage → LCOV → project/patch gates | #1662 の source snapshot identity |
| Distribution | core → `scripts/package.ts` → 7 dist、core → `promote-self.ts` → 5 self-install | #1336 / #1663 / #1607、および製品根因が core にある場合の #1664 |

### 区間のスタック変化

`ca8ff0af4..22ee27dbe` で `packages/setup` は `engines.bun >=1.3.13` と `bun build --target=bun` を明示し、テスト・CI 文書も `tests/run-tests.ts` を正準 runner とする Bun-only 契約へ統一された。ルート依存は Bun types、TypeScript、Biome、fast-check、Agent SDK、release-it の既存集合で、6件の修正に追加ライブラリは不要である。

## Slop cleanup の技術断面（260728-slop-cleanup、履歴、observed `ca8ff0af4`）

技術選定に変更はない。現行は Bun `1.3.13`、TypeScript `6.0.3`、Biome `2.5.5`、TypeScript/ESM の CLI フレームワークで、HTTP server と database を持たない。外部境界は CLI、GitHub、OTLP/HTTP JSON。framework core は 66 tools、12 hooks、38 stage/protocol、14 persona、60 knowledge、10 scopes、6 sensors、7 packaged skills、7 harness 面で構成される。setup npm package は `0.1.6`。今回、新規 runtime / development dependency は追加しない。直後の `260727-plugin-verb-skills` 断面は履歴として保持する。

### 履歴: 260727-plugin-verb-skills

> **2026-07-28（intent `260727-plugin-verb-skills`、amadeus-feature / Brownfield）: 技術スタックに変化なし。区間で **v0.1.6** がリリースされ、e2e 層が初めて plugin 面の blocking CI に載った（測定 ref: observed `afb93a825`、base `0c4709102`（祖先 exit 0）、距離 **16**）。** **フレームワーク版は `packages/framework/core/tools/amadeus-version.ts:4` `export const AMADEUS_VERSION = "0.1.6";`**（区間の `68f2d6699` `chore(release): v0.1.6` で bump。バージョン面の同期は release.yml の workflow_dispatch → release-it が機械実行する既存契約のとおり）。ランタイム（Bun / TypeScript ESM）・lint（Biome）・型検査（`tsc --noEmit`）・テストランナー（`tests/run-tests.ts` の smoke / unit / integration / e2e 4 層）に区間の変化はなく、新規ランタイム依存の追加もない。本 intent が交差するスタック面: (a) **e2e プロファイルと CI の関係が変わった** — `test:ci`（smoke+unit+integration）は不変のまま、`.github/workflows/ci.yml:146` に専用ジョブ `plugin-conformance-e2e` が新設され `:165` で `bun test tests/e2e/t341-plugin-conformance-journey.serial.test.ts` を**ファイル名直指定**で実行する。ubuntu-latest / bun 1.3.13 / `timeout-minutes: 10` / オフライン（env ゲート・live model なし）で、集約ゲートの必須依存（`:678` / `:704`）。**e2e tier の他のテストは依然として PR で走らない**点は不変。 (b) **2 段 recompile が spawn 前提を持つ** — `spawnRecompile:253-263` が `bun <THIS_DIR>/amadeus-graph.ts compile` → `bun <THIS_DIR>/amadeus-runtime.ts compile` を順に `spawnSync`（`env: process.env` 明示、cid:code-generation:bun-spawn-env-snapshot の様式）。 (c) **7 ハーネス dist + 5 面 self-install の再生成** — `core/tools/` / `core/hooks/` / `core/skills/` を触る変更で必須（cid:build-and-test:bt-dist-regen-seven-harnesses）。区間の `dist/*` 各 7 ファイル / `.*/tools` 各 4 ファイルの変更がその実測。`scripts/` のみの変更（#1575 の是正）は dist に現れない。 (d) **スキル配布の技術境界** — 正本 `core/skills/` は面ごとに異なる 3 系統（共有ヘルパ `harness/projections.ts:300` / manifest 直書き / codex の `emit.ts:338-345`）で投影され、投影先も `<harnessDir>/skills/`（claude・kimi）/ `<project>/.agents/skills/`（codex）/ `.cursor/commands/`（cursor）と分かれる。詳細は `architecture.md` / `code-quality-assessment.md` の同 intent 節。

> **2026-07-27（intent `260727-e2e-plugin-conformance`、Issue #1575 / #1585 / #1586 / #1589、Brownfield）: 技術スタックに変化なし。ただし本 intent は「未使用のテスト層（e2e）」を初めて plugin 面へ適用する（測定 ref: observed `0c4709102`、base `1673c433`（祖先 exit 0）、距離 **60**）。** ランタイム（Bun / TypeScript ESM）・lint（Biome）・型検査（`tsc --noEmit`）・テストランナー（`tests/run-tests.ts` の smoke / unit / integration / e2e 4 層）に区間の変化はなく、4 Issue の修正も新規技術を導入しない。本 intent が交差するスタック面は既存要素のみ: (a) **4 層ランナーの e2e プロファイル** — `tests/run-tests.ts:71` `type Level = "smoke" | "unit" | "integration" | "e2e";`、`:125` `--ci` = smoke+unit+integration、`:126` `--release` = +e2e、`:888` verbatim `const serial = pinnedSerial || basename(file).includes(".serial.");`。**CI（`.github/workflows/ci.yml:163` = `bun run test:ci -- -P 4`）は `--ci` のみを呼び、e2e は既定で一切走らない**（`grep -n "run-tests\|--release\|--e2e" .github/workflows/*.yml` のヒットは `:163` のみ）。 (b) **e2e の既存駆動技術** — node-pty / @xterm/headless（TUI 系）、ハーネス CLI の headless print 面（`kimi -p`、live gate 付き）、`bun --preload` による fetch shim を用いたオフライン E2E（`tests/lib/setup-fetch-shim.ts`）。 (c) **7 ハーネス dist 再生成**（`bun scripts/package.ts` + `bun run promote:self`）— #1585 / #1586 は `packages/framework/core/tools/` 変更のため必須（cid:build-and-test:bt-dist-regen-seven-harnesses）。#1575 は `scripts/` のみで dist 影響なし。新規ランタイム依存なし。詳細は `code-quality-assessment.md` / `component-inventory.md` の同 intent 節。

> **2026-07-27（intent `260727-install-doc-mismatch`、[Issue #1569](https://github.com/amadeus-dlc/amadeus/issues/1569)、amadeus-bugfix / Brownfield）: 技術スタックに変化なし、確認済み（測定 ref: observed `46a75f2e7c53aaa475a19cc217d10c9172ad4129`、base `0d83aa48b`、距離 70）。** ランタイム（Bun / TypeScript ESM）・lint（Biome）・型検査（`tsc --noEmit`）・テストランナー（`tests/run-tests.sh`）に区間の変化はなく、#1569 の修正も新規技術を導入しない。本区間で着地した plugin ホスト配信の投影・ガード技法は既存スタック内 — `scripts/plugin-projection.ts` のバイト投影と `scripts/package.ts:832` `checkPluginProjections` のバイト比較ドリフトガードは、既存の dist ドリフトガード（`dist:check` / `promote:self:check`）と同じ機構である。ただし docs prose（`19-plugins.md` / `.ja.md`）はこのガードの技術的射程外にあり、doc 側の一致は grep ベースの別検査に委ねられる。詳細は `code-quality-assessment.md` の同 intent 節。

> **2026-07-27（intent `260727-docs-impl-sync`、amadeus-document / Brownfield）: ランタイム・ビルド・テスト基盤の選定に変化なし。ただし配布ハーネス面が 6 → 7 に拡張。** 測定 ref: observed `aabc0527d`、base `1673c4332`（祖先 exit 0 / 距離 **47**）。TypeScript/ESM + Bun 直接実行、Biome lint、`tsc --noEmit`、`tests/run-tests.sh` 4 層という技術選定は不変。区間で変わったのは**配布面の広がり**である: (a) **ハーネス面 7**（`ls -d packages/framework/harness/*/ | wc -l` — claude / codex / cursor / kimi / kiro / kiro-ide / opencode。Kimi Code CLI が #1522 で追加、Bun 実行の hook アダプタ `amadeus-kimi-lib.ts` +352 / `amadeus-kimi-adapter.ts` +28 + TOML hook スニペット `amadeus-hooks.snippet.toml` +88 という既習の表層様式に従う）。 (b) **投影行列 7/5**（`scripts/plugin-projection.ts:41-49` `PACKAGE_HARNESSES`=7 / `:55` `SELF_INSTALL_HARNESSES`=5。base 断面は 6/4）。 (c) **hook 12**（`ls packages/framework/core/hooks/ | wc -l`。12 番目 `amadeus-plugin-compose.ts` は SessionStart で plugin CLI を呼ぶ）。 (d) **生成物規模**: dist 444 + セルフインストール 5 面 832 ファイル、正本コード 49 に対する増幅。 (e) CI は job 分割（changes / typecheck / lint / distribution-contract / tests / drift-check / distribution-benchmark ×3 / coverage ×3 / metrics-snapshot / formal-model-check / ci-success）。**docs 側はこれら 3 数値（7 / 7-5 / 12）を手書きで複製しており追随していない** — 技術スタック上の含意は「docs 面に dist:check / promote:self:check 相当のドリフトガードが存在しない」ことである。詳細は `code-quality-assessment.md` / `architecture.md` の同 intent 節、`re-scans/260727-docs-impl-sync.md`。

> **2026-07-27（intent `260726-answer-manual-binding`、[Issue #1548](https://github.com/amadeus-dlc/amadeus/issues/1548) bug、amadeus-bugfix / Brownfield）: 本 intent 断面は対象外（技術スタックに変化なし）。** 測定 ref: observed `ad1ff5de9`、base `09c669901`、距離 2。区間 2 コミットは record-only で mirror answer/guard スタックの source 変更ゼロ。#1548 は TypeScript/Bun 上の既存 mirror lifecycle ロジックの欠陥（answer 転送 `amadeus-mirror-lifecycle.ts:969-985` + guard `:257-265`）で、ランタイム・ビルド・テスト基盤・配布経路の技術選定に変化はない。詳細は上流入力 `re3-dev-scan-result.md` と本 scan の `architecture.md` / `code-quality-assessment.md` 新節、`re-scans/260726-answer-manual-binding.md`。

> **2026-07-27（intent `260726-t258-p95-flake`、[Issue #1511](https://github.com/amadeus-dlc/amadeus/issues/1511) bug/P2/S3-MAJOR、amadeus-bugfix / Brownfield）: スタック構成に変化なし。** 測定 ref: observed `09c669901`、base `f9a0fb86a`、距離 2。区間 32 ファイルはすべて `amadeus/` record で `package.json` / `bun.lock` の変更なし。#1511 が交差するスタック面はいずれも既存 — Bun test ランナー（`bun tests/run-tests.ts --ci`、`package.json:19`）、CI の並列度 `-P 4`（`.github/workflows/ci.yml:163`）、`spawnSync` child benchmark、`performance.now()` 実測。修正候補の同型先例（`plugin-discovery-overhead-gate.ts` #1525 / `mirror-distribution-benchmark-aggregate.ts` #1507）も既存スタック内。新規ランタイム依存なし。詳細は上流入力 `re2-dev-scan-result.md` と本 scan の `code-quality-assessment.md` / `architecture.md` 新節、`re-scans/260726-t258-p95-flake.md`。

> **2026-07-26（intent `260726-mirror-state-split`、[Issue #1547](https://github.com/amadeus-dlc/amadeus/issues/1547) + [Issue #1534](https://github.com/amadeus-dlc/amadeus/issues/1534)、amadeus-bugfix / Brownfield）: スタック構成に変化なし（測定 ref: observed `f9a0fb86a`、base `1673c4332`、距離 38）。** 区間で `package.json` / `bun.lock` の変更はなく、TypeScript / ESM / Bun 直接実行・Biome lint・`tsc --noEmit`・`tests/run-tests.sh` の4層ランナーという構成は不変。本 intent が交差するスタック面は (a) mirror スタック正本（`packages/framework/core/tools/amadeus-mirror-*.ts` 8 モジュール）× self-install 5 面 + dist 7 面 = 各 **13 コピー**の増幅（`bun run promote:self` / `bun scripts/package.ts` の再生成が必須、`.kimi-code` は [PR #1522](https://github.com/amadeus-dlc/amadeus/pull/1522) で追加された 5 番目の self-install 面）(b) record 内部の状態表現契約（v1 sentinel ブロック codec vs legacy Markdown field の `getField`/`setOrInsertField` 機構）で、いずれも既存スタック。新規ランタイム依存なし。詳細は上流入力 `inception/reverse-engineering/scan-notes.md`。

> **2026-07-26（intent `260726-plugin-host-delivery`、amadeus-feature / Brownfield）260726-plugin-host-delivery 差分リフレッシュ: ルート依存変更なし・CI workflow に変化あり（測定 ref: observed `0d83aa48b886fe85cd977569c0e7b3015b84d3e5`、base `1673c4332`、距離 43）。** `git diff --name-only 1673c4332..HEAD -- package.json bun.lock` は**出力 0 件** — ランタイム（Bun / TypeScript ESM）・lint（Biome）・型検査（`tsc --noEmit`）・テストランナー（`tests/run-tests.sh`）の構成は不変で、新規外部パッケージもゼロ（Kimi ハーネス [PR #1522](https://github.com/amadeus-dlc/amadeus/pull/1522) も metrics 可視化 [PR #1500](https://github.com/amadeus-dlc/amadeus/pull/1500)/[PR #1504](https://github.com/amadeus-dlc/amadeus/pull/1504) も既存スタックで完結）。**CI workflow は変化**（`.github/workflows/ci.yml`、[PR #1528](https://github.com/amadeus-dlc/amadeus/pull/1528) ほか、diff 直読）: 検証ジョブ分割（「Lint and complexity」等）、**Complexity gate（CCN baseline ratchet）の移設**、**lizard の `pip install lizard==1.23.0` pin**、metrics の **render**（`bun scripts/metrics-visualize.ts --write`）と **drift-check** ジョブの追加。ハーネス面では Kimi Code CLI（token `.kimi-code`、hooks は `~/.kimi-code/config.toml` の marker-fenced managed block、TOML）が第7ディストリ面・self-install 第5面として加わった。
> **2026-07-26（intent `260726-mirror-envelope-lf`、[Issue #1498](https://github.com/amadeus-dlc/amadeus/issues/1498) P1/S2、amadeus-bugfix / Brownfield）: スタック構成に変化なし。外部 CLI `gh 2.96.0` の実出力形式を本 scan で初めて実測（測定 ref: observed `e39402224`、base `1673c4332`、距離 27）。** 区間で `package.json` / `bun.lock` の変更はなく、TypeScript / ESM / Bun 直接実行・Biome lint・`tsc --noEmit`・`tests/run-tests.sh` の4層ランナーという構成は不変。本 scan で追加された技術面の事実は 1 点 — **`gh version 2.96.0 (nixpkgs)`（`gh --version` 出力）の `--include` はステータス行のみ LF 終端、ヘッダ行は CRLF、EOF に末尾 LF なし**（`head -c 18 | od -c` および captured bytes の直読による実測）。`--paginate --slurp` の stdout は `'[' <HTTPブロック> <ページ配列> ( '\n' ',' … )* ']'` の interleave 文法。この実測は `.claude/tools/` 等の配布ツールが依存する外部 seam の一次記録であり、以後の gateway 実装・fixture の正本となる。CI 面では区間で検証ジョブが分割された（[PR #1528](https://github.com/amadeus-dlc/amadeus/pull/1528)）。詳細は上流入力 `inception/reverse-engineering/scan-notes.md`。

> **2026-07-26（intent `260726-crossreviewed-bug-batch`、クロスレビュー済みバグ7件、amadeus-bugfix / Brownfield）: 技術スタックに変化なし（測定 ref: observed `1673c4332`、base `e12259ba7`、距離 2）。** 区間で `package.json` / `bun.lock` の変更はなく、ランタイム（Bun / TypeScript ESM）・lint（Biome）・型検査（`tsc --noEmit`）・テストランナー（`tests/run-tests.sh`）の構成はいずれも既報のまま。本 intent が交差するスタック面は (a) core 正本 8 ファイル × dist 6 + self-install 4 の増幅（6件が該当、`bun scripts/package.ts` / `bun run promote:self` の再生成が必須）(b) `scripts/` の CI ベンチマークスクリプトと `.github/workflows/ci.yml` の集約ジョブ配線（#1489 のみ、配布対象外）(c) `team-up.sh` の bash + 外部 seam（agmsg / codex、#1388）。詳細は上流入力 `inception/reverse-engineering/scan-notes.md`。

> **2026-07-26（intent `260726-metrics-visualization`、amadeus-feature / Standard）: 変更なし、確認済み（測定 ref: observed `1c43438df`、base `11f1ad61f`、距離 5）。** 区間内でビルド／テスト構成・依存（`package.json` / `bun.lock` / `tsconfig` / `biome` / `scripts/` / `run-tests.sh` / `.github/`）の diff はいずれも空。交差要素は TypeScript/Bun（`scripts/metrics-*.ts` の3モジュール、Bun test の unit/integration 2層）+ GitHub Actions（`ci.yml` の `metrics-snapshot` job `:398-`）+ `gh` CLI（スナップショット公開 PR、`:470` / `:475`）で、いずれも既存スタック。
>
> **可視化の技術前提（本 scan で確定）**: (1) **依存追加ゼロ** — repo 内にチャートライブラリの前例は 0 件であり、`package.json` の全 15 scripts エントリにも metrics 系は 0。可視化は既存スタック（TypeScript + Bun、標準ライブラリのみ）で完結させる方向が既習様式と整合する。 (2) **inline SVG 方針** — repo 唯一の HTML 生成先例 `tests/run-tests.ts:573` `writeCoverageHtml` は「テンプレートリテラル直書きの自己完結 HTML + `coverageHtmlEscape` `:526` + 生成物を読み返す assert」であり、外部アセット・CDN 参照を持たない。inline SVG はこの様式の自然な延長で、新規ランタイム依存を持ち込まずに済む。
> **2026-07-26（intent `260726-grant-scope-gate`、[#1497](https://github.com/amadeus-dlc/amadeus/issues/1497)、amadeus-bugfix / Brownfield）: 変更なし、確認済み（測定 ref: observed `e12259ba7`、base `11f1ad61f`、距離 4）。** 新規ランタイム依存なし。交差要素は TypeScript/Bun（`amadeus-lib.ts` / 新設 `amadeus-grant-authorization.ts` 876 行・`amadeus-presence-reservation.ts` 512 行、Bun test の unit / integration 層）+ JSON データファイル（`tools/data/stage-graph.json` 32 stages・`scope-grid.json` 15 scope キー、`scripts/package.ts:146` の `COMPILED_DATA`）+ 既存の配布同期機構（dist 6 面 / self-install 4 面、`dist:check` / `promote:self:check`）で、いずれも既存スタック。区間内で `package.json` / `bun.lock` / `tsconfig` / `biome` の diff は空。

> **2026-07-26（intent `260725-worktree-ref-fixes`、[#1482](https://github.com/amadeus-dlc/amadeus/issues/1482) / [#1481](https://github.com/amadeus-dlc/amadeus/issues/1481) / [#1455](https://github.com/amadeus-dlc/amadeus/issues/1455)、amadeus-bugfix / Minimal）: 変更なし、確認済み（測定 ref: observed `11f1ad61f`、base `ec624022f`、距離 10）。** 交差要素は TypeScript/Bun（`amadeus-lib.ts` の解決関数、core hooks、Bun test の integration 層）+ git（worktree の `--git-dir` / `--git-common-dir`、loose ref / `packed-refs` レイアウト）+ Claude Code の hook 起動環境（`CLAUDE_PROJECT_DIR`、EnterWorktree の cwd 切替）で、いずれも既存スタック。新規ランタイム依存なし。**#1481 の修正は Node/Bun の FS API 直読から git サブプロセス呼び出しへの置換であり、これも既存様式（`amadeus-lib.ts:4131` `resolveMainCheckout`）の再利用に閉じる。** 区間内でビルド／テスト構成・依存（`package.json` / `bun.lock` / `tsconfig` / `biome` / `scripts/` / `run-tests.sh` / `.github/`）の diff はいずれも空。

> **2026-07-25（intent `260725-teamup-launch-hardening`、[#1476](https://github.com/amadeus-dlc/amadeus/issues/1476) / [#1478](https://github.com/amadeus-dlc/amadeus/issues/1478)、amadeus-feature / Standard）: 変更なし、確認済み（測定 ref: observed `4a0f91ad0`、base `ec624022f`、距離 9）。** 交差要素は bash（`team-up.sh` 制御フロー）+ git（`worktree add`）+ herdr（pane/agent 操作）+ 外部 agmsg スキル（watch / delivery / spawn / actas-lock / claude-code ドライバ）+ Bun test（integration 層）で、いずれも既存スタック。新規ランタイム依存なし。**U2 の並列化は bash のジョブ制御（`&` / `wait`）で賄える範囲**であり、外部の並列化ユーティリティ導入は要さない。

> **2026-07-25（intent `260725-teamup-attach-latency`、[#1449](https://github.com/amadeus-dlc/amadeus/issues/1449)、amadeus-bugfix / Minimal）: 変更なし、確認済み（測定 ref: observed `ec624022f`、base `6d4df9056`、距離 125）。** 交差要素は bash（`team-up.sh` 制御フロー）+ herdr（pane/agent 操作）+ 外部 agmsg スキル（watch / delivery / spawn / actas-lock）で、いずれも既存スタック。新規ランタイム依存なし。

## Issue #1466 solo standing grant（260725-solo-standing-grants、2026-07-25、履歴）

base `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`、observed `4491310cc0b432eb404524ef30a7d8a0a3f68f73`。[Issue #1466](https://github.com/amadeus-dlc/amadeus/issues/1466)。[PR #1468](https://github.com/amadeus-dlc/amadeus/pull/1468) は凍結試作で参考のみ、実装前提にしない。

現行は Bun / strict TypeScript ESM / Biome、CLI / JSON directive / Markdown state + append-only audit / filesystem lock が境界で、HTTP・DB はない。canonical core と6 harness overlay を `scripts/package.ts` が open-set discovery し、`--check` が `MISSING` / `DIFFERS` / `ORPHAN` を byte 比較する。standing grant は audit-derived のままとし、新規 storage / service / dependency は不要である。

## 品質・配布への含意

route / commit race は file-backed TOCTOU として lock 内再検証と決定的 ID 相関で扱う。規模は core 53 TypeScript / 48,990 LOC、tests 655 TypeScript。後続実装は canonical のみを編集して6 harness と self-install を再生成する。関連178テスト、dist 6 harness check、promote 4面 check は成功し、`bun run check` は `tsc: command not found`（exit 127）で未判定。API carrier の形は後続設計で裁定する。

## Mirror レビュー修正の交差スタック（260725-mirror-review-fixes、履歴）

観測 HEAD は `70336937529f5be31c011de5d368c0f03e534506`、差分 base は `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`。

- Runtime / test runner: Bun `1.3.13`（実測 focused test 出力）。
- Language / type system: TypeScript `^6.0.3`、Node 標準 `fs` / `path` / `readline` API。
- Formatter / linter: Biome（`bun run lint` / `lint:check`）。
- Testing: `bun test`、fast-check `^4.9.0`、smoke/unit/integration/e2e の repository-native tier。
- GitHub integration: 外部 `gh` CLI を argument-array process runner と HTTP envelope gateway で利用。
- Coverage: Bun LCOV、`tests/lib/coverage-normalize.ts`、`coverage-source-path.ts`、Codecov。
- Distribution: `scripts/package.ts` と harness manifests により Claude、Codex、Kiro CLI、Kiro IDE、Cursor、OpenCode の6面へ投影。

この intent に新規 production dependency は不要である。安全な config read は Node/Bun が提供する fd/open flags/fstat、codec は既存 custom parser、coverage は既存 mapping table の拡張で実装可能である。

> **2026-07-25（intent `260725-kimi-harness`、amadeus-feature）: 変更なし、確認済み。** 区間変化は既存 TypeScript/Bun 資産内の再編（`amadeus-harness.ts` 新規分離、plugin 信頼層）で、新規ランタイム依存なし。plugin-composition の sha256 は `node:crypto` の stdlib 利用で依存追加ではない（base `6d4df9056` → observed `d31b8a5db`）。

> **2026-07-24（intent `260724-watcher-timeout-fix`、[#1449](https://github.com/amadeus-dlc/amadeus/issues/1449)、amadeus-bugfix / Minimal）: 変更なし、確認済み。** 交差要素は bash（`team-up.sh` 制御フロー）+ herdr（pane/agent 操作）+ agmsg（ready sentinel handshake、`spawn.sh`）で、いずれも既存スタック。新規ランタイム依存なし（base `a81c11dde` → observed `6d4df9056`）。

## 260723-t241-ci-residency 交差スタック（履歴: 2026-07-23）

差分リフレッシュ（base `a81c11dde` → observed `78bce876`、距離 35、bugfix / Minimal、[#1294](https://github.com/amadeus-dlc/amadeus/issues/1294)）。スタック構成に変化なし。交差要素は Bun 自作テストランナー（`tests/run-tests.ts` の smoke/unit/integration/e2e 4層）、GitHub Actions（`ci.yml`/`release.yml`/`formal-verification.yml`）、`bun` `spawnSync`（t241 の CLI 子プロセス起動）。e2e 層は `--ci` 非対象のため自動 CI で走らない（測定 ref: scan-notes @ observed HEAD `78bce876`）。

## 260722-teamup-prompt-race 交差スタック（2026-07-22、履歴）

bugfix / Minimal（observed `a81c11dde`）。本バグ交差面は既存スタックのシェル層に限定し、新規 runtime dependency は導入しない。関与技術: Bash（`scripts/team-up.sh` / `scripts/run-claude.sh`）、Herdr（pane multiplexer、`herdr pane run`/`send-text`/`send-keys`/`capture`）、外部 agmsg skill（`~/.agents/skills/agmsg/` の Bash + SQLite JSON1、read-only 参照）、既存 TypeScript の supervisor（`scripts/team-up-codex-safety-wait.ts`、Bun 実行）。以下の現行スタック表（Bun 1.3.13 / TypeScript ^6 / Biome / fast-check 等）は本 intent で不変。

> 以下は過去 intent の履歴。

## upstream-sync-230 の現行技術スタック（2026-07-20、履歴）

| 層 | 技術／バージョン | 用途 |
|---|---|---|
| Runtime | Bun 1.3.13 | TypeScript CLI、hooks、tests、packaging |
| Language | TypeScript ESM (`typescript` `^6.0.3`) | core/setup/harness/scripts/tests |
| Formatter/Linter | Biome 2.4.16 | `lint:check`（593 files、208 warnings、16 infos） |
| AI SDK | `@anthropic-ai/sdk` 0.3.158 | 一部ハーネス連携 |
| Terminal | `@xterm/xterm` `^5.5.0`、`node-pty` 1.1.0 | setup/端末連携 |
| Property testing | `fast-check` `^4.9.0` | generator/parser 契約の検査 |
| Test runner | `bun test` | unit 216 / integration 159 / e2e 70 / smoke 14 files |
| Distribution | manifest-driven `scripts/package.ts` | 6ハーネス dist、4面 self-install |

`bun run lint:check` は exit 0、`bun scripts/package.ts --check` は6/6 PASS、`bun scripts/promote-self.ts --check --no-build` も exit 0 である。`bun run typecheck` は実行環境に `tsc` がなく exit 127、full test suite はこの RE で未実施である。plugin 機構のために runtime dependency を追加せず、Bun/TypeScript と既存 manifest/FS API で実装する。

> 以下は過去 intent の履歴。

## Codex hooks／agmsg runtime スタック（intent 260718-hooks-config-conflict、2026-07-18、履歴）

- Amadeus 側は Bun／TypeScript の `emit.ts` が整形済み JSON template と trust seed を生成し、Codex は project 内の exact `.codex/hooks.json` を発見する。
- 外部 agmsg 1.1.7 は Bash driver と SQLite3 JSON1 (`readfile`／`writefile`、`json_set`／`json_remove`)で同じ active JSON を read-modify-write する。monitor bridge は Node.js と Codex `app-server --listen ws://` を利用する。
- 技術競合はライブラリバージョンではなく config ownership。pretty-print 化だけでは runtime entry と絶対 path の tracked diff が残る。
- active file の untrack／ignore、または static dispatcher + ignored sidecar はともに `【裁定待ち】`。新規技術導入の要否も採用案の裁定後に決める。

## multi-agent 実行スタック（intent 260713-swarm-driver-migration、2026-07-13、履歴）

| 実行面 | 現行技術 | プロセス境界 | 未解決の検証面 |
| --- | --- | --- | --- |
| Claude Code | live `Task`、Dynamic `Workflow` | live Claude session 内。現行 swarm は `claude -p` を起動しない | Agent Teams の team 実起動 event、Ultra Code workflow trace、各2 Unit以上 |
| Codex | `codex exec --skip-git-repo-check -C <worktree> ... < /dev/null` | Unit ごとの別 AI CLI process | `gpt-5.6-sol` Ultra の明示設定と native multi-agent委譲 event、各2 Unit以上 |
| Kiro CLI／IDE | live native `subagent` tool | live Kiro session 内。現行 swarm は `kiro-cli chat --no-interactive` を起動しない | subagent tool-call trace と最大並列／trust の事前検査 |
| Referee | Bun／TypeScript、Git、shell convergence command | AI worker とは独立した deterministic subprocess | requested／selected driver と native trace の correlation |
| Packaging | Bun `scripts/package.ts`、manifest、`scripts/promote-self.ts` | source→`dist`→Claude／Codex／Cursor／OpenCode self-install | 6 harness 配布と4 harness project-local self-install の drift |

基盤言語は TypeScript（ESM）、ランタイムと package manager は Bun、状態隔離と merge は Git、テストは `bun:test` と自作 runner を維持する。新 driver 契約のために cloud SDK／Responses API／永続 daemon を追加する計画はない。capability probe はローカル CLI／live tool の振る舞いを検査し、credential や provider 生レスポンスを保存しない。

live proof は決定的 unit／integration suite と分離した opt-in e2e とする。既存の Codex exec journey、Kiro ACP trace、Claude SDK／TUI journey は transport substrate として再利用可能だが、native driver を識別する classifier は新設が必要である。

> 以下は過去 intent の技術記録。導入予定と書かれた項目は当時の計画であり、今回 intent の current plan ではない。

## ランタイムと言語

変更なし。TypeScript(ESM)を Bun ランタイム上で直接実行する構成を維持している。`packages/setup` は functional-domain-modeling-ts スタイル(class-free、type + companion namespace、frozen literal factory、判別ユニオン Result)を全面採用している点も変更なし。

## テスト基盤の追加(intent 260710 区間、2026-07-10)

前回スキャン(162553b99)以降の38コミットで以下が加わった。#735 の packaging 検査を実装する際のテスト土台となる。

- **`fast-check ^4.9.0`(PBT、#722/#697 Phase B)**: property-based test を導入。`tests/helpers/arbitraries/{manifest,semver}.ts` に arbitrary を定義し、`tests/unit/setup-manifest.pbt.test.ts`・`setup-semver.pbt.test.ts`・`t204-audit-escape.pbt.test.ts` 等で manifest roundtrip / semver / audit escape の性質を検証。
- **動的 test-size 計測(#732/#699 Phase D)**: `tests/lib/test-size.ts` + `tests/run-tests.ts` がランナー実行中に各テストの size(pyramid 軸)を連続計測し `test-size-report.json` を出力。
- **codecov 導入**: `codecov.yml`(project/patch status)+ `.github/workflows/ci.yml` にカバレッジゲート(#687/#710)。`tests/.coverage-ratchet.json`・`.coverage-registry.json` を更新。

## 複雑度ゲート導入予定(intent 260710-complexity-gate、2026-07-10)

現行 HEAD からの diff-refresh(フォーカス5面)で確定した、複雑度ゲート導入(feature スコープ)が加える技術要素。詳細は code-quality-assessment.md「複雑度ゲート導入」節・initiative-brief 参照。

- **lizard 1.23.0(Python パッケージ、CI に pip 固定インストール予定)**: TS/多言語対応の CCN(cyclomatic complexity number)計測器。CI の `check` ジョブに typecheck/lint 直後のステップとして pip 固定バージョンで導入予定(E-CX1 Q3=A)。lizard 自体は純 Python 単一パッケージであり、最悪時は vendoring も選択肢(R3 代替緩和)。CCN の baseline ラチェット(現存 CCN>15 の42関数を grandfather、新規超過とラチェット悪化のみ赤)は、`tests/coverage-project-gate.ts` / `gen-coverage-registry.ts` と同型の「committed baseline JSON + env seam + --check 単調非減少 + --update 更新」テンプレートを踏襲する想定。
- **Biome `noExcessiveCognitiveComplexity` の有効化予定**: Biome 2.4系標準の cognitive-complexity ルールを warn として有効化予定(現状 `biome.json` の linter.rules では未有効)。あわせて lint スコープを現行の `tests/ packages/setup/` から `packages/framework/core` + `scripts` へ拡大予定(E-CX1 Q2=A、既存6指摘の機械的修正を同一 PR に含む)。2層ゲート(Biome warn + lizard CCN ラチェット)の warn 層を担う。

- **#685**: `amadeus-state.ts`/`amadeus-lib.ts`/`amadeus-audit.ts` はいずれも標準ライブラリ(`node:fs`、`node:path`)のみで構成される素朴な手続き型実装。#671 の `delegate-approval`/`humanActedSinceGate`/`verifyDelegatedApproval` と同型の機構(issuer coordinates を audit block に埋め込み、対象側が実 shard を読んで検証する)を REJECT 側に追加するのに新規の外部依存は不要。
- **#670**: `amadeus-worktree.ts` は `child_process`(`runGit`)経由で git を直接呼ぶ実装で、外部 git ライブラリへの依存はない。`assertNotSiblingWorktree` の分岐追加(許可すべき sibling とブロックすべき sibling の区別)も既存の `runGit` 呼び出しの範囲で完結する見込み。

## 260709-bug-zero-batch(旧 intent、履歴)に関連する技術的な注記

- **#674**: `amadeus-swarm.ts` の `handleFinalize` は同期的な配列走査(`results[]`、`mergeFailures[]`)で状態を持つ素朴な手続き型実装であり、フレームワーク側の追加ライブラリは使っていない。修理は既存の2配列を1本化するか、merge-back フェーズの結果を `results[]` にフィードバックする再走査を追加するかの選択になる。
- **#675**: `amadeus-state.ts` は `withAuditLock` による再入可能ロックを持つが、guard 関数(`isAutonomousMode`/`humanPresenceGuardDisabled`/`humanActedSinceGate`)は `amadeus-lib.ts` からの純粋な import であり、`handleReject` に同じ import を追加するだけで技術的には配線可能(ただし team.md の要求どおり requirements-analysis で「reject にも同じガードを掛けるべきか」を意思決定してから実施する)。
- **#676・#668**: いずれも `amadeus-lib.ts` の record-dir/repo-name 解決系(`recordDir`、`spaceRecordRoot`、`intentRepos`、`basename`)に起因する。`node:path` の `basename` を worktree 対応にするには git 情報(`.git` ファイルの `commondir` 参照、または `git rev-parse --show-toplevel` 相当)を読む必要があり、現状この関数群に git 呼び出しは存在しない。
- **#677**: `packages/setup/src/ports/http.ts` は標準の `fetch`/`AbortSignal.timeout` のみに依存し、外部 HTTP ライブラリは使っていない。修理は `try/catch` の追加のみで、新規依存は不要。
- **#678**: `tar-archive-extractor.ts` は `node:zlib` の `createGunzip` によるストリーミング解凍と、自前実装の 512 バイトブロック単位パーサ(標準 tar ライブラリへの依存なし、意図的な設計方針としてコメントに明記: `tech-stack-decisions.md` 参照)で構成される。修理(あるいは実測による安全性確認)も自前パーサ内で完結する。

## ビルドとテストツール

Bun(script runner/テスト実行)、TypeScript `^6.0.3`、Biome 2.4系、GitHub Actions(`ubuntu-latest`)、`bun:test` + 自作ランナー(smoke/unit/integration/e2e)。

- **fast-check `^4.9.0`(2026-07-09、`260709-pbt-small-band`/#697 の後に landed、`260709-dynamic-test-size` スキャンで確認)**: property-based testing ライブラリを `devDependencies` に追加(`package.json:32` 相当、`bun.lock` に対応エントリ)。PBT 用 arbitrary ヘルパー(`tests/helpers/arbitraries/semver.ts`)と PBT 単体テスト(`tests/unit/setup-semver.pbt.test.ts`)で使用。テスト専用依存であり production tree・配布物には非関与。test/coverage スクリプト(`test:ci`/`coverage:ci`/`test:all`)は無改変。

## バージョンと依存関係の注記

`AMADEUS_VERSION` と `@amadeus-dlc/setup` パッケージバージョンの独立ライフサイクルは変更なし。バージョンバンプは `release.yml` の `workflow_dispatch` 一本に統一されている(project.md DECIDED 参照)。一連の bugfix intent(バッチ D 含む)はこの仕組みに変更を加えない。

## Issue #857 差分スキャン（2026-07-23）

検証時の基盤は Bun 1.3.13、TypeScript 6.0.3、Biome、lizard、dist/self-install 検査、test、project coverage と patch coverage である。フレームワーク版は0.1.4。Issue #857 の最小境界導入に新規ランタイム依存は不要であり、既存の TypeScript/Bun とテスト基盤で実装可能である。

## カバレッジ上の位置づけ

export 済み `handleDoctor` の monkeypatch 型 in-process テストは6ファイル104ケース成功、LCOV 437/771行 hit である。spawn 契約 t37/t83/t210 は41ケース成功だが LCOV 1/771行 hit である。従って spawn テストは CLI/cwd 互換性、in-process テストは内部分岐という相補的な役割を持つ。
