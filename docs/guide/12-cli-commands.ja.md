# CLI Commands（CLI コマンド）

本章は、`/amadeus [command]` の入力面を扱う参照章である。
harness の中で `/amadeus` に続けて打てるものすべてを扱う。

内容は、隔離 workspace で実行したツール自身の `--help` 出力からそのまま採取する。
記憶からの言い換えは行わない。
出力全体は 50 行あり、ツール自身が出力する 4 節（Scopes、Utilities、Other、Examples）に分けて以下に転載する。
分割した箇所以外に改変はない。

コマンドを打った後に forwarding loop が実際に何をするか（エンジンに対する `next` / `report` の往復）は、[Your First Workflow](02-first-workflow.ja.md)が扱う。

## 概要

help の見出しは、入口の名前と使い方の形を示す。

```
AI-DLC — AI-Driven Development Life Cycle

Usage: /amadeus [command]
```

`/amadeus --help`（または `/amadeus --version`）は、この参照全体をいつでも呼び出せる。
そのため、以下の各節はいつでも自分の端末から 1 コマンドで確認できる。

## Scopes（scope の読み方）

```
Scopes (set depth, test strategy, and stage count):
  bugfix            7 of 32 stages, minimal depth — Fix a specific bug
  enterprise        All 32 stages, comprehensive depth — Regulated enterprise feature, full audit trail
  feature           All 32 stages, standard depth (default) — Default for new features, practical depth
  infra             13 of 32 stages, standard depth — Infrastructure changes
  mvp               22 of 32 stages, standard depth — Skip operations, ship the core
  pdm               12 of 32 stages, standard depth — Product planning and requirements definition without implementation
  poc               8 of 32 stages, minimal depth — Prove feasibility fast
  refactor          8 of 32 stages, minimal depth — Clean up existing code
  security-patch    10 of 32 stages, minimal depth — CVE response
  workshop          25 of 32 stages, standard depth, minimal test strategy — Facilitated group session with mandatory gates
```

各行は、scope 名に続けて、括弧書きが挙げる 3 点（32 stage のうち何個を実行するか、depth、test strategy）を示す。
test strategy を上書きするのは `workshop` だけである。
`feature` が既定 scope である。
`/amadeus feature`（または scope を指定しない `/amadeus`）で選べる。
「N of 32 stages」の内訳となる正確な EXECUTE / SKIP の stage 集合は、[scopes 契約](../amadeus/lifecycle/scopes.ja.md)が定義する。
本章では繰り返さない。

## Utilities（ユーティリティ）

```
Utilities:
  --status          Show current workflow progress (read-only)
  compose "<task>"  Propose a tailored EXECUTE/SKIP plan (mid-workflow: re-shape the pending stages)
  compose --report <path>  Compose from a scan report (triage findings into a fix-and-ship run)
  --new-scope "<task>"  Force the composer to synthesize a custom scope even when a stock scope matches
  intent            List intents in the active space (read-only; --json for structured output)
  intent <name>     Switch the active intent
  space             List spaces (read-only; --json for structured output)
  space <name>      Switch the active space (team)
  space-create <name>  Create a new space (team) seeded from the framework baseline
  codekb-path       Print the deterministic per-repo codekb directory (read-only)
  --doctor          Run health check on hooks, settings, and directory structure
  --stage <id>      Jump to a specific stage (by slug or number, e.g., code-generation or 3.5)
  --phase <name>    Jump to the first in-scope stage of a phase (e.g., construction or 3)
  --scope <scope>   Set or change scope (standalone or with --stage/--phase)
  --depth <level>   Override depth (minimal, standard, comprehensive)
  --test-strategy <level>  Override test strategy (minimal, standard, comprehensive)
  --version         Show the framework version
  --help            Show this help message
```

この 18 行は、2 つの系統に分かれる。

**read-only 系**：`--status`、`intent`、`space`、`codekb-path`、`--doctor` は workspace を確認するだけであり、エンジンが次に実行する内容を変えない。
`intent` と `space` は、引数なしなら一覧、名前を渡すなら切り替えになる。
`--version` と `--help` も、同じ意味で read-only である。

**ワークフロー系**：`compose "<task>"`、`compose --report <path>`、`--new-scope "<task>"`、`--stage <id>`、`--phase <name>`、`--scope <scope>`、`--depth <level>`、`--test-strategy <level>` は、いずれも今後の実行内容を変える。
調整済みの計画を提案する場合もあれば、既存の実行を jump または上書きする場合もある。
`space-create <name>` は、既存の実行を確認も操作もせず、新しい space を作る点でどちらの系統にも属さない。

`--stage` と `--phase` は、それぞれの説明にある slug または番号（例: `code-generation` または `3.5`、`construction` または `3`）で受け取る。
その jump を受けたエンジンが実際に何を行うか（`next` / `report` の仕組み）は、[Your First Workflow](02-first-workflow.ja.md)が扱う。
本章では繰り返さない。

## Other（その他）

```
Other:
  <description>     Describe what to build — scope is auto-detected
  (no arguments)    Resume existing workflow, or start fresh if none exists
```

scope や flag の代わりに自由記述を打つと（例えば `/amadeus Fix the login timeout bug`）、その文字列から scope が自動判定される。
何も続けずに `/amadeus` だけ打つと、既存のワークフローがあれば再開し、なければ新規に始める。
その先で起きる birth と、そこで作られる状態については、[Your First Workflow](02-first-workflow.ja.md)が扱う。

## Examples（実行例）

```
Examples:
  /amadeus feature                                Start a feature workflow
  /amadeus Fix the login timeout bug              Auto-detected as bugfix scope
  /amadeus compose "harden the deploy pipeline"   Composer proposes a tailored plan
  /amadeus                                        Resume or begin
  /amadeus --stage code-generation                Jump to code-generation stage
  /amadeus --phase construction --scope bugfix    Jump to construction with bugfix scope
  /amadeus --scope bugfix --depth comprehensive  Bugfix with comprehensive depth
  /amadeus --depth minimal                       Change depth of active workflow
  /amadeus --depth standard --test-strategy minimal  Full artifacts, minimal tests
```

各行は、これまでの節で挙げた scope、jump、上書きのいずれかを組み合わせたものである。
Scopes、Utilities、Other の説明を超える新しい要素はない。

## 次に読むもの

コマンドを受け取った後にエンジンの中で何が起きるか（`next` / `report` の loop、birth、そこで書かれる状態）は、[Your First Workflow](02-first-workflow.ja.md)が扱う。
`--stage`、`--phase`、各 scope の EXECUTE / SKIP 集合の stage 単位の詳細は、[Lifecycle Contract Overview](../amadeus/lifecycle/overview.ja.md)と[scopes 契約](../amadeus/lifecycle/scopes.ja.md)が扱う。
各章の状態は、ガイドの[目次](index.ja.md)で確認できる。
