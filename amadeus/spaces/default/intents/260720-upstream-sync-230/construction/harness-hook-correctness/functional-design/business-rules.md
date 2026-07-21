# Business Rules — harness-hook-correctness

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Harness invariants

正準public seamは次の3 signatureだけである。

```ts
function spawnHookWithRuntime(args: readonly string[], input: HookInput): SpawnResult;
function parseKiroIdeHookContext(payload: unknown): HookContextResult;
function renderClaudeHookCommand(projectDirVariable: "$CLAUDE_PROJECT_DIR", hook: HookSpec): string;
```

| ID | ルール | 失敗時 |
|---|---|---|
| BR-U07-01 | authored adapterがBun childを再起動する該当siteはbare `bun`でなく`process.execPath`をargv[0]に使う。 | PATH-dependent spawnとしてtest失敗 |
| BR-U07-02 | runtime置換はstdin/stdout/stderr/cwd/exit codeを変えない。 | adapter contract regression |
| BR-U07-03 | 6 harnessを全数inventoryするが、spawn siteがないharnessへdormant wrapperを追加しない。 | C6境界/最小差分違反 |
| BR-U07-04 | Kiro IDE adapterはstdinを待たず、contextを`USER_PROMPT`から取得する。 | 2秒race再導入として拒否 |
| BR-U07-05 | `toolSuccess === false`のwrite系eventをartifact updateとしてaudit/sensorへ送らない。 | false successとしてtest失敗 |
| BR-U07-06 | write pathは既知`toolResult`文型からのみ抽出し、抽出不能はvisible hook-dropにする。 | 推測path/無音dropを禁止 |
| BR-U07-07 | IDEのworkspace-relative pathはproject root基準の絶対pathへ正規化してからcoreへ渡す。 | record-root外/誤workspace更新を拒否 |
| BR-U07-08 | payload-free runtime/state eventはaudit tailで自己gateし、completed/skipped/parked stateを過去の`STAGE_STARTED`へ巻き戻さない。 | forward-only違反 |
| BR-U07-09 | hook debugは明示opt-inだけで有効にし、通常stdoutを汚さず、debug失敗でhookを失敗させない。 | NFR-3互換性違反 |
| BR-U07-10 | 承認済み11 Claude hook command内の`$CLAUDE_PROJECT_DIR`だけをdouble quoteする。statuslineとpermission globは変更しない。 | 空白path fixture/対象外bytes差分をtest failure |
| BR-U07-11 | 正本は`packages/framework/`配下であり、`dist/`はpackage generatorだけが更新する。 | 手編集projectionを拒否 |
| BR-U07-12 | host固有payload型・tool名・result文型をcoreへ移さない。 | ADR-7/C-4違反 |
| BR-U07-13 | public seamは`spawnHookWithRuntime`、`parseKiroIdeHookContext`、`renderClaudeHookCommand`の正準signatureだけ。分類・抽出・走査は内部helper。 | 未承認public APIを拒否 |

## Kiro IDE classification rules

| IDE input | Canonical action | 副作用 |
|---|---|---|
| `fs_write` + success + extractable path | `Write` | audit後にsensor |
| `str_replace` / `fs_append` + success + extractable path | `Edit` | audit後にsensor |
| write-class + `toolSuccess=false` | none | artifact eventなし |
| write-class + unknown result wording | none | visible hook-dropのみ |
| `runtime-compile` target | `Bash`相当のIDE audit-sync | audit tailがtransitionを示す場合だけcompile |
| `state-sync` target | `TaskUpdate`相当のIDE audit-sync | runningかつforward-onlyの場合だけstate反映 |
| delegated result with identity marker | `SubagentStop` | 実identityとresult snippetを記録 |
| malformed/empty `USER_PROMPT` + payload依存target | empty context | advisory no-op |
| malformed/empty `USER_PROMPT` + runtime/state payload-free target | empty context | audit-tail/forward-only経路を継続 |

path抽出は`Created the <path> file.`、`Appended the text to the <path> file.`、`Replaced text in <path> (…optional suffix)`の既知文型に閉じる。trim後に照合し、括弧suffixをpathへ含めない。新文型を推測で広げず、実測fixtureと一緒に追加する。

## Runtime and quoting policies

- `process.execPath`はadapterを実際に起動したBun binaryの絶対pathであり、新たなruntime discoveryや環境変数fallbackを設けない。
- child cwdはadapterが解決したworkspaceを保つ。worktree payloadがあるadapterで`process.cwd()`へ後退しない。
- deeper core child spawnは別inventoryとして検査するが、U07のadapter修正が保証していない範囲を成功と主張しない。残存bare spawnが採用contractに該当すれば同Unit内で直し、別責務なら反証可能な残余として報告する。
- Claude settingsの検証は承認済み11 hook commandへ閉じ、各commandのquoteと件数を検査する。statusline/permission globはbefore/after bytes不変を独立にassertする。
- source、6 harness projection、4 self-installは混同しない。U07は該当6面package projectionを同期するが、self-install対象を増やさない。

## Error and compatibility rules

- unknown IDE event、欠落payload、debug無効時はpayload依存分類のadvisory no-opを維持する。失敗eventを成功へ、成功eventを推測pathへ変換しない。runtime compile/state syncはpayload-free targetなので、empty/malformed `USER_PROMPT`でもno-opにせずaudit-tail/forward-only self-gateへ必ず到達させる。
- audit-and-sensorsは常にaudit first。片方のadvisory失敗をもう片方の成功証拠として扱わない。
- default environment、空白なしworkspace、debug offの公開出力は変更前とbyte-compatibleに保つ。
- 新runtime dependency、network access、credential surface、database/service/UI entityを追加しない。

## Verification rules

- PATH除去fixtureは前提としてPATH中にbun executableが0件であることをassertしてからadapterを`process.execPath`で起動する。
- Kiro IDE fixtureはpositive/negativeを対にし、failed tool、unknown wording、payload-free event、identityなしを必ず含める。
- Claude testはauthored settingsと生成projectionを両方parseし、11 hook commandの未引用0、hook path実在、空白path実行、statusline/permission bytes不変を確認する。
- `bun run typecheck`、`bun run lint:check`、targeted adapter tests、`bun run dist:check`、`bun run promote:self:check`をBolt gateへ渡す。
