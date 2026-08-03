# 差分リフレッシュ記録 — 260802-source-only-dist

Issue #2043（source-only 構成移行 + Release Asset 配布）、scope `self-feature`、Brownfield、単一 repo `amadeus`。

## 実測メタデータ

| 項目 | 値 | 実測コマンド |
| --- | --- | --- |
| Date | `2026-08-02T17:20:00Z` | — |
| Base commit | `47574fbabf274e11cb8e0b37bf35a0309a7b3d42` | 前回 observed = 260802-scope-grid-face-sync |
| 祖先性 | exit 0（祖先） | `git merge-base --is-ancestor 47574fbab 63e69d922` |
| Observed commit | `63e69d922e81ba75a485b2db1dadf69130bff5c8` | `git rev-parse HEAD`（origin/main tip = 作業ツリー HEAD） |
| Observed 件名 | `chore: mark .agents/** as linguist-generated to collapse it in PR diffs (#2057)` | `git log -1 --oneline` |
| Distance | `16` | `git rev-list --count 47574fbab..63e69d922` |
| 区間規模 | `576 files changed, 51928 insertions(+), 2012 deletions(-)` | `git diff --shortstat 47574fbab..63e69d922` |

本記録の file:line はすべて observed `63e69d922` 時点（`cid:reverse-engineering:measurement-ref-in-artifacts`）。

## A. 区間実測（`47574fbab..63e69d922`）

- `scripts/package.ts` の区間変更は 1 ヶ所のみ（`#2031` `8448fdc6e`）: `writeHarnessData` の `harness.json` スキーマに `name` フィールドを追加（`:210-215`、`name: m.name` が新規行）→ 全 7 面 dist 再生成。**配布契約は不変**。
- `#2031`（213 ファイル）/ `#2049`（228 ファイル）はいずれも dist 再生成に留まり、`scripts/promote-self.ts` / `packages/setup` / `.github/workflows` は未接触。
- 区間で変わった非 dot 面: `.coderabbit.yaml`、`.gitattributes`（`#2057`: `.agents/**` を linguist-generated 化）。
- Issue #2043 cite（SHA `8e5dc6c4`）からの行番号シフト: `scripts/package.ts` のみ（`:212` 以降 +4、`:808` 以降 +8）。`scripts/promote-self.ts` / `.github/workflows/ci.yml`（行数不変 691）/ `.gitignore` / `AGENTS.md` / `scripts/detect-ci-changes.sh` / `packages/setup` / `.github/workflows/release.yml` / `.claude/settings.json` は diff なしで cite がそのまま有効。

### 患部パスの区間 touch 判定

`git log --oneline 47574fbab..63e69d922 -- <path> | wc -l` の実測:

| パス | コミット数 |
| --- | --- |
| `scripts/package.ts` | 1 |
| `scripts/promote-self.ts` | 0 |
| `.github/workflows/release.yml` | 0 |
| `.github/workflows/ci.yml` | 0 |
| `scripts/detect-ci-changes.sh` | 0 |
| `.gitignore` | 0 |
| `AGENTS.md` | 0 |
| `packages/setup` | 0 |
| `.claude/settings.json` | 0 |

## B. 配布系患部の現況（HEAD 実測、verbatim 確認済み）

### B1 `scripts/promote-self.ts`（689 行、区間 diff なし）

- `managedDirs` `:53-60` — 6 面写像。`dist/claude/.claude` → `.claude` / `dist/codex/.codex` → `.codex` / `dist/codex/.agents` → `.agents` / `dist/cursor/.cursor` → `.cursor` / `dist/opencode/.opencode` → `.opencode` / `dist/kimi/.kimi-code` → `.kimi-code`。`dist/` 直下は 8 ディレクトリ（7 ハーネス + `dist/plugins/`）で、kiro / kiro-ide は promote 対象外。
- `PROJECT_INSTRUCTIONS` `:65-74` / `CODEX_AGENTS_MARKER` `:76` / `AMADEUS_IMPORT` `:77`（`"@.agents/rules/amadeus.md"`）。
- `composeRootAgents` `:83-99` / `preserved` `:101-114`（10 エントリ）。
- `COMPOSED_SCOPE_RE` `:124` / `SCOPE_GRID_RE` `:125` / `scopeGridInSync` `:132` / `PLUGIN_ENGINE_STATE_RE` `:178` / `STAGE_GRAPH_RE` `:179`。
- `check()` `:471-494` — `MISSING` `:477`、`DIFFERS` の grid 分岐 `:481-482` / graph 分岐 `:483-484` / 既定バイト比較 `:485`、`ORPHAN` `:487`。plugin carve-out `:455-456`。`scripts/package.ts` への再帰呼び出し `:355-359`（`mode === "apply" ? [...] : [..., "--check"]` = promote が build を内包）。

### B2 `scripts/package.ts`（963 行、区間 1 コミット）

- `--check` モード usage `:5`,`:7`。
- 手編集検出コメント `:28-34` — verbatim: `guard fails CI when someone hand-edits a dist or forgets to regenerate.`
- `discoverHarnessNames` `:92-97` — `manifest.ts` の実在で発見。実測 7 件（`ls packages/framework/harness/*/manifest.ts | wc -l` = 7）。ハーネス名のハードコード列は不在。
- `writeHarnessData` `:210-215` — 区間の唯一の患部変更。
- `checkHarness` `:698-712` — committed 参照 `:700`、temp `:701`、`buildTree` `:705`、MISSING / DIFFERS `:707-712`。ハーネス外バイト差分 `:728-742`。

### B3 `packages/setup`（区間 diff なし）

実パスはスキャン所見の記載よりディレクトリが 1 段深い:

- `packages/setup/src/internal/resolved-version-factory.ts` — `:4` ADR-003 コメント（`archive is always fetched from codeload, keyed by the "v"-prefixed tag.`）/ `:5` `CODELOAD_BASE = "https://codeload.github.com/amadeus-dlc/amadeus/tar.gz/refs/tags"` / `:14` `new URL(\`${CODELOAD_BASE}/${tag}\`)`。
- `packages/setup/src/internal/payload-factory.ts` — `:12` `resolveWrapperDir`（位置基準解決、BR-F10。コメント `:10-11` が「tarball の先頭ディレクトリ名は要求タグと一致しないので位置で解決せよ」と明示）/ `:36` `wrapper` / `:38` `const distDir = join(wrapper.value, "dist")` / `:42` `readdirSync(distDir)` / `:44` `missing dist/ directory in extracted archive (expected ${distDir})` / `:53-55` harness 不在エラー / `:57` harness ルート選択。
- `packages/setup/src/ports/http.ts` — `:4` SEC-F02 コメント / `:5` `ALLOWED_HOSTS = new Set(["api.github.com", "codeload.github.com"])` / `:7` `MAX_REDIRECTS = 5` / `:52` 初回ホスト検査（`refusing to contact untrusted host`）/ `:79` redirect 先ホスト検査（`refusing to follow redirect to untrusted host`）。

### B4 `.github/workflows/release.yml`（206 行、区間 diff なし）

- `github-release` ジョブ `:133-158` — checkout なし・bun なし・build なし。`softprops/action-gh-release@3bb12739c298aeb8a4eeaf626c5b8d85266b0e65 # v2` `:154` の `with:` 入力は `tag_name` `:156` / `generate_release_notes` `:157` / `token` `:158` の 3 つのみ。**`files:` 入力なし = Release Asset ゼロ**。
- 対照 `publish` ジョブ `:164-` — `Checkout released commit` `:169-172` + `oven-sh/setup-bun` bun 1.3.13 `:174-177` + `Build dist/cli.js (fresh)` `:188-190`（`packages/setup` の `dist/cli.js` 用）。

### B5 `.github/workflows/ci.yml`（691 行、区間 diff なし）

- `drift-check` ジョブ `:225-255` — `:228` 発火条件（`needs.changes.outputs.full == 'true' || needs.changes.outputs.drift == 'true'`）、bun 1.3.13 `:234-237`、`bun run dist:check` `:243-244`、`bun run promote:self:check` `:246-247`、`bun .claude/tools/amadeus-graph.ts compile --check` `:254-255`。
- build ステップ不在を確認（checkout / setup-bun / install + ガード 3 種の 6 ステップのみ）。

### B6 `scripts/detect-ci-changes.sh`（37 行、区間 diff なし）

- `full` フィルタ `:9-16` — `:13` に `scripts/*` `tests/*` `packages/framework/*` `packages/setup/*` `book-pack/*`。
- `drift` フィルタ `:18-24` — `:20` に `packages/framework/*` `dist/*` `.agents/*` `.claude/*` `.codex/*` `.kiro/*` `.cursor/*` `.opencode/*` `.kimi-code/*`、`:21` に `AGENTS.md` `CLAUDE.md`。`.kiro-ide` パターンなし・`.kiro/*` はルート面に実体なし（既存不整合）。

### B7 `.gitignore`（84 行、区間 diff なし）

- COMMITTED 契約 `:16-19` — verbatim: `# dist/ is generated, COMMITTED, and drift-guarded (see CONTRIBUTING.md).` + `!/dist/`。
- `:22-24` `dist/{claude,kiro,codex}/amadeus-docs/`、`:27` `dist/claude/todo-app/`、`:29-32` `packages/setup/dist/`（`Unlike the framework's /dist/ above, this is a per-package publish artifact, not drift-guarded, and is rebuilt lazily by tests/lib/setup-lazy-build.ts.`）、`:2` `settings.local.json`、`:42` `.claude/worktrees`、`:11` `.codex/hooks.json`、`:5` `.codex/agmsg-delivery-mode`。

### B8 `.claude/settings.json`（区間 diff なし）

- hook command 参照 12 本（statusline `:48` を含む）。`bun "${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/<tool>.ts"` 形式は 11 本 — `:57` mint-presence / `:68` session-start / `:79` session-end / `:90` audit-logger / `:94` sensor-fire / `:103` sync-statusline / `:112` mint-presence（2 回目）/ `:121` runtime-compile / `:132` validate-state / `:143` log-subagent / `:154` stop。参照される実体は 11 種。
- `.claude/hooks/` の実ファイルは 13 本。未参照 2 本 = `amadeus-log-subagent-start.ts`、`amadeus-plugin-compose.ts`。**後者が他面から呼ばれるという解釈は推測であり実測未確定**。
- `:31` に巨大インライン Markdown（promote-self の `preserved` 対象 = 手編集正本）。

### B9 `AGENTS.md`（162 行 / 18,937 B、区間 diff なし）

- import 行 `:1` = `@.agents/rules/amadeus.md`。
- 手書き prefix 1-91 行（5,983 B）/ 生成 suffix 92-162 行（12,954 B）。マーカー `:92` = `# AI-DLC on Codex CLI`。
- `:90` に手編集禁止規約 — verbatim（抜粋）: `**Never hand-edit \`dist/\`** (nor the promoted root \`AGENTS.md\`/\`CLAUDE.md\` suffix): they are generated and drift-guarded.` … `then run \`bun scripts/package.ts\` and commit the regenerated trees`。**dist コミット前提の文言 = 改訂対象**。

### B10 scope 定義正本

スキャン所見の記載を実測で訂正した箇所を含む。

- stock 10 種（chore / enterprise / feature / fix / infra / mvp / poc / refactor / security-patch / workshop）は `packages/framework/core/scopes/` に正本を持つ（`ls` 実測 10 件）。
- **`amadeus-self-*.md` 4 種と `amadeus-installer-distribution.md` の 5 scope は `packages/` / `dist/` / `plugins/` / `contrib/` に 0 件**（`find packages dist plugins contrib -name 'amadeus-self-*.md' -path '*/scopes/*'` = 0、`find … -name 'amadeus-installer-distribution.md'` = 0）。スキャン所見の「scope 正本ゼロ」は self-\* / installer-distribution に限った話であり、stock を含む全 scope の話ではない。
- self-\* 4 種は dot 5 面（`.claude` / `.codex` / `.cursor` / `.opencode` / `.kimi-code`）に各 4 件。`.agents` は 0（`.agents/` は `rules` / `skills` の 2 ディレクトリのみで `scopes/` を持たない）。
- `amadeus-installer-distribution.md` は `./.claude/scopes/` と `./.kimi-code/scopes/` の **2 面のみ = 面間乖離が現存**。
- `scope-grid.json`: root（`.claude/tools/data/`）15 キー vs `dist/claude/.claude/tools/data/` 10 キー。差分 5 = self-\* 4 + installer-distribution。

### B11 `tests/` の dist 参照

- `grep -rln 'dist/' tests/` のヒット数 = **423**（Issue #2043 記載の 373 から区間で増加）。

## C. テスト所在

- 生成・同期側: `t370`（`scopeGridInSync`）、`t200`（`COMPOSED_SCOPE_RE`）、`t356`（plugin carve-out）、`t-package-write-sweep`（write ↔ check の対称性）。
- installer 経路: `setup-installation`、`setup-resolved-version`、`setup-http`。
- 補助: `t-package-unreferenced-source`、`t149` / `t150`（dist 構造契約）、`setup-pack-contract`、`t209`。
- **ギャップ: `.github/workflows/release.yml` の `github-release` ジョブを検証するテストは不在**（`tests/` 配下に `release.yml` 読取ゼロ）。

## 患部サマリ（7 点）

1. `.gitignore:16-19` — COMMITTED 契約の反転起点。
2. installer 3 ファイル同時変更必須 — `packages/setup/src/internal/payload-factory.ts:38`,`:44` + `internal/resolved-version-factory.ts:5` + `ports/http.ts:5`。URL 生成・展開後レイアウト前提・許可ホスト集合が互いに独立に固定されているため分離不能。
3. `.github/workflows/release.yml:152-158` — `files:` なし、checkout / bun / build なし。
4. `.github/workflows/ci.yml:243-247`,`:254-255` + `scripts/detect-ci-changes.sh:20` — drift guard の意味変化と発火トリガの沈黙。
5. `scripts/promote-self.ts:53-60` — 6 面写像の src がすべて `dist/`。緩和材料は `:355-359` の再帰 check が build を内包していること。
6. `AGENTS.md:90` — 文言改訂対象。
7. `installer-distribution` scope の面間乖離（6 面中 2 面）。加えて self-\* 4 種 + installer-distribution は正本を持たず dogfood 面が唯一の実体であるため、dist 非コミット化で復元元不在が露出する。

## 引用再確認（合成時に Architect が独立実読した項目）

| 対象 | 確認方法 | 結果 |
| --- | --- | --- |
| `.gitignore:16-19` | `sed -n '14,33p'` | verbatim 一致 |
| `release.yml:133-158` / `:164-190` | `sed -n '130,160p;165,192p'` | `files:` 不在・publish 側の build 実在を確認 |
| `promote-self.ts:53-60`,`:65-77`,`:355-359`,`:471-494` | `sed -n` | 一致。`MISSING`/`ORPHAN` の行番号を `:477` / `:487` に確定（`awk` で再確認） |
| `package.ts:28-34`,`:92-97`,`:208-218`,`:698-712` | `sed -n` | 一致。`writeHarnessData` の `name` 追加を確認 |
| `packages/setup` 3 ファイル | `find` + `sed -n` | 実パスが `src/internal/` `src/ports/` 配下と判明、行番号は一致 |
| `ci.yml:225-256` | `sed -n` | 一致。bun 行を `:234-237` に確定 |
| `detect-ci-changes.sh:9-24` | `sed -n` | 一致 |
| `.claude/settings.json` hook 参照 | `grep -n '"command": "bun'` + `ls .claude/hooks/` | 11 参照 / 13 実体、未参照 2 本を確認 |
| `AGENTS.md:1`,`:90`,`:92` | `sed -n` + `wc -c` | 一致（18,937 B / 162 行） |
| scope 面の分布 | `find` + `python3 json` | スキャン所見 B10 を訂正（上記参照） |
| `tests/` の `dist/` 参照 | `grep -rln 'dist/' tests/` | 423 |
| 区間 touch 判定・shortstat・祖先性 | `git log` / `git diff --shortstat` / `git merge-base --is-ancestor` | 上表のとおり |
