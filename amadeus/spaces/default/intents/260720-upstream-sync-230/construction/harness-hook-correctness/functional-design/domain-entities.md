# Domain Entities — harness-hook-correctness

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Entity relationships

```text
HarnessAdapter
  ├─ HookRuntime
  ├─ ProjectContext
  └─ CanonicalHookForward

KiroIdeHookContext
  └─ KiroIdeEventClassifier
       ├─ WrittenPath
       ├─ AgentIdentity
       ├─ HookDrop
       └─ CanonicalHookForward

ClaudeSettingsSource
  └─ ClaudeHookCommand[]
       └─ GeneratedHarnessProjection
```

## HookRuntime and ProjectContext

`HookRuntime`はadapter自身を実行中のBun binaryを表すvalue objectで、値は`process.execPath`から一度だけ得る。PATH探索結果やliteral `bun`を代替値にしない。

`ProjectContext`はchild hookのworkspace rootとcwdを表す。payloadがcwdを持つharnessではその解決値を使い、Kiro IDEのpayload-free contextではadapterのproject resolution seamを使う。runtime pathとproject pathは別の値であり、結合したshell stringではなくargv/cwdとして保持する。

## Public operations

```ts
function spawnHookWithRuntime(args: readonly string[], input: HookInput): SpawnResult;
function parseKiroIdeHookContext(payload: unknown): HookContextResult;
function renderClaudeHookCommand(projectDirVariable: "$CLAUDE_PROJECT_DIR", hook: HookSpec): string;
```

この3関数だけがpublic seamである。`HookRuntime`/`ProjectContext`はspawn入力、`KiroIdeHookContext`はparse成功値、`ClaudeHookCommand`はrender結果へ対応する。event分類、path/identity抽出、drop、settings走査は内部operationである。

## KiroIdeHookContext

| 属性 | 型 | 意味 |
|---|---|---|
| `toolName` | optional string | IDE tool vocabulary |
| `toolArgs` | optional object | IDEでは通常空。file path正本にしない |
| `toolResult` | optional string | write path/agent identityの実測prose source |
| `toolSuccess` | optional boolean | 明示falseだけをfailed toolとして遮断 |

env JSONがempty/malformedなら全field absentのcontextになる。write/subagent等のpayload依存targetでは、これは成功artifact eventではなくadvisory no-opを導く。一方、runtime compile/state syncはcontext fieldを消費しないpayload-free targetなので、empty contextでも`CanonicalHookForward`を構築してaudit-tail/forward-only self-gateを継続する。adapterはこのhost entityをcanonical core inputへ投影した後、coreへ型自体を漏らさない。

## CanonicalHookForward

`CanonicalHookForward`はcore hook filenameとcanonical inputのpairである。targetが非該当ならforwardは存在しない。

| target | canonical input |
|---|---|
| session start/end、stop | payload非依存の既存lifecycle shape |
| audit-and-sensors | `PostToolUse` + `Write/Edit` + absolute `file_path` |
| runtime compile | `PostToolUse` + `Bash` + IDE audit-sync marker |
| state sync | `PostToolUse` + `TaskUpdate` + IDE audit-sync marker |
| log subagent | `SubagentStop` + extracted identity + result |

forwardのlifecycleは`classified → normalized → dispatched → observed`。failed/unknownは`classified → dropped`で終わり、core mutationへ進まない。

## WrittenPath, AgentIdentity, and HookDrop

`WrittenPath`は既知result文型から抽出した非空pathで、relativeなら`ProjectContext`によりabsoluteへ昇格する。unknown wordingから生成しない。

`AgentIdentity`はresult先頭8行にある`Reviewer`または`Agent` markerの値で、末尾markdown emphasisを除去する。空またはmarkerなしは`unknown`。

`HookDrop`はadapter、target、reason、観測snippetを持つadvisory診断である。write-class toolが成功したのにpathを抽出できない場合など、無音no-opにしてはならない状態をdoctor面へ残す。秘密やresult全文は保存しない。

## ClaudeHookCommand and projection

`ClaudeHookCommand`はsettings内の承認済み11 hook command stringを表す。`$CLAUDE_PROJECT_DIR`を含むdirectory/script pathはdouble quote内にある。statuslineとpermission globはこのentity集合に含めず、U07変更前後でbytes不変とする。

`ClaudeSettingsSource`は`packages/framework/harness/claude/settings.json.example`、`GeneratedHarnessProjection`はpackage generatorが作るClaude配布面である。projectionはderived entityで、直接編集しない。

## Non-entities

- core business entity、database record、network service、frontend componentはU07に存在しない。
- PATHはruntime正本ではない。`process.execPath`を取得後のfallback chainを設けない。
- `dist/` file、self-install tree、debug logは正本ではない。
- upstream Kiro IDE payload proseはhost contractであり、Amadeus core domain modelへ昇格させない。
