# 乖離目録(drift-ledger)

上流入力(consumes 全数): business-logic-model.md(段2-3 の二層照合手順)、requirements.md(乖離クラス定義)、reverse-engineering の既知クラスタ A-E

## 測定条件と総計

**測定 ref**: `bafeccca8c3b691a87e1c359a882c77e4ed8e478`(origin/main、`feat(scopes): add amadeus-document scope for implementation-verified docs work (#1572)`)
**測定ツリー**: `<scratchpad>/wt-audit`(detached worktree、読み取り専用)
**照合対象**: `README.md`、`README.ja.md`、`docs/**/*.md`(`docs/research/` は凍結記録につき除外)

### 真実源(worktree 内実測)

| 真実源 | コマンド | 出力 |
|---|---|---|
| ハーネス正本 | `ls packages/framework/harness/` | `claude codex cursor kimi kiro kiro-ide opencode` + `projections.ts` = **7 ハーネス** |
| 投影面(packaged) | `grep -n "PACKAGE_HARNESSES" -A 12 scripts/plugin-projection.ts` | `:42-50` = claude, codex, cursor, kiro, kiro-ide, opencode, kimi = **7** |
| 投影面(self-install) | 同上 | `:56` `SELF_INSTALL_HARNESSES = ["claude","codex","cursor","opencode","kimi"]` = **5** |
| インストーラ受理値 | `grep -rn "kiro-ide" packages/setup/src` | `domain/harness.ts:9` = claude, codex, kiro, kiro-ide, opencode, cursor, kimi = **7** |
| HarnessType 受理値 | `sed -n '1,70p' packages/framework/core/tools/amadeus-harness.ts` | `:5-13` = claude-code, codex, cursor, opencode, kiro, **kimi**, unknown, manual |
| hook | `ls .claude/hooks/amadeus-*.ts` | **12 ファイル**(audit-logger, log-subagent, mint-presence, plugin-compose, runtime-compile, sensor-fire, session-end, session-start, statusline, stop, sync-statusline, validate-state) |
| agent | `ls packages/framework/core/agents/` | **14 ファイル**(domain-expert 11 + architecture-reviewer + product-lead + composer) |
| sensor | `ls .claude/sensors/` | **6 ファイル**(answer-evidence, linter, model-completeness, required-sections, type-check, upstream-coverage) |
| stage | `ls packages/framework/core/amadeus-common/stages/*/*.md \| wc -l` | **32** |
| promote:self 対象面 | `grep -n ... scripts/promote-self.ts` | `:50-55` `.claude/ .codex/ .agents/ .cursor/ .opencode/ .kimi-code/` + `:164` AGENTS.md / CLAUDE.md |
| root `core/` `harness/` | `ls -la \| grep -E ' (core\|harness)$'` | **不在**(NO root core/ or harness/) |
| EN/JA ペア集合 | `comm -23 /tmp/en.txt /tmp/ja.txt` | EN=99 / JA=97、EN 側 2 件が未ペア |

### 総件数(列挙からの機械再計算)

**総件数 = 100**(初回監査 98+追検出 2 — 機械再計算: 下表の D-行 grep -c = 100)

| クラス | 件数 | 内訳の要旨 |
|---|---|---|
| `count-stale` | 19 | ハーネス 6→7、hook 11→12、agent 11→14、sensor 4→6、stage 31→32 |
| `enum-missing` | 24 | Kimi Code の列挙欠落(クラスタ A、**未解消**)、plugin-compose hook 欠落、sensor 2件欠落 |
| `semantic` | 48 | root `core/`/`harness/` 廃止パス参照 43 ファイル + hook ファイル名 prefix 欠落 2 + テストファイル拡張子 2 + 虚偽の互換 alias 主張 1 |
| `pair-drift` | 6 | EN 面が日本語で書かれている 3、JA 面に節が存在しない 2、行順の EN 片側変更 1 |
| `pair-missing` | 2 | `.ja.md` が存在しない EN 文書 2 |
| `impl-bug` | 1 | 同名 export の値相違(canonical 1定義違反) |

※ 各行の「処置」欄は空欄で作成。修正段が埋める。

## 乖離目録

### count-stale(18件)

| id | 所在 file:line | 記述の verbatim 断片 | 真実源 | 処置 |
|---|---|---|---|---|
| D-001 | README.md:5 | `running natively inside six coding-agent harnesses` | `ls packages/framework/harness/` = 7 | 修正済み(PR #1576) |
| D-002 | README.ja.md:5 | `6つのコーディングエージェントハーネスの上でネイティブに動かします` | 同上 = 7 | 修正済み(PR #1576) |
| D-003 | README.md:67 | `**two additional harness surfaces** — OpenCode and Cursor — extending the four shipped upstream to six;` | 同上 = 7(Kimi Code も Amadeus 独自の追加面) | 修正済み(PR #1576) |
| D-004 | README.ja.md:67 | `**ハーネス2面の追加** — OpenCode と Cursor。本家出荷の4面を6面へ拡張` | 同上 = 7 | 修正済み(PR #1576) |
| D-005 | docs/reference/06-hooks-and-tools.ja.md:13 | `この実装は `.claude/hooks/` にある11個のフックスクリプトを使用します。11個すべてが…` | `ls .claude/hooks/amadeus-*.ts` = 12(EN:13 は `twelve`) | 修正済み(PR #1578) |
| D-006 | docs/reference/06-hooks-and-tools.ja.md:15 | `11個のうち10個は**非ブロッキング**です` | 同上 = 12(EN:15 は `Eleven of the twelve`) | 修正済み(PR #1578) |
| D-007 | docs/reference/01-architecture.md:60 | `**Agents** (`agents/*.md`) -- Eleven flat agent files` | `ls packages/framework/core/agents/` = 14 | 修正済み(PR #1578) |
| D-008 | docs/reference/01-architecture.ja.md:60 | `**Agents**(`agents/*.md`)— 11個のフラットなエージェントファイル` | 同上 = 14 | 修正済み(PR #1578) |
| D-009 | docs/reference/01-architecture.ja.md:476 | `| **Unit**(L1) | `tests/unit/` | 11個のフック、CLI ツール、…` | `ls .claude/hooks/amadeus-*.ts` = 12(EN:523 は count-free `The framework hooks`) | 修正済み(PR #1578) |
| D-010 | docs/guide/01-getting-started.ja.md:105 | `その `hooks` ブロック + `statusLine` コマンド — 11 個すべてのフレームワークフック` | 同上 = 12(EN:127 は count-free `all framework hooks`) | 修正済み(PR #1576) |
| D-011 | docs/amadeus-files.md:8 | `extracted from the `outputs:` frontmatter in all 31 stage files` | `ls packages/framework/core/amadeus-common/stages/*/*.md \| wc -l` = 32 | 修正済み(PR #1578) |
| D-012 | docs/amadeus-files.ja.md:8 | `全31ステージのfrontmatter `outputs:` から抽出` | 同上 = 32 | 修正済み(PR #1578) |
| D-013 | docs/harness-engineering/06-sensors.md:13,57,59,68,74 | `## The four sensors that ship` / `Four manifests ship under `.claude/sensors/`` / `All four are gated` / `the smallest of the four` | `ls .claude/sensors/` = 6 | 修正済み(PR #1578) |
| D-014 | docs/harness-engineering/06-sensors.ja.md:7,24,26,35 | `## 同梱される4つのセンサー` / `4つのマニフェストが同梱され` / `4つすべては `matches:` グロブでゲートされます` | 同上 = 6 | 修正済み(PR #1578) |
| D-015 | docs/guide/09-rules-and-the-learning-loop.md:150 | `Four sensors ship with the framework:` | 同上 = 6 | 修正済み(PR #1576) |
| D-016 | docs/guide/09-rules-and-the-learning-loop.ja.md:150 | `4 つのセンサーがフレームワークに同梱されます:` | 同上 = 6 | 修正済み(PR #1576) |
| D-017 | docs/guide/12-cli-commands.md:477 | `The four Sensors that ship with the framework are `required-sections`, `upstream-coverage`, `linter`, and `type-check`.` | 同上 = 6(`answer-evidence` / `model-completeness` 欠落) | 修正済み(PR #1576) |
| D-018 | docs/guide/12-cli-commands.ja.md:471 | `フレームワークに付属する 4 つのセンサーは `required-sections`、`upstream-coverage`、`linter`、`type-check` です。` | 同上 = 6 | 修正済み(PR #1576) |

### enum-missing(23件)

| id | 所在 file:line | 記述の verbatim 断片 | 真実源 | 処置 |
|---|---|---|---|---|
| D-019 | README.md:78-83 | ハーネス表 6 行(Claude Code / Codex CLI / Cursor / OpenCode / Kiro IDE / Kiro CLI) | インストーラ受理値 7(`packages/setup/src/domain/harness.ts:9`)、`docs/guide/harnesses/kimi-code.md` 実在 — **Kimi Code 行が欠落** | 修正済み(PR #1576) |
| D-020 | README.ja.md:78-83 | ハーネス表 6 行(Kiro IDE / Kiro CLI / Claude Code / Codex CLI / OpenCode / Cursor) | 同上 — Kimi Code 行が欠落 | 修正済み(PR #1576) |
| D-021 | README.md:123 | `pick your harness (`claude` / `codex` / `kiro` / `kiro-ide` / `opencode` / `cursor`)` | 同上 = 7(`kimi` 欠落) | 修正済み(PR #1576) |
| D-022 | README.ja.md:123 | `ハーネス(`claude` / `codex` / `kiro` / `kiro-ide` / `opencode` / `cursor`)` | 同上 = 7(`kimi` 欠落) | 修正済み(PR #1576) |
| D-023 | README.md:298 | `│   │       ├── claude/  codex/  cursor/  kiro/  kiro-ide/  opencode/` | `ls packages/framework/harness/` に `kimi` 実在 | 修正済み(PR #1576) |
| D-024 | README.ja.md:298 | 同上(同一行) | 同上 | 修正済み(PR #1576) |
| D-025 | README.md:308-309 | `│   ├── claude/    kiro-ide/    kiro/` / `│   ├── codex/     opencode/    cursor/` | `ls dist/` = claude codex cursor **kimi** kiro kiro-ide opencode plugins | 修正済み(PR #1576) |
| D-026 | README.ja.md:308-309 | 同上(同一行) | 同上 | 修正済み(PR #1576) |
| D-027 | docs/guide/12-cli-commands.md:556 | `**Valid values:** `claude-code`, `codex`, `cursor`, `opencode`, `kiro`, `unknown`, `manual`.` | `amadeus-harness.ts:5-13` に `"kimi"` を含む | 修正済み(PR #1576) |
| D-028 | docs/guide/12-cli-commands.ja.md:550 | `**有効な値:** `claude-code`、`codex`、`cursor`、`opencode`、`kiro`、`unknown`、`manual`。` | 同上 | 修正済み(PR #1576) |
| D-029 | docs/reference/06-hooks-and-tools.md:446 | `Exact valid values are `claude-code`, `codex`, `cursor`, `opencode`, `kiro`, `unknown`, and `manual`.` | 同上 | 修正済み(PR #1578) |
| D-030 | docs/reference/06-hooks-and-tools.ja.md:444 | `有効な値は厳密に `claude-code`、`codex`、`cursor`、`opencode`、`kiro`、`unknown`、`manual`。` | 同上 | 修正済み(PR #1578) |
| D-031 | docs/reference/11-contributing.md:49 | `refresh this repository's project-local `.claude/`, `.codex/`, `.agents/`, `.cursor/`, `.opencode/`, and `CLAUDE.md`` | `scripts/promote-self.ts:50-55` に `.kimi-code`、`:164` に `AGENTS.md` — 2 面欠落 | 修正済み(PR #1578) |
| D-032 | docs/reference/11-contributing.ja.md:44 | `プロジェクトローカルな `.claude/`、`.codex/`、`.agents/`、`.cursor/`、`.opencode/`、`CLAUDE.md` をリフレッシュ` | 同上 — 2 面欠落 | 修正済み(PR #1578) |
| D-033 | docs/reference/18-workspace-layout.md:76 | `` `bun run promote:self:check` は root `.claude/.codex/.agents/.cursor/.opencode` が…`` | 同上 — `.kimi-code` 欠落 | 修正済み(PR #1577) |
| D-034 | docs/reference/18-workspace-layout.ja.md:76 | 同上(同一行) | 同上 | 修正済み(PR #1577) |
| D-035 | docs/guide/glossary.md:31 | `The set is open and growable (today: Claude Code, Kiro CLI, Codex CLI).` | `ls packages/framework/harness/` = 7(Cursor / OpenCode / Kiro IDE / Kimi Code 欠落) | 修正済み(PR #1578) |
| D-036 | docs/guide/glossary.ja.md:44 | `このセットはオープンで成長可能です(今日: Claude Code、Kiro CLI、Codex CLI)。` | 同上 | 修正済み(PR #1578) |
| D-037 | docs/reference/06-hooks-and-tools.ja.md:19-29, 36-46 | ツリー・サマリ表とも 11 エントリのみ(`plugin-compose.ts` 行が不在。`grep -c "plugin-compose" …ja.md` = 0) | EN:28 / :46 に `plugin-compose.ts` 行が実在、`ls .claude/hooks/` に `amadeus-plugin-compose.ts` 実在 | 修正済み(PR #1578) |
| D-038 | docs/harness-engineering/06-sensors.md:61-66 | センサー表 4 行(required-sections / upstream-coverage / linter / type-check) | `ls .claude/sensors/` — `amadeus-answer-evidence.md` / `amadeus-model-completeness.md` の 2 行欠落 | 修正済み(PR #1578) |
| D-039 | docs/harness-engineering/06-sensors.ja.md:28-33 | 同上(日本語版センサー表 4 行) | 同上 | 修正済み(PR #1578) |
| D-040 | docs/guide/01-getting-started.md:61 | `Running Kiro or Codex? Each ships its own distribution and install steps — see [Running on Kiro IDE](…) or [Running on Codex CLI](…).` | 7 ハーネス — Cursor / OpenCode / Kimi Code の導線が欠落 | 修正済み(PR #1576) |
| D-041 | docs/guide/01-getting-started.ja.md:51 | `Kiro または Codex を実行しますか? …[Running on Kiro IDE](harnesses/kiro-ide.ja.md) または [Running on Codex CLI](harnesses/codex-cli.ja.md) を参照` | 同上 | 修正済み(PR #1576) |

### semantic(48件)

#### 廃止パス参照 `core/` `harness/`(43件 — 1ファイル1行)

真実源(全 43 件共通): `ls -la` に root `core/` `harness/` は**不在**。正本は `packages/framework/core/` と `packages/framework/harness/<name>/`(`ls packages/framework/` = core, harness, package.json)。検出コマンド: `grep -rnE '`(core|harness)/' README.md README.ja.md docs/ --include='*.md' | grep -v '^docs/research/' | grep -v '18-workspace-layout'` = 208 hits / 43 files。

| id | 所在 file:line(先頭ヒット) | 当該ファイルのヒット数 | 処置 |
|---|---|---|---|
| D-042 | docs/amadeus-files.md:8 | 2 | 修正済み(PR #1578) |
| D-043 | docs/amadeus-files.ja.md:8 | 2 | 修正済み(PR #1578) |
| D-044 | docs/README.ja.md:5 | 2 | 修正済み(PR #1577) |
| D-045 | docs/guide/glossary.md:19 | 5 | 修正済み(PR #1578) |
| D-046 | docs/guide/glossary.ja.md:32 | 5 | 修正済み(PR #1578) |
| D-047 | docs/guide/harnesses/codex-cli.md:9 | 2 | 修正済み(PR #1578) |
| D-048 | docs/guide/harnesses/codex-cli.ja.md:9 | 2 | 修正済み(PR #1578) |
| D-049 | docs/guide/harnesses/kiro-cli.md:88 | 3 | 修正済み(PR #1578) |
| D-050 | docs/guide/harnesses/kiro-cli.ja.md:90 | 3 | 修正済み(PR #1578) |
| D-051 | docs/guide/harnesses/kiro-ide.md:111 | 4 | 修正済み(PR #1577) |
| D-052 | docs/guide/harnesses/kiro-ide.ja.md:104 | 5 | 修正済み(PR #1577) |
| D-053 | docs/harness-engineering/00-overview.md:56 | 20 | 修正済み(PR #1578) |
| D-054 | docs/harness-engineering/00-overview.ja.md:36 | 13 | 修正済み(PR #1578) |
| D-055 | docs/harness-engineering/01-anatomy-of-a-stage.md:22 | 2 | 修正済み(PR #1578) |
| D-056 | docs/harness-engineering/01-anatomy-of-a-stage.ja.md:22 | 2 | 修正済み(PR #1578) |
| D-057 | docs/harness-engineering/02-adding-a-stage.md:51 | 4 | 修正済み(PR #1578) |
| D-058 | docs/harness-engineering/02-adding-a-stage.ja.md:25 | 3 | 修正済み(PR #1578) |
| D-059 | docs/harness-engineering/03-adding-an-agent.md:11 | 7 | 修正済み(PR #1578) |
| D-060 | docs/harness-engineering/03-adding-an-agent.ja.md:5 | 7 | 修正済み(PR #1578) |
| D-061 | docs/harness-engineering/04-scopes.md:7 | 7 | 修正済み(PR #1578) |
| D-062 | docs/harness-engineering/04-scopes.ja.md:7 | 7 | 修正済み(PR #1578) |
| D-063 | docs/harness-engineering/05-rules-and-the-loop.md:25 | 1 | 修正済み(PR #1578) |
| D-064 | docs/harness-engineering/05-rules-and-the-loop.ja.md:13 | 1 | 修正済み(PR #1578) |
| D-065 | docs/harness-engineering/06-sensors.md:23 | 3 | 修正済み(PR #1578) |
| D-066 | docs/harness-engineering/06-sensors.ja.md:13 | 3 | 修正済み(PR #1578) |
| D-067 | docs/harness-engineering/07-team-knowledge.md:197 | 2 | 修正済み(PR #1578) |
| D-068 | docs/harness-engineering/07-team-knowledge.ja.md:95 | 1 | 修正済み(PR #1578) |
| D-069 | docs/harness-engineering/08-construction-and-swarm.md:16 | 9 | 修正済み(PR #1578) |
| D-070 | docs/harness-engineering/08-construction-and-swarm.ja.md:7 | 8 | 修正済み(PR #1578) |
| D-071 | docs/harness-engineering/09-porting-to-a-new-harness.md:7 | 17 | 修正済み(PR #1578) |
| D-072 | docs/harness-engineering/09-porting-to-a-new-harness.ja.md:5 | 12 | 修正済み(PR #1578) |
| D-073 | docs/reference/00-overview.md:12 | 2 | 修正済み(PR #1577) |
| D-074 | docs/reference/00-overview.ja.md:12 | 2 | 修正済み(PR #1577) |
| D-075 | docs/reference/01-architecture.md:258 | 6 | 修正済み(PR #1578) |
| D-076 | docs/reference/01-architecture.ja.md:256 | 5 | 修正済み(PR #1578) |
| D-077 | docs/reference/05-agent-system.md:155 | 4 | 修正済み(PR #1578) |
| D-078 | docs/reference/05-agent-system.ja.md:155 | 4 | 修正済み(PR #1578) |
| D-079 | docs/reference/10-knowledge-system.md:166 | 1 | 修正済み(PR #1578) |
| D-080 | docs/reference/10-knowledge-system.ja.md:166 | 1 | 修正済み(PR #1578) |
| D-081 | docs/reference/11-contributing.md:48 | 1 | 修正済み(PR #1578) |
| D-082 | docs/reference/11-contributing.ja.md:42 | 14 | 修正済み(PR #1578) |
| D-083 | docs/reference/17-skill-system.md:17 | 2 | 修正済み(PR #1578) |
| D-084 | docs/reference/17-skill-system.ja.md:17 | 2 | 修正済み(PR #1578) |

#### その他の意味論乖離(5件)

| id | 所在 file:line | 記述の verbatim 断片 | 真実源 | 処置 |
|---|---|---|---|---|
| D-085 | docs/reference/06-hooks-and-tools.md:20-25,27-29,36-42,44-47 | `+-- audit-logger.ts` / `+-- sensor-fire.ts` / `+-- plugin-compose.ts` / `` | `mint-presence.ts` | UserPromptSubmit…`` — 10 個が `amadeus-` prefix 欠落(同ツリー内の `amadeus-stop.ts` / `amadeus-statusline.ts` だけ prefix 有り) | `ls .claude/hooks/amadeus-*.ts` — 実ファイルは**全 12 個が `amadeus-` prefix**。同文書の `**Source:** `.claude/hooks/amadeus-sync-statusline.ts``(:129)とも自己矛盾 | 修正済み(PR #1578) |
| D-086 | docs/reference/06-hooks-and-tools.ja.md:19-25,27-29,36-42,44-46 | 同型(`+-- mint-presence.ts` ほか 9 個が prefix 欠落) | 同上 | 修正済み(PR #1578) |
| D-087 | docs/reference/07-sensor-system.md:52 | `The filename↔id rule is enforced by `tests/unit/t86-sensor-manifest-schema.sh`.` | `ls tests/unit/ \| grep t86` = `t86-sensor-manifest-schema.test.ts`(`.sh` は不在) | 修正済み(PR #1578) |
| D-088 | docs/reference/07-sensor-system.ja.md:51 | 同型(`tests/unit/t86-sensor-manifest-schema.sh`) | 同上 | 修正済み(PR #1578) |
| D-089 | docs/reference/11-contributing.md:48 | `- root `core/` と `harness/` は既存参照の互換 alias であり、source of truth は `packages/framework/` 配下である。` | `ls -la \| grep -E ' (core\|harness)$'` = 不在 — **互換 alias は存在しない**(虚偽の主張。加えて EN 文書中の唯一の日本語行) | 修正済み(PR #1578) |

### pair-drift(6件)

| id | 所在 file:line | 記述の verbatim 断片 | 真実源 | 処置 |
|---|---|---|---|---|
| D-090 | docs/reference/18-workspace-layout.md(全体、:1-147) | `GitHub issue #610 は、Amadeus repository の workspace/package layout を正規化するための課題である。` | EN 面が日本語本文。`grep -cP '[\x{3040}-\x{30ff}]'` = 42 行。CLAUDE.md「Write documentation in English by default」+ `.ja.md` ペア規約に違反 | 修正済み(PR #1577) |
| D-091 | docs/README.md:51 | `Repository layout の設計判断は [Workspace Layout Decision](reference/18-workspace-layout.md) に記録している。` | 同上(EN 面の唯一の日本語行。`.ja.md` に対応記述あり) | 修正済み(PR #1577) |
| D-092 | docs/reference/00-overview.md:41 | `| [Workspace Layout Decision](18-workspace-layout.md) | Issue #610 の repository layout decision: framework source を `packages/framework/` に移し…` | 同上 | 修正済み(PR #1577) |
| D-093 | docs/guide/15-troubleshooting.ja.md(EN:214-249 に対応する節が不在) | EN `## Installer Unavailable — Manual Copy Fallback`(:214) | `grep -n '^## '` EN=12 節 / JA=11 節。JA は当該節を欠く(H3 も EN=19 / JA=18) | 修正済み(PR #1577) |
| D-094 | docs/guide/harnesses/kiro-ide.ja.md(EN:56-64 に対応する節が不在) | EN `## Usage`(:56) | `grep -n '^#\{1,6\} '` EN=8 / JA=7。JA は `## Usage`(使い方)節を欠く | 修正済み(PR #1577) |
| D-095 | README.ja.md:78-83 | 行順 Kiro IDE → Kiro CLI → Claude Code → Codex CLI → OpenCode → Cursor | `git show 6f670c5f2 -- README.md`(PR #1573)が EN のみ Claude → Codex → Cursor → OpenCode → Kiro IDE → Kiro CLI へ並べ替え。JA 未追随(`git show --stat 6f670c5f2` = `README.md \| 6 +++---` の 1 ファイルのみ) | 修正済み(PR #1576) |

### pair-missing(2件)

| id | 所在 file:line | 記述の verbatim 断片 | 真実源 | 処置 |
|---|---|---|---|---|
| D-096 | docs/guide/publishing-setup.md:1 | `# Publishing `@amadeus-dlc/setup`` | `comm -23 /tmp/en.txt /tmp/ja.txt` = 未ペア。`> Languages:` バナーも不在。`grep -rn "publishing-setup" docs/` = 0 hits(索引からも未リンクの孤立文書) | 修正済み(PR #1577) |
| D-097 | docs/guide/team-messaging.md:1 | `# Team Messaging Backend` | 同上(未ペア・バナー不在)。加えて `docs/guide/20-team-mode.ja.md:86` が `[Team Messaging Backend](team-messaging.md)` と **JA 文書から EN 文書へリンク**している | 修正済み(PR #1577) |

### impl-bug(1件)

| id | 所在 file:line | 記述の verbatim 断片 | 真実源 | 処置 |
|---|---|---|---|---|
| D-098 | scripts/promote-self.ts:184 | `export const PACKAGE_HARNESSES = ["claude", "codex", "cursor", "opencode", "kimi"] as const;` | `scripts/plugin-projection.ts:42-50` が**同名 export** `PACKAGE_HARNESSES` を 7 要素(kiro / kiro-ide を含む)で定義。両者は同じ `scripts/` 名前空間で値が異なり、promote-self 側の意味論は実際には `SELF_INSTALL_HARNESSES`(`plugin-projection.ts:56` に同値の canonical 定義が実在)。construction.md「canonical な1定義から導出」違反。実害面: `packageFreshnessArgs`(:186-192)が `scripts/package.ts <harness>` を 5 面しか回さず、core 変更時に kiro / kiro-ide が DIFFERS になる(project.md `cid:build-and-test:bt-dist-regen-seven-harnesses` の実測と一致)。`dist:check`(`package.ts --check`、harness 引数なし)は 7 面を見るため CI で最終的には捕捉される — 修正段では「改名のみ」か「範囲是正」かの裁定が必要 | Issue #1575 起票(impl-bug — 実装は本 intent で変更しない) |

## 解消済み・非該当

### 既知クラスタの現断面での再実測

| 既知クラスタ | 現断面の判定 | 根拠 |
|---|---|---|
| A: README の Kimi 欠落 | **未解消**(D-019〜D-026) | `grep -ci kimi README.md` = **0**、`grep -ci kimi README.ja.md` = **0**。PR #1573(`6f670c5f2`)は `git show --stat` = `README.md \| 6 +++---` の並べ替えのみで、Kimi Code 行は追加されていない。むしろ EN 片側変更により D-095(行順 pair-drift)が新規発生 |
| B: hook 数(11 vs 12) | **未解消**(D-005, D-006, D-009, D-010, D-037) | EN の `06-hooks-and-tools.md:13,15` は `twelve` へ更新済み(**この面のみ解消**)だが、JA 版と `01-architecture.ja.md:476`、`01-getting-started.ja.md:105` は 11 のまま。JA 版は `plugin-compose` 行そのものが不在 |
| C: agent 数 | **部分解消**(D-007, D-008) | `docs/guide/06-agents.md` は 11 domain-expert + 2 reviewer(:257)+ composer(:268)= 14 を正しく記述。`01-architecture{,.ja}.md:60` の `agents/*.md` = 11 のみ未更新 |
| D: sensor 数 | **未解消**(D-013〜D-018, D-038, D-039) | 4 → 6(`answer-evidence`、`model-completeness` 追加) |
| E: 廃止パス `core/`/`harness/` | **未解消**(D-042〜D-084) | root ディレクトリ不在を `ls -la` で実測 |

### 照合したが乖離なし(誤検出の排除記録)

| 対象 | 判定 | 根拠 |
|---|---|---|
| docs/guide/19-plugins.md:129,176,269-275 | **正** | `Seven packaged faces, five self-install faces`、7 面表(kimi 含む)、5 面列挙とも `plugin-projection.ts:42-56` と完全一致。本 intent の是正の模範形 |
| README.md:5 `eleven domain-expert agents` | **正** | `ls packages/framework/core/agents/` 14 − reviewer 2(architecture-reviewer, product-lead)− composer 1 = 11。`docs/guide/06-agents.md:5,257,268` の分類と一致 |
| docs/reference/06-hooks-and-tools.md:13,15 | **正** | `twelve` / `Eleven of the twelve` = 12 と一致 |
| docs/reference/15-stage-definition.md:361 | **非該当** | `milestone 8 migrated all 31 stage files` は過去マイルストーンの経緯記述であり現況主張ではない |
| docs/reference/11-contributing.md:112,154(`amadeus-hotfix.md`) | **非該当** | 「スコープの追加手順」の例示スコープ。実在を主張していない |
| docs/reference/09-testing.md:376(`tNN-stage-SLUG.test.ts`) | **非該当** | プレースホルダ表記 |
| docs/guide/13-customization.md:67 ほか(`.claude/settings.local.json`) | **非該当** | gitignore 対象。利用者が作成する前提の記述 |
| docs/guide/publishing-setup.md:121,153(`dist/cli.js`) | **非該当** | `packages/setup` のビルド生成物(gitignore 対象) |
| docs/reference/18-workspace-layout.md:140(`packages/framework/scripts`) | **非該当** | `Goal: … 将来 `packages/framework/scripts` に移すかを再評価する` — 将来案として明示 |
| docs/reference/11-contributing.ja.md:18,45(`tests/run-tests.ts`) | **非該当** | `ls tests/run-tests.*` = `.sh` と `.ts` の両方が実在 |
| docs/guide/12-cli-commands.md:506(`Sensor 4-state tallies`) | **非該当** | センサー数ではなく終端状態数(4 状態)の記述 |
| docs/guide/harnesses/opencode.md:58,78(`1 of 8 wired` / `eight Cursor-parity core-hook targets`) | **非該当** | 全 hook 数(12)ではなく「Cursor パリティ対象の core hook 8 個」という限定母集団の記述 |
| scripts/plugin-projection.ts:53-55(`the five faces`) | **正** | `SELF_INSTALL_HARNESSES` = 5 と一致 |

## 追検出(B&T 受け入れ基準再実測、2026-07-27)

conductor の FR-3b 受け入れ基準 grep 再実測で、監査の目録化から漏れていた 2 件を追検出(15-troubleshooting ペアは D-093 のみ目録化されていた)。同時に 01-architecture.ja.md:60 の「11個のドメインエキスパート」は限定表現として正当(非乖離)と判定した。

| id | 所在 | 記述 | 真実源 | 処置 |
|---|---|---|---|---|
| D-099 | docs/guide/15-troubleshooting.ja.md:39 | `11 個すべての TypeScript フック(…列挙に amadeus-plugin-compose.ts 欠落)` | `ls .claude/hooks/amadeus-*.ts` = 12(EN :39 は count-free+完全列挙) | 修正済み(PR #1577) |
| D-100 | docs/guide/15-troubleshooting.ja.md:222 | `11 個すべてのフレームワークフック` | 同上(EN :258 は count-free) | 修正済み(PR #1577) |
