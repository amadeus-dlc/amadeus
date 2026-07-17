# Reverse Engineering — Developer スキャン結果

intent: 260716-opencode-plugins-hooks(Issue #1049)
手法: diff-refresh(project.md c1)。base = `1e22d6a889ca71cab82a056e07edc8a46110a297`(祖先性 `git merge-base --is-ancestor` で実測確認、距離115 最小)。区間 `1e22d6a..HEAD`(HEAD=`2d8240eb3`)の diff とフォーカス面の現物直読。
すべての引用は当作業ツリー(engineer-3、読み取り専用)での file:line 実測。推測は「仮説」と明記。

---

## サマリ(後続ステージへの要点)

- **中核ギャップの実測確認**: opencode harness の manifest は `coreDirs` に `{ src: "hooks", dst: "hooks" }` を持つ(`packages/framework/harness/opencode/manifest.ts:46`)。このため 11 個の core hook が `dist/opencode/.opencode/hooks/` に**コピー済み**(実測: `dist/opencode/.opencode/hooks/` に 11 ファイル)。しかし **hooks を起動する仕組み(adapter / plugin / 配線ファイル)が一切無い**。opencode harness source には `commands / dot-gitignore / emit.ts / manifest.ts` しか無く(実測 `ls packages/framework/harness/opencode/`)、`plugin/` も `hooks.json` 相当も存在しない。→ core hook は dist に**入っているが死んでいる(呼ばれない)**。これが intent が埋める穴。
- **模範実装は cursor harness**。cursor は stdin-hook 方式(`hooks.json.example` + adapter shim が subprocess で core hook へ stdin パイプ)で同じ core hook 群を配線している。opencode は @opencode-ai/plugin の**イン・プロセス JS/TS モジュール**方式のため、adapter の「stdin 再構成 → core hook 起動」ロジックは流用できるが、入口(entrypoint)が subprocess-stdin ではなくイベントハンドラになる。
- **R-1(HUMAN_TURN 写像)は肯定解消済み**(conductor 提供の外部実測): @opencode-ai/plugin の `chat.message` フックが UserMessage を直接観測できる → mint-presence 相当(HUMAN_TURN)を写像可能。
- **区間差分(base..HEAD 115コミット)**: フォーカス面で変化があったのは `amadeus-lib.ts` のみ(118 挿入)。主因は `6f11f6d5c feat(installer): add opencode and cursor to the known-harness enum (#1109)`。opencode/cursor の harness dist ツリー・core hooks・package.ts・manifest-types.ts は**この窓の前に既に整備済み**(窓内で無変更)。
- **installer の値化**: setup CLI の `HarnessName` は 6 値(`claude | codex | kiro | kiro-ide | opencode | cursor`、`packages/setup/src/domain/harness.ts:9`)。engine 側 `KNOWN_HARNESS_DIRS` は 5 値(`.claude .kiro .codex .opencode .cursor`、`packages/framework/core/tools/amadeus-lib.ts:121` — kiro-ide は `.kiro` を共有するため dir としては 5)。

---

## フォーカス1: core hooks 台帳(stdin 入力契約・exit code 契約)

正本ソース = `packages/framework/core/tools/`… ではなく hooks 本体は `.claude/hooks/`(= core/hooks の当ハーネス投影。cursor lib のコメント `amadeus-cursor-lib.ts:2-3` が「beside it の amadeus-*.ts hook 本体は PACKAGED core、Claude Code harness と byte-shared」と明記)。以下は `.claude/hooks/` 実測(全ハーネスで byte-identical)。

Claude settings.json のイベント配線(`.claude/settings.json` 実測、行番号は当該ファイル):
- `UserPromptSubmit`(matcher "") → mint-presence(:56-57)
- `SessionStart`(matcher "") → session-start(:67-68)
- `SessionEnd`(matcher "") → session-end(:78-79)
- `PostToolUse` matcher `Write|Edit` → audit-logger(:89-90)+ sensor-fire(:93-94)
- `PostToolUse` matcher `TaskUpdate` → sync-statusline(:102-103)
- `PostToolUse` matcher `AskUserQuestion` → **mint-presence(:111-112)**(同一 hook が2経路。後続注意点参照)
- `PostToolUse` matcher `Bash` → runtime-compile(:120-121)
- `PreCompact`(matcher "") → validate-state(:131-132)
- `SubagentStop`(matcher "") → log-subagent(:142-143)
- `Stop`(matcher "") → stop(:153-154)
- statusLine command → statusline(:47-48、hook イベントではなく statusline コマンド)

| hook | イベント | stdin で読むフィールド(file:line) | 出力/効果 | exit code 契約 |
|---|---|---|---|---|
| amadeus-mint-presence.ts | UserPromptSubmit(+ AskUserQuestion PostToolUse) | `prompt`:string(:63-64)。`isClaudeCodeHookInput` 経由(:62) | HUMAN_TURN を audit shard へ append(:74)。machine-injected(`isMachineInjectedTurnText`)なら抑止(:65) | 常に `process.exit(0)`(:80)。fail-open: stdin 不読/非JSON/prompt無 → mint(:57,:60,:64,:66-68)。TTY→分類不能=fail-open mint(:57) |
| amadeus-session-start.ts | SessionStart | `source`:string(startup/resume/clear/compact)(:93)、`session_id`:string(:94) | SESSION_STARTED / SESSION_RESUMED、コンテキスト注入、session→intent rebind | state 不在→`exit(0)`(:63)。TTY/空→source=startup(:73-76,:81)。非JSON→source=malformed(:99) |
| amadeus-session-end.ts | SessionEnd | `reason`(:39、`raw.reason`) | SESSION_ENDED(Reason)(:49) | state 不在→`exit(0)`(:23)。TTY→reason="unknown" スキップ read(:34)。非JSON→unknown(:43-45) |
| amadeus-audit-logger.ts | PostToolUse Write\|Edit | `tool_name`(:45)、`tool_input.file_path`(:46) | ARTIFACT_CREATED / ARTIFACT_UPDATED(:122)。record 配下のみ(:56-57)、audit shard 除外(:62-68) | TTY→`exit(0)`(:33)。非JSON→`exit(0)`(:39,:42)。record 外/shard/audit無→`exit(0)`(:57,:67,:74)。emit 失敗→drop 記録+`exit(0)`(:131-132) |
| amadeus-sensor-fire.ts | PostToolUse Write\|Edit | `tool_input.file_path`(:76) — **tool_name は読まない**(:61 コメント明記) | 宣言センサーを fire(dispatcher 起動)。SENSOR_PASSED/FAILED は audit 行で判定 | TTY→`exit(0)`(:56)。非JSON/file無→`exit(0)`(:66,:69,:77)。以降各 guard で `exit(0)`。最終 `exit(0)` 常に advisory(:92-93、"G5") |
| amadeus-runtime-compile.ts | PostToolUse Bash | `tool_input.command`(:59)、`tool_response`(:68)、`session_id`(:69) | `amadeus-runtime.ts compile` を dispatch(遷移クラス audit 検出時)。migration latch 武装も(:68-70,:75) | TTY→`exit(0)`(:47)。非JSON→`exit(0)`(:54,:57)。以降 spawn は time-bounded、失敗は drop 記録で非ブロック |
| amadeus-sync-statusline.ts | PostToolUse TaskUpdate | `tool_input.status`(:41)、`tool_input.activeForm`(:46) | `activeForm` 末尾 `[slug]` 抽出→`amadeus-utility.ts set-status`(:67-74) | TTY→`exit(0)`(:29)。status≠in_progress→`exit(0)`(:44)。activeForm無/slug無/state無→`exit(0)`(:47,:52,:56)。set-status 失敗→drop 記録(非ブロック) |
| amadeus-log-subagent.ts | SubagentStop | `agent_type`(:44、normalize、""可)、`agent_id`(:45)、`last_assistant_message`(:46、200字) | SUBAGENT_COMPLETED(:66) | TTY→`exit(0)`(:31)。非JSON→`exit(0)`(:37,:39)。audit無/workflow complete→`exit(0)`(:51,:57)。emit 失敗→drop+`exit(0)`(:68-69) |
| amadeus-validate-state.ts | PreCompact | **stdin フィールドは読まない**(state file を読む) | SESSION_COMPACTED(:65)+recovery breadcrumb(:53-57)。state 必須セクション検証(:38-39) | state 不在→`exit(0)`(:32)。emit 失敗→drop(非致命、:74-75)。明示 exit 無しで末尾正常終了 |
| amadeus-stop.ts | Stop | `stop_hook_active`(:822 コメント)、`transcript_path`(:823-828)、`session_id`(:791-794) | **判断出力**: allowStop=何も出さず`exit(0)`(:159-160)、blockStop=`console.log(JSON.stringify({decision:"block",reason}))`+`exit(0)`(:166-168) | **advisory。自身の block は exit 2 ではなく stdout JSON `{decision:block}`+exit 0**(header :6-8)。TTY/state無/migration latch→allowStop(:771,:795,:800)。unreadable state→fail-open(:818) |
| amadeus-statusline.ts | statusLine コマンド | `workspace.project_dir`(:17,:24) | statusline 文字列を stdout | TTY→stdin skip(:216-219)。非JSON→derived project dir へフォールバック(:222-224) |

補足(exit 2 の位置づけ): cursor lib の 工程0 実測コメント(`amadeus-cursor-lib.ts:22-29`)によると Claude/Cursor 系の exit-code 契約は「exit 0 = stdout JSON を使う / exit 2 = DENY / other = fail-open」。core hook で exit 2 を能動的に出すものは**無い**(stop も block を stdout JSON で表現し exit 0)。→ opencode plugin 側で「deny 表現」を持つ必要は現状の core hook 契約上は無い(stop の block をどう opencode に伝えるかは別途設計判断、cursor では stop を advisory 降格している = `amadeus-cursor-lib.ts:186-195`)。

---

## フォーカス2: Cursor アダプタ同型契約(opencode plugin の模範)

`packages/framework/harness/cursor/hooks/amadeus-cursor-adapter.ts`(24行)+ `amadeus-cursor-lib.ts`(264行)。seam 分割 = テスト可能ロジックを lib に、プロセスライフサイクル(stdin read + exit)のみ薄い adapter に(`adapter.ts:6-8`)。

**adapter.ts(24行、entrypoint)**:
- `runCli(process.argv, () => Bun.stdin.text())` を await(:21)→ `process.stdout.write / stderr.write / process.exit(result.exitCode)`(:22-24)。import-free of tests(:6)。

**lib.ts(264行、全ロジック)構造**:
- `EXIT_ADVISORY_FAIL = 1`(:35、module-scope、NEVER 2)。
- `CursorEnvelope` interface(:41-57): 読むフィールドのみ = `hook_event_name / session_id / source / prompt / command / file_path / subagent_type / subagent_id / reason`。
- `ToolNameMap`(:64-67、**工程0 実測確定値のみ**): `afterShellExecution→"Bash"`、`afterFileEdit→"Edit"`。
- `parseCursorEnvelope(raw)`(:81-91、parse-don't-validate、JSON object 以外は null)。
- `reconstruct(target, env): Reconstruction`(:96-201) — **純関数 seam(テスト対象)**。target ディスパッチ(case 一覧):
  - `session-start`(:98) → amadeus-session-start.ts `{hook_event_name:"SessionStart", source:env.source??"startup", session_id?}`、**forwardStdout: true**(additionalContext 注入のため唯一 true)
  - `mint`(:110) → amadeus-mint-presence.ts `{hook_event_name:"UserPromptSubmit", prompt:env.prompt??""}`、forwardStdout: false
  - `runtime-compile`(:125) → afterShellExecution を ToolNameMap で Bash 検証(不一致は advisory error :130)→ amadeus-runtime-compile.ts `{hook_event_name:"PostToolUse", tool_name, tool_input:{command}}`
  - `audit-and-sensors`(:142) → afterFileEdit を Edit 検証 → **audit-logger THEN sensor-fire の2連続 CoreCall**(:150-153)、共通 input `{hook_event_name:"PostToolUse", tool_name, tool_input:{file_path}}`
  - `log-subagent`(:158) → amadeus-log-subagent.ts `{hook_event_name:"SubagentStop", agent_type:env.subagent_type, agent_id:env.subagent_id}`
  - `validate-state`(:172) → amadeus-validate-state.ts `input:"{}"`(core hook は stdin 読まない :173-174)
  - `session-end`(:178) → amadeus-session-end.ts `{hook_event_name:"SessionEnd", reason:env.reason??"unknown"}`
  - `stop`(:186) → amadeus-stop.ts `input:"{}"`、**forwardStdout: false**(stop の block を Cursor へ渡さず advisory 降格。block 契約が未実測のため後の Bolt へ deferred :191-193)
  - default(:197) → 空 calls(misconfig の advisory no-op)
- `defaultSpawn(hookFile, input, projectDir)`(:214-223): `Bun.spawnSync(["bun", join(HOOKS_DIR, hookFile)], {stdin: Buffer, stdout:"pipe", stderr:"ignore", cwd, env: process.env})`。**`env: process.env` 明示**(:220、bun-spawn-env-snapshot 対策)。`HOOKS_DIR = dirname(fileURLToPath(import.meta.url))`(:37)= 自分と同じ dir の core hook を叩く。
- `runAdapter(target, raw, projectDir, spawn)`(:229-247): parse→null なら advisory fail(:231-233)、reconstruct→error なら advisory fail(:235-237)、calls を順次 spawn、`forwardStdout ? lastStdout : ""`、**成功は常に exitCode 0**(:246、core hook の非0は伝播しない)。
- `runCli(argv, readStdin)`(:253-264): `argv[2]` を target、TTY stdin は no envelope 扱い(:256)。

**工程0(実測)コメントの手法**(opencode 側でも踏襲すべき): `lib.ts:10-29` — 公式 docs(cursor.com/docs/hooks)を一次ソースにし、サードパーティ(johnlindquist/cursor-hooks)が古い API だったため generic postToolUse の tool_name enum を verbatim 裏取りできなかった経緯を明記。→ **payload フィールドが docs で verbatim 確認できた dedicated イベントのみ配線**し、未実測は登録しない(偽グリーン回避)。ToolNameMap は実測確定値のみ(:59-60)。

---

## フォーカス3: opencode harness 現状

`packages/framework/harness/opencode/` = `commands/amadeus.md` + `dot-gitignore` + `emit.ts`(207行)+ `manifest.ts`(73行)。**adapter も plugin も hooks.json も無い**。

**manifest.ts**:
- `harnessDir: ".opencode"`(:33)。
- `coreDirs`(:38-47): tools / amadeus-common / knowledge / rules→amadeus-rules / sensors / scopes / agents / **hooks**(:46)。→ **hooks/ は core からそのままコピーされ dist/opencode/.opencode/hooks/ に landing する(が起動配線が無い)**。
- `harnessFiles`(:55): dot-gitignore(projectRoot)のみ。**authored hook/plugin ファイルは無し**。
- `authoredExempt: []`(:61、明示空 = adapter shim が無いことの文書化、:59-60 コメント)。
- `skipRunnerGen: true`(:67)。`rulesRename: "amadeus-rules"`(:57)。
- manifest header(:8-9,:24-26): 「**No adapter shim**、OpenCode has no stdin-hook shell and reads persona .md as prose」「unlike codex there is no stdin adapter shim」— **現状 hooks は配線されない前提で設計されている**。

**emit.ts**(opencode 固有面を書く):
- `SESSION_SKILLS`(:42): 4 session skill を `.opencode/skills/` へ。
- `emitOpencodeJsonExample()`(:50-65): `opencode.json.example`。内容 = `{$schema:"https://opencode.ai/config.json", permission:{edit:"ask", bash:"ask", webfetch:"ask"}}`(narrowing のみ、実測 dist と一致)。
- `emitAgentsMd(rewriteProse)`(:72-122): projectRoot `AGENTS.md`。「Permissions」節(:112-119)で `bun {{HARNESS_DIR}}/tools/…` と `bun {{HARNESS_DIR}}/hooks/…` に言及(hooks の存在は書くが**起動方法は書いていない**)。
- `emit()`(:142-206): emissions テーブル(:158)= `commands/amadeus.md`(readHarnessSource authored verbatim)+ `AGENTS.md` + `opencode.json.example` + 4 session skills(:177-186)。write⇔check 対称(:191-204)。**hooks/plugin の emission は無い**。

**AGENTS.md 生成**: emit 内 `emitAgentsMd`(上記)。onboarding skeleton は使わず focused guide(:67-68)。`{{HARNESS_DIR}}` トークンは `rewriteProse`(:151-152、substituteToken → amadeus-rules rename)で解決。

---

## フォーカス4: dist/opencode レイアウト

`dist/opencode/.opencode/` 実在(実測 `find dist/opencode`):
- `hooks/`(11ファイル): amadeus-audit-logger / log-subagent / mint-presence / runtime-compile / sensor-fire / session-end / session-start / statusline / stop / sync-statusline / validate-state.ts(= core hooks 全11、byte-shared)
- `tools/`(32ファイル)、`agents/`、`sensors/`、`scopes/`、`amadeus-common/`、`commands/amadeus.md`、`skills/`(4 session)、`opencode.json.example`、`VERSION`
- projectRoot: `dist/opencode/AGENTS.md`、`dist/opencode/.gitignore`、`dist/opencode/amadeus/active-space`
- **`plugin/` ディレクトリは存在しない**(実測: `.opencode/` 直下は hooks と tools のみが plugin/hook/tool grep にヒット)。

**plugins/ を追加する場合の manifest 変更点(設計示唆、仮説含む)**:
- opencode 公式 docs(conductor 提供): `.opencode/plugin/` を**自動ロード**(dir 名は docs 上 `plugin` 単数。要 units-generation/実装時に dist 上の正確な dir 名を再実測)。→ 別途 opencode.json への登録は不要(自動ロード)。
- 追加経路は2択(cursor 前例に照らす):
  - (A) **harnessFiles 方式**(cursor と同型): authored plugin ファイルを `harness/opencode/plugin/…`(または hooks/ 配下)に置き、`manifest.harnessFiles` に `{src, dst}` 行追加。core-copied dir 内に置くなら `authoredExempt` に正規表現追加(cursor `manifest.ts:65` が前例: `/^hooks\/amadeus-cursor-[^/]+\.ts$/`)。
  - (B) **emit() 方式**: `emit.ts` の emissions テーブルに plugin エントリ追加。authored prose は `ctx.readHarnessSource` 経由必須(unreferenced-source scan 対策、`manifest-types.ts:29-38` の readHarnessSource 契約)。
- cursor は adapter+lib を harnessFiles(:54-58)、hooks.json.example を emit(:163)の**混成**を採っている。opencode plugin も同様に「plugin 本体 lib = harnessFiles / opencode.json への言及や AGENTS.md 更新 = emit」の分担が自然(仮説)。
- **注意**: opencode manifest は現状 `authoredExempt: []`(:61)。plugin を core-copied `hooks/` 配下に置くなら空配列のままでは orphan scan で弾かれる → exempt 追加必須。

---

## フォーカス5: 区間差分(base..HEAD 115コミット)

`git diff --stat 1e22d6a..HEAD` をフォーカス面(opencode/cursor harness、amadeus-lib.ts、package.ts、manifest-types.ts、.claude/hooks/)に絞って実測:
- **変化したのは `packages/framework/core/tools/amadeus-lib.ts` のみ(118 挿入 / 6 削除)**。
- 窓内の lib 変更コミット(`git log --oneline` 実測):
  - `6f11f6d5c feat(installer): add opencode and cursor to the known-harness enum (#1109)` ← **KNOWN_HARNESS_DIRS 5値化(.opencode/.cursor 追加)の主コミット**
  - `a1d78d786` E-OC1 証跡ゲート(gate-start fail-closed)
  - `a815ec4b1` ステージ diary 自動生成
  - `cee1a3deb` amadeus-state set fail-closed 化
- opencode/cursor の harness dist ツリー・core hooks(.claude/hooks/)・package.ts・manifest-types.ts は**窓内で無変更** → これらは base より前(先行 intent: cursor/opencode harness 追加、installer-distribution 系)で確立済み。
- 結論: 本 intent の作業対象(opencode plugin 配線)は**新規追加**であり、既存の opencode harness に手を入れる(manifest/emit 拡張 + plugin lib 新設)形。core hooks 自体の改変は不要(byte-shared 契約を壊さない)。

---

## フォーカス6: package.ts の manifest 消費(plugin 追加の regen 経路)

`scripts/package.ts` の buildTree フロー(実測 grep + `manifest-types.ts` 契約):
1. harness discovery(:64-71): `harness/<n>/manifest.ts` の存在で自動発見(**ハードコード無し。新 harness はコピー元 dir + manifest 行で足りる**)。
2. `coreDirs` 投影(:335、`for {src,dst} of m.coreDirs`): core/<src> → <harnessDir>/<dst>、.md は token 置換 + rules rename。
3. `harnessFiles` コピー(:369、`for {src,dst,projectRoot}`): harness/<n>/<src> → dist。projectRoot=true は dist root、false は <harnessDir>/ 配下(:373)。.md は token substitution。
4. onboarding(:384)、memory 投影(:396 emitMemory / :408 emitMemorySeed)、active-space(:401)。
5. `writeHarnessData`(:438、:219): `tools/data/harness.json` に manifest 由来 fact 書き込み(harness.json は runtime の harness dir 解決に使われる — `amadeus-lib.ts:172-173`)。
6. runner-gen(:449、opencode/cursor は `skipRunnerGen` でスキップ)。
7. `emit`(:459-461、`if (m.emit) m.emit({...})`): manifest の emit プラグイン起動。EmitContext(`manifest-types.ts:22-51`)= repoRoot / coreRoot / harnessRoot / **readHarnessSource(unreferenced-source scan 連動)** / distRoot / harnessDir / substituteToken / check。

**plugin ディレクトリ追加の regen 経路**:
- 方式(A)harnessFiles: manifest に行追加するだけで package.ts は無改変(:369 のループが汎用)。dist:check(`bun run dist:check`)と promote:self:check が drift を検出する(org.md/project.md Mandated)。
- 方式(B)emit: emit.ts の emissions に足すだけ。package.ts 無改変。
- どちらも **`bun scripts/package.ts` 再生成 → `bun run dist:check` / `bun run promote:self:check` で配布物同期を検証**(project.md「正本 core/ or harness/ 編集 → dist 再生成」規律)。core hooks を触らない限り hooks/ の投影(:46 coreDirs)は現状のまま流用。

---

## 外部実測(conductor 提供 — 検証済み入力として転記)

以下は conductor が opencode 公式 docs / @opencode-ai/plugin 一次ソースから実測し、検証済み入力として提供したもの(当作業ツリーには opencode 依存が無く、当スキャンでは再実測不可。出典明示のうえ転記)。

- **公式 docs**(https://opencode.ai/docs/plugins/): `.opencode/plugin/` を自動ロード。JS/TS module 形式。イベント一覧 = `session.* / tool.execute.* / message.* / permission.* / file.edited / tui.*` 等。**payload スキーマは docs 未文書**。
- **@opencode-ai/plugin 一次ソース**(github.com/sst/opencode `packages/plugin/src/index.ts`): `Hooks` インターフェース = `event / config / auth / chat.message / chat.params / permission.ask / command.execute.before / tool.execute.before / tool.execute.after / shell.env / tool.definition / experimental.*`。
  - **`chat.message` が UserMessage を直接観測** → HUMAN_TURN 写像可能(**R-1 肯定解消**)。
  - `tool.execute.before`: input=`{tool, sessionID, callID}` / output=`{args}`。
  - `tool.execute.after`: input=`{tool, sessionID, callID, args}` / output=`{title, output, metadata}`。

**opencode イベント → core hook 写像の示唆(仮説、実装時 units-generation で確定)**:
- `chat.message`(UserMessage)→ mint-presence(`{hook_event_name:"UserPromptSubmit", prompt}`)。ただし core hook 側は machine-injected マーカーで分類する(`mint-presence:65`)ので、opencode の agmsg/teammate 注入がどのイベントで来るか未実測 — **fail-open 側に倒せば安全**(prompt 無 → mint)。
- `tool.execute.after`(tool=書き込み系)→ audit-logger + sensor-fire(`tool_input.file_path` を after.args から抽出。cursor `audit-and-sensors` と同じ2連続 CoreCall)。**opencode の tool vocab → Claude tool_name の写像(ToolNameMap 相当)が必要**、かつ tool の args から file_path/command を取り出す写像も必要。
- `tool.execute.after`(tool=bash 系)→ runtime-compile(`tool_input.command` を args から)。
- `session.*` → session-start / session-end(source/reason 写像)。
- `preCompact`/`stop` 相当イベントの有無は docs 未文書 → **実装時に実測、無ければ validate-state/stop は配線しない(cursor が stop を advisory 降格した前例に倣う)**。

---

## 後続ステージ(requirements-analysis / application-design)への注意点

1. **byte-shared 契約を壊さない**: core hooks(.claude/hooks/ = core/hooks)は全ハーネス共有。opencode plugin は core hook を**変更せず**、cursor lib と同型に「イベント → ClaudeCodeHookInput 再構成 → spawn(env:process.env)」で叩く。core hook 側の stdin フィールド名(上記台帳)が plugin の写像先の契約。
2. **工程0 実測規律**(external-seam-vocab-measurement / E-OC9): opencode の tool vocab・payload フィールドは docs 未文書。**存在実測だけで機能表に ✅ を書かず、語彙未実測は ⚠ + 「実装時実測が確定条件」に降格**。ToolNameMap 相当は実測確定値のみ登録し、未登録 identity は advisory reject(cursor `:60-67,:130,:147` 前例)。
3. **exit 2 を出さない / advisory 徹底**: opencode の permission.ask で deny 表現が可能だが、core hook 契約(stop の block は stdout JSON、exit 2 は誰も出さない)に照らし、plugin は advisory に留めるのが cursor 前例(`amadeus-cursor-lib.ts:186-195` stop 降格)。stop の block をどう opencode へ伝えるかは設計判断事項(未決 → application-design で裁定)。
4. **seam 分割**(テスト可能性 / coverage): cursor 同様、reconstruct 相当の純関数ロジックを lib に export し in-process テスト、entrypoint は薄いイベントハンドラに(bun --coverage は spawn 子を計測しない — seam-export-handler-amend / spawn-blindspot 群)。
5. **manifest/emit の分担**: plugin lib = harnessFiles(core-copied hooks/ 配下なら authoredExempt 追加必須)、AGENTS.md「Hooks/Plugins」節更新・opencode.json 言及 = emit。`bun scripts/package.ts` → `dist:check` / `promote:self:check` で配布物同期を必ず検証(project.md Mandated)。
6. **AskUserQuestion 二重配線の含意**: Claude では mint-presence が UserPromptSubmit と AskUserQuestion PostToolUse の**2経路**で HUMAN_TURN を mint(`.claude/settings.json:56-57,:111-112`)。opencode に AskUserQuestion 相当があるか未実測 — human-presence ゲートの厳密性に関わるため実装時に確認(無ければ chat.message 単経路で足りるか要判断)。
7. **plugin dir 名**: docs 上 `.opencode/plugin/`(単数)。dist 生成時の正確な dir 名(plugin vs plugins)を実装時に opencode 実物で再実測(Issue タイトルは "plugins" 複数だが docs は単数 — 齟齬に注意)。

---

## Architect 合成(再検証)

Developer スキャンの主要主張を Architect が独立に file:line 再照合した(engineer-3 作業ツリー、読み取り専用実測)。引用の実在と意味論の両面を確認。

### A. 再照合結果(全点一致 — 不一致ゼロ)

| # | 主張(scan-notes) | 再照合(Architect 独立実測) | 判定 |
|---|---|---|---|
| 1 | opencode manifest coreDirs に `{src:"hooks",dst:"hooks"}`(`manifest.ts:46`)→ 11 core hook が dist へコピー | `harness/opencode/manifest.ts:46` = `{ src: "hooks", dst: "hooks" }` を実読。`dist/opencode/.opencode/hooks/` = **11 ファイル**を実測。`plugin/` dir は**不在**(`ls -d dist/.../plugin*` = no matches) | ✅ 一致 |
| 2 | opencode manifest `authoredExempt: []`(:61)= adapter shim 不在の文書化 | `manifest.ts:61` = `authoredExempt: []`、:59-60 コメント「No authored file lives inside a core-copied dir」を実読。`harnessFiles`=dot-gitignore のみ(:55)、`skipRunnerGen:true`(:67)、`harnessDir:".opencode"`(:33) すべて一致 | ✅ 一致 |
| 3 | cursor lib `reconstruct` = 8 target ディスパッチ(純関数 seam) | `amadeus-cursor-lib.ts:96-201` を実読。case = session-start(:98)/mint(:110)/runtime-compile(:125)/audit-and-sensors(:142)/log-subagent(:158)/validate-state(:172)/session-end(:178)/stop(:186)+default(:197)。**8 target 一致**。session-start のみ `forwardStdout:true`(:107)、他は false。stop は `input:"{}"`+forwardStdout:false で advisory 降格(:194)一致 | ✅ 一致 |
| 4 | cursor lib `ToolNameMap` 実測確定2値・`EXIT_ADVISORY_FAIL=1`・`env:process.env` 明示 | `:64-67` ToolNameMap = `afterShellExecution→"Bash"` `afterFileEdit→"Edit"`、`:35` `EXIT_ADVISORY_FAIL=1`(NEVER 2 コメント)、`defaultSpawn :220` `env: process.env` すべて一致 | ✅ 一致 |
| 5 | mint-presence は `prompt` を読み常に exit 0、machine-injected は抑止 | `amadeus-mint-presence.ts` 実読: `raw.prompt`(:63)、`isClaudeCodeHookInput`(:62)、`isMachineInjectedTurnText`(:65)、`appendAuditEntry("HUMAN_TURN",...)`(:74)、末尾 `process.exit(0)`(:80)、fail-open コメント(:28)一致 | ✅ 一致 |
| 6 | stop の block は stdout JSON `{decision:block}`+exit 0(exit 2 不使用) | `amadeus-stop.ts` 実読: allowStop=`process.exit(0)`(:160)、blockStop=`console.log(JSON.stringify({decision:"block",reason}))`(:167)+`process.exit(0)`(:168)。header :6-8 の advisory/sanctioned 契約一致。**全 core hooks に対する `grep exit(2)` = NONE FOUND**(scan-notes「exit 2 を能動的に出す core hook は無い」を実証) | ✅ 一致 |
| 7 | package.ts は harness を manifest.ts 存在で自動発見(ハードコード無し) | `scripts/package.ts:68-71` `discoverHarnessNames()` = `readdirSync(HARNESS_ROOT).filter(existsSync(.../manifest.ts))`、:63-65 コメント「DISCOVERED, not hardcoded」。coreDirs 投影 :335、harnessFiles コピー :369(projectRoot 分岐)一致 | ✅ 一致 |
| 8 | installer 値: KNOWN_HARNESS_DIRS=5、HarnessName=6 | `amadeus-lib.ts:121` = `[".claude",".kiro",".codex",".opencode",".cursor"]`(5)、`packages/setup/src/domain/harness.ts:9` = `claude|codex|kiro|kiro-ide|opencode|cursor`(6)一致 | ✅ 一致 |

**結論(事実)**: 後続ステージが依存する 8 主張すべてが独立実測で一致。引用の実在・意味論とも齟齬なし。scan-notes を requirements-analysis の入力として採用可。

### B. 意味論上の精査(1点、契約解釈の明確化 — 不一致ではない)

- **stop block と「exit 2」の関係**(設計者向け注記): cursor lib のコメント `amadeus-cursor-lib.ts:189` は block が「on Claude, as exit 2」と記す。一方 **core stop hook の実体は exit 2 を出さず、stdout JSON `{decision:block}`+exit 0 で表現する**(:167-168 実測、全 core hook で exit(2) grep 0)。この2記述は矛盾しない — 前者は「Claude Code **ハーネス**が block hook をどう wire 解釈するか」の慣行注記、後者は「**core hook が実際に emit する**もの」。両者の分離は opencode plugin 設計で重要: **plugin が core stop hook の stdout JSON を受けて opencode 側の block をどう表現するか**が設計判断の核であり、「core が exit 2 を出す」前提で設計してはならない。cursor は block wire 契約未実測ゆえ stop を advisory 降格した(:190-193)— opencode も同型の初期姿勢が安全。

### C. 後続ステージへの構造的リスクと推奨

**C-1. plugin 追加経路 harnessFiles(A) vs emit(B) の比較軸(事実+推奨)**

| 比較軸 | (A) harnessFiles 方式 | (B) emit 方式 |
|---|---|---|
| package.ts 改変 | 不要(:369 汎用ループ)実測 | 不要(:459-461 emit 起動)実測 |
| 配置先 | `harness/opencode/<src>` を dist の `<harnessDir>/<dst>` or projectRoot へ | emit.ts の emissions テーブルに動的生成 |
| authored prose 検証 | dist:check/promote:self:check の drift guard | `ctx.readHarnessSource` 経由必須(unreferenced-source scan、`manifest-types.ts:29-38`) |
| core-copied dir 内配置時 | **authoredExempt 追加必須**(orphan scan 回避、下記 C-2) | 該当せず |
| cursor 前例 | adapter+lib 本体を harnessFiles(混成の主) | hooks.json.example を emit(混成の従) |

推奨(仮説): plugin **本体 lib(reconstruct 相当の純関数 seam を持つ TS モジュール)= harnessFiles**、**AGENTS.md の Plugins 節更新・opencode.json 言及 = emit** の混成が cursor と同型で自然。plugin lib を独立ファイルにするか core-copied `hooks/` 配下に置くかで authoredExempt の要否が分岐(C-2)。この分岐は units-generation で確定すべき設計判断。

**C-2. authoredExempt の要否(事実)**: opencode manifest は現状 `authoredExempt:[]`(:61 実測)。plugin lib を **core-copied dir(`hooks/`)配下に authored ファイルとして置く場合、空配列のままでは orphan/unreferenced scan に弾かれる → 正規表現の exempt 追加が必須**。cursor 前例 = `manifest.ts` の `/^hooks\/amadeus-cursor-[^/]+\.ts$/`(scan-notes:117 記載、cursor manifest 側の実在は units-generation で確認推奨)。**回避策(推奨)**: plugin lib を `hooks/` の外(例 `harness/opencode/plugin/`)に置けば authoredExempt 不要で harnessFiles の projectRoot=false ルーティングのみで足りる。dir 分離の方が exempt 正規表現のメンテコストを負わない分、変更制御上望ましい(仮説)。

**C-3. chat.message → mint-presence 写像の設計上の注意(事実+リスク)**:
- 事実: core mint-presence は `prompt` を読み、`isMachineInjectedTurnText` で machine-injected を**core 側が分類**する(:65 実測)。cursor は分類せず prompt を forward するだけ(lib:113 コメント)。
- リスク(構造的): opencode の `chat.message`(UserMessage)payload スキーマは **docs 未文書**(scan-notes:160 外部実測)。agmsg/teammate 注入がどのイベント・どの形で来るかが未実測。mint-presence の分類は prompt テキスト依存のため、**opencode の注入テキストが machine marker を含まないと phantom HUMAN_TURN を mint し human-presence ゲートを誤って満たすリスク**がある(#708/#755 の再来クラス)。
- 推奨: E-OC9(external-seam-vocab-measurement)に従い、**chat.message payload の `prompt`/`text` フィールド名と machine-injection の観測形は実装時実測が確定条件**。機能表には ✅ でなく ⚠ で登録。fail-open(prompt 無→mint)は安全側だが、**machine 注入の誤 mint は fail-open では防げない**点を requirements で明示し、注入マーカーの写像可否を受け入れ基準に含めるべき。

**C-4. tool vocab 写像の二段必要性(事実+推奨)**: cursor は dedicated イベント(afterShellExecution/afterFileEdit)で tool_name を **イベント identity から**引く(ToolNameMap :64-67)。opencode の `tool.execute.after` は **generic**(tool 名が payload 内、scan-notes:164)。→ opencode では (i) opencode tool vocab → Claude tool_name の写像 **と** (ii) tool の `args` から `file_path`/`command` を取り出す写像の**二段**が必要で、cursor の一段より写像面が広い。ToolNameMap 相当は**実測確定値のみ登録・未登録は advisory reject**(cursor :129-130,:146-147 前例)を厳守。未実測 vocab に ✅ を書くと matcher 無音不一致の偽グリーン(E-OC9)。

**C-5. AskUserQuestion 二重配線の含意(事実+未決)**: Claude は mint-presence を UserPromptSubmit と AskUserQuestion PostToolUse の**2経路**で駆動(`.claude/settings.json:56-57,:111-112`、scan-notes 記載)。opencode に AskUserQuestion 相当イベントがあるかは未実測。**human-presence ゲートの厳密性に直結** — chat.message 単経路で HUMAN_TURN mint が十分か、application-design で裁定要。

**C-6. seam 分割の踏襲(推奨)**: cursor lib は `reconstruct`(純関数)/`runAdapter`(argv 化 handler)/`defaultSpawn`(spawn seam)を export し in-process テスト可能(:96,:229,:214 実測)。bun --coverage は spawn 子を計測しない(seam-export-handler-amend / spawn-blindspot 群)ため、opencode plugin も **写像ロジックを純関数 export・entrypoint は薄いイベントハンドラ**にする設計を CG 前に固定すべき。ただし opencode plugin は @opencode-ai/plugin の**イン・プロセス JS/TS module** であり、cursor の subprocess-stdin entrypoint とは入口形が異なる(scan-notes:12)— spawn seam(`defaultSpawn`)自体は core hook 起動に流用可能だが、entrypoint はイベントハンドラ登録に置換される点を design で明記。

**C-7. byte-shared 契約の不可侵(事実)**: core hooks(`core/hooks/` = 全ハーネス byte-identical、dist に 11 コピー確認)は**本 intent で改変不可**。plugin は core hook を変更せず「イベント→ClaudeCodeHookInput 再構成→spawn(env:process.env)」で叩く(cursor 同型)。区間差分実測でも窓内で変化したのは amadeus-lib.ts のみ(scan-notes フォーカス5)で core hooks 無変更 — 本 intent も core hooks に触れない前提を requirements で固定。

### D. 検証手続きメモ(後続検証者向け)

- 全引用は engineer-3 作業ツリーで file:line 直読。core hooks の正本は `packages/framework/core/hooks/`(`.claude/hooks/` は同一投影、byte-shared)。
- `grep exit(2)` は `packages/framework/core/hooks/` 全域で 0 件(不在主張の反証確認、absence-claim-grep-verify 準拠)。
- dist plugin dir 不在は `ls -d dist/opencode/.opencode/plugin*` = no matches で確認。
- 外部実測(opencode docs / @opencode-ai/plugin ソース)は当ツリーに opencode 依存が無く**再実測不可** — conductor 提供の検証済み入力として scan-notes:156-171 の出典明示を尊重し、Architect は再照合対象外(DATA 扱い)。実装時の実測確定条件は C-3/C-4/C-5 に集約。
