# Code Summary — U3 cursor-port(Bolt 3)

intent: `260715-opencode-cursor-harness` / PR: [#1046](https://github.com/amadeus-dlc/amadeus/pull/1046) / branch: bolt/cursor-port(285bc354d)
上流: code-generation-plan.md、上流参照(consumes 全数): requirements.md、unit-of-work.md(U3)、functional-design 一式、nfr-design 一式。

## 変更ファイル

- authored 6(新規): `packages/framework/harness/cursor/{manifest.ts, emit.ts, dot-gitignore, commands/amadeus.md, hooks/amadeus-cursor-adapter.ts, hooks/amadeus-cursor-lib.ts}` — adapter は seam 分割(ロジック = lib で 100% 被覆、runnable thin entrypoint = adapter でテスト非 import、bun-coverage-spawn-blindspot 回避)
- test 1(新規): tests/integration/t-cursor-adapter.test.ts(37 tests、exit 値アサート)
- generated 228: dist/cursor/**(`amadeus/active-space` は git add -f で明示同梱 — codex 前例)

## 工程0 実測記録(Cursor hooks docs、照会日 2026-07-16)

- exit 意味論: exit 0 = stdout JSON 採用 / exit 2 = deny / その他 = fail-open(`failClosed:true` 時のみ fail-closed、既定 false)→ 実装停止条件は不発火
- tool_name 値集合: 部分実測可・一部実測不能につき汎用 postToolUse を降格(plan 履歴1)。ToolNameMap は実測確定値のみの Readonly 定数 `{ afterShellExecution: "Bash", afterFileEdit: "Edit" }`。未登録識別子は advisory 拒否(exit 2 不使用、EXIT_ADVISORY_FAIL=1)
- 出荷 hooks イベント 8件(hooks.json.example): sessionStart / beforeSubmitPrompt / afterShellExecution / afterFileEdit / subagentStop / preCompact / stop(advisory、block wire 契約未検証のため exit 0 固定)/ sessionEnd — dead entry ゼロ

## 検証記録(全実測)

| 検証 | 結果 |
| --- | --- |
| package.ts / dist:check ×2(冪等)/ typecheck / lint / promote:self:check | exit 0 |
| tests | t-cursor-adapter 37 pass 0 fail |
| 落ちる実証 | emit の AGENTS.md エントリ削除 → dist:check exit 1(`ORPHAN in dist: cursor/AGENTS.md`)→ 復元+再 package → exit 0 |
| AC-3b(repo 外 scratch へ dist/cursor 手動配置) | version → `amadeus 0.1.2` / doctor → 30 passed 1 failed(唯一の fail = scratch に settings.json 不在という harness 中立の環境要因)/ orchestrate next "poc: demo" → typed directive(kind:ask)受領 |
| AC-4d | core/scripts/installer への cursor/opencode 追加ヒット 0(git diff+grep) |
| lcov | 新規正本4ファイル(emit/manifest/lib/adapter)未カバー 0 行 |
| deslop | 除去対象なし(any/ts-ignore/TODO/placeholder ゼロ) |

## 既知事象(自コード無関係)

`t-team-up-codex-resume.test.ts` は live 環境の `TEAM_MUX=herdr` 漏れで 20/32 fail(CI Linux は未設定で green、`TEAM_MUX=tmux` 強制で 32/32 pass 実測)。本 PR は team-up.sh 系に非接触。TEAM_MUX 自体は #1031(intent 260716、E-TU1 裁定)で完全撤去予定のため重複起票は保留。

## レビュー

- e2(実装者以外、レビュアー分散: #1044 は e4)に依頼済み(2026-07-16T00:32Z ack 受領)— verdict は PR コメント予定
