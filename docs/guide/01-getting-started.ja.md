# Getting Started（はじめに）

## 前提条件

- **Bun**：`amadeus-utility.ts`、`amadeus-orchestrate.ts` をはじめとする `.agents/amadeus/tools/` 配下の全 CLI ツールと、installer 自身を実行する。
- **git**：installer は Amadeus リポジトリの clone から実行する。ダウンロードした archive からは実行しない。
- `amadeus` skill を動かすコーディング harness。
  本ガイドの例は **Claude Code** を前提にする。
  **Codex** でも動く。`.agents/` だけで完結する standalone install であり、`.claude/` の配線は不要である。

## 導入する

Amadeus リポジトリを clone し、その clone から installer を実行する。
対象は Amadeus を導入したい workspace である。

```sh
git clone https://github.com/amadeus-dlc/amadeus.git
cd amadeus
bun run scripts/amadeus-install.ts --target <workspace>
```

または、次のコマンドでも同等である。

```sh
npm run amadeus:install -- --target <workspace>
```

`<workspace>` は、Amadeus DLC を動かしたい対象プロジェクトである。
自分のプロジェクトの path に置き換える。
空のディレクトリでも最初の導入確認には十分使える。以下の実行例も、空のディレクトリへ導入した結果である。

新規 workspace への実行結果を次に貼る（絶対 path は `<workspace>` に短縮した。それ以外は変更していない）。

```
amadeus-install: installing into <workspace>
[1/5] engine        .agents/amadeus/ (7 dirs, replaced)
[2/5] skills        .claude/skills/amadeus*, .agents/skills/amadeus* (replaced)
[3/5] symlinks      .claude/{agents,amadeus-common,hooks,knowledge,scopes,sensors,tools} (recreated)
[4/5] settings      .claude/settings.json (hooks merged: 11 entries, 0 duplicates)
[5/5] smoke         doctor check passed
note: workspace shell is seeded at your first /amadeus workflow (known state on a fresh install)
amadeus-install: done. Next: see README "導入後の検証" (doctor / amadeus-validator)
```

ステップ 5 は smoke check として `doctor` を実行する。
workspace shell についての note は新規導入直後の想定済みの表示であり、shell は installer ではなく最初の workflow 実行が作る。対応する `doctor` の行は後述の「導入を検証する」で、seed される瞬間は [Your First Workflow](02-first-workflow.ja.md) で示す。

## 導入されるもの

- エンジン本体 `.agents/amadeus/`（7 ディレクトリ。`agents`、`amadeus-common`、`hooks`、`knowledge`、`scopes`、`sensors`、`tools`）。
- `amadeus*` skill 群。`.claude/skills/` と `.agents/skills/` の両方に配置する。
- `.claude/{agents,amadeus-common,hooks,knowledge,scopes,sensors,tools}`：`.agents/amadeus/` への相対 symlink。
- workspace root の `AMADEUS.md`。利用者向けに変換済みである（開発専用の節は除去済み）。
- Amadeus の hooks 配線。`.claude/settings.json` へ merge する。既存の `env`、`permissions`、他 tool の hooks などの既存キーには触れない。

Codex 利用者には `.claude/` の配線は不要である。`.agents/` だけで完結する standalone install である。

## 導入を検証する

```sh
bun <workspace>/.agents/amadeus/tools/amadeus-utility.ts doctor --project-dir <workspace>
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts <workspace>
```

`doctor` は、installer がステップ 5 で実行したものと同じ health check である。
直接実行すると、installer の 1 行要約ではなく全文のレポートが得られる。
新規導入直後は、次のとおり全件 pass する。

```
AI-DLC Health Check
─────────────────────────────────────
✓  bun installed (required for CLI tools and hooks)
✓  amadeus-audit-logger.ts present
✓  amadeus-log-subagent.ts present
✓  amadeus-mint-presence.ts present
✓  amadeus-runtime-compile.ts present
✓  amadeus-sensor-fire.ts present
✓  amadeus-session-end.ts present
✓  amadeus-session-start.ts present
✓  amadeus-stop.ts present
✓  amadeus-sync-statusline.ts present
✓  amadeus-validate-state.ts present
✓  settings.json present
✓  AWS_AIDLC_DEFAULT_SCOPE (unset — no project default)
✓  workspace shell pending first workflow — seeded at first intent birth (run your first /amadeus workflow)
✓  Hook heartbeats: not yet fired (first workflow stage will populate)
✓  Audit locks: none leaked
✓  Orphan worktrees: 0 observed
✓  Stale branches: 0 (0 bolt-* observed)
✓  Orphan state files: 0 observed
✓  Orphan audit: 0 observed
✓  Practices staleness: state file absent (informational)
✓  MERGE_DISPATCH: 0 orphan INVOKED (0 bracketed)
✓  Cycle detection: 0 cycles
✓  Orphan stage files: 32 graph entries all have files
✓  Uncompiled stage files: 0 stage files missing from the compiled graph
✓  Scope validation: 10 scopes valid (27 advisories)
✓  Schema validation: 32/32 stages validated
✓  Graph references: 122 artifacts + edges resolved
✓  Keyword overlap: no conflicts
✓  Rule drift: org rules absent (informational)
✓  Paired sensor coverage: no sensor-bound rules (0 feedforward-only)
✓  Intent registry: all rows ⇄ record dirs reconciled
─────────────────────────────────────
32 passed, 0 failed
```

注意して読む価値があるのは `workspace shell pending first workflow` の行である。
installer はエンジンと skill を配置するが、Space shell（`amadeus/spaces/default/memory/`）は installer ではなく最初の workflow 実行が作る。
この行は、最初の workflow を実行した時点で `workspace shell ready` へ切り替わる。実際に切り替わる様子は [Your First Workflow](02-first-workflow.ja.md) で示す。

## 更新する

更新するには、同じ workspace に対して同じ導入コマンドを再実行する。

```sh
bun run scripts/amadeus-install.ts --target <workspace>
```

冪等である。置き換え対象の内容は毎回同じ結果に収束し、hooks の merge も重複エントリを作らない。
