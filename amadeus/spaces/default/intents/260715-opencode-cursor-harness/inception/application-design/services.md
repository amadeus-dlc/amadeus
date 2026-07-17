# Services — ユーザー可視サービス面(opencode / Cursor)

intent: `260715-opencode-cursor-harness`。上流: `../requirements-analysis/requirements.md`(FR-2 / FR-3 の到達ライン)、codekb の architecture.md / component-inventory.md、`../practices-discovery/team-practices.md`。

## サービス一覧(ユーザーから見た操作面)

| サービス | opencode | Cursor | 実体 |
| --- | --- | --- | --- |
| workflow 起動 | `.opencode/commands/amadeus.md`(`$amadeus` 相当) | `.cursor/commands/amadeus.md` | いずれも orchestrator forwarding loop(`bun .opencode/tools/amadeus-orchestrate.ts next` / `.cursor/` 同)への導線 |
| バージョン確認 | command 経由 or `bun <tree>/tools/amadeus-utility.ts version` | 同左 | handleVersion(harness 非依存を RE 実測済み) |
| セットアップ診断 | 同上 `--doctor` | 同左 | handleDoctor(`.claude` 専用ブロックは advisory 劣化 — README に記載) |
| ルール層の適用 | AGENTS.md + `.opencode/amadeus-rules/` | `.cursor/rules/amadeus.mdc`(alwaysApply)+ `.cursor/amadeus-rules/` | 五層チェーン org→team→project→phase→stage は engine 側解決で不変 |
| ライフサイクル hooks | 初期スコープ外(将来 Issue — plugins) | `hooks.json.example`(sessionStart/beforeSubmitPrompt/postToolUse/stop/sessionEnd) | Cursor のみ初期対応。cloud/CLI の非対応イベントは機能表に明示 |

## 到達ライン検証手順(AC-6b の証跡様式)

1. `bun scripts/package.ts` → `dist/opencode/`・`dist/cursor/` 生成(exit 0)
2. 検証用プロジェクトへ手動配置(installer 非経由 — E-OC7 Q1=B の証跡手順)
3. 各ハーネスで `--version` / `--doctor` / workflow start(intent birth → intent-capture directive 受領)を実測し、コマンドと exit code を build-and-test 成果物に記録

## 機能単位の対応表(FR-7 / AC-3c 留保 ii の記載様式 — docs へ転記する原型)

| 機能 | claude | opencode | cursor(IDE) | cursor(CLI/cloud) |
| --- | --- | --- | --- | --- |
| engine ツール群(orchestrate/state/log/sensor/learnings) | ✅ | ✅(bun 直叩き) | ✅ | ✅ |
| --version / --doctor | ✅ | ✅(doctor は advisory 劣化) | ✅(同) | ✅(同) |
| 起動導線(command/skill) | ✅ skills | ✅ commands+skills | ✅ commands | ✅ commands |
| session lifecycle hooks | ✅ | ❌(初期スコープ外 — 将来 plugins) | ⚠(hooks.json — tool_name 語彙の実装時実測が確定条件、component-methods.md C2 参照) | ❌(sessionStart/sessionEnd 非対応 — Cursor 仕様) |
| prompt-submit / post-tool / stop hooks | ✅ | ❌(同上) | ⚠(同上 — 実測確定まで ✅ を確約しない) | ⚠(command-based のみ+同上) |
| per-stage runner skills(/amadeus-<stage> 32本) | ✅ | ❌(初期スコープ外 — --stage <slug> --single の素の経路で代替) | ❌(Cursor に skills 受け皿なし — commands で orchestrator/一部導線のみ) | ❌(同) |
| orchestrator/session skills 一式 | ✅ | ✅(.opencode/skills/) | ❌(受け皿なし — AGENTS.md+commands で誘導) | ❌(同) |
| statusline | ✅ | ❌ | ❌(Cursor に statusline hook なし) | ❌ |
| self-install(promote:self) | ✅ | ❌(E-OC7 Q2=A、非 dogfood) | ❌(同) | ❌ |
| installer(amadeus-setup) | ✅ | ❌(E-OC7 Q1=B、別 Issue) | ❌(同) | ❌ |
