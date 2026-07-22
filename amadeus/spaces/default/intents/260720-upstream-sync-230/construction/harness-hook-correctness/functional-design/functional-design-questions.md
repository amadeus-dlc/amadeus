# Functional Design Questions — harness-hook-correctness

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。
>
> 一次同期根拠: upstream commits `ff7c15b`（execpath spawn）、`300b640`（Kiro IDE hook context）、`6f597ce`（Claude project-dir quoting）と、承認済み ledger の `execpath-spawn` / `kiro-ide-hook-context` / `project-dir-quoting`。
>
> E-OC1 判定: **質問0問**。leader承認 `2026-07-20T10:14:43Z`。

## 質問不要の根拠

U07の設計判断は承認済みの上流同期plan、Requirements Analysis、Application Design、Units Generationで閉じている。

- runtime起動: bare `bun` を `process.execPath` へ置換し、6 harnessの該当adapterへ同じ契約を適用する。新しいruntime選択肢は設けない。
- Kiro IDE context: `USER_PROMPT`、audit-tail-gated payload-free event、agent identity、failed-tool guard、opt-in debug logをhost adapter内で正規化し、2秒stdin raceへ依存しない。
- Claude command: shipped settings内の全11 hook commandで `$CLAUDE_PROJECT_DIR` をdouble quoteし、生成物はpackage経由で同期する。
- ownership: host固有payload変換とquotingはC6 adapterが所有し、coreへhost固有型を持ち込まない。新しいservice、database、UI、network dependencyはない。
- failure/verification: PATH除去、空白path、payloadなし、failed tool、subagent identityをfixture化し、通常stdoutをdebug出力で汚さない。

これらは「何を選ぶか」ではなく既決contractの適用であり、代替案を新たに選ぶ余地がない。実装開始前のdiff-refreshで既存配置が変わっていた場合も、contract変更ではなく現行choke pointへの再マップとして扱う。contractの不一致が見つかった場合だけ未決判断として停止し、選挙へ付議する。

## [Answer]

[Answer]: 質問0問で可。E-OC1でleader承認済み（`2026-07-20T10:14:43Z`）。Iteration 1後のE-OC1分類（`2026-07-20T14:55:47Z`）により、public seamは`spawnHookWithRuntime(args: readonly string[], input: HookInput): SpawnResult`、`parseKiroIdeHookContext(payload: unknown): HookContextResult`、`renderClaudeHookCommand(projectDirVariable: "$CLAUDE_PROJECT_DIR", hook: HookSpec): string`の正準3 signatureへ復帰し、Claude quoting対象は承認済み11 hook commandだけへ縮退する。statusline/permission globへの未承認拡張は撤回し、両面のbytesを不変にする。これは無承認差分の除去であり追加選挙不要。
