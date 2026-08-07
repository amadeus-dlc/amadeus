# re-scan: 260807-subagent-start-pair

## 実行メタデータ

- Date: `2026-08-07`
- Intent: `260807-subagent-start-pair`（scope `self-fix`、Brownfield、単一 repo `amadeus`）
- Base commit: `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0`（`cid:reverse-engineering:rescan-base-ancestry` に従い、`re-scans/*.md` の observed 候補から **HEAD 祖先かつ距離最小**のものを選定。距離 **2 commits** = 波1 の #2352 修正 #2413 + record sync #2416）
- Observed commit: `5f2ad9195d9ce3ea55d6bf3d34509f2c5ca2c12b`（= 本 worktree HEAD = `origin/main` 系譜。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Focus: [Issue #2297](https://github.com/amadeus-dlc/amadeus/issues/2297) + [Issue #2303](https://github.com/amadeus-dlc/amadeus/issues/2303) — **`SUBAGENT_STARTED` が Claude Code で構造的に 0 件**である原因の、配線側と語彙側の2欠陥
- Scan mode: **xrev scan mode**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）+ Architect の observed 断面独立実読による二重化
- 成果物: 共有8成果物の現在断面を更新（直前の現在断面 `260807-projectdir-worktree-fix` を本文保持のまま履歴へ降格 — `cid:reverse-engineering:c3-relabel`）、`reverse-engineering-timestamp.md` の最新ヘッダを更新、本 record を新設

### scan mode の成立根拠

#2297 と #2303 はいずれも起票者以外2名の独立エビデンス付き verdict でクロスレビューが成立している（計 **4 verdict**）。4 verdict はすべて**検証 SHA `75a1c198d5101c1df2bee21f960f01ae1d7973d3` を明記**する。xrev scan mode はこの verdict を Developer scan の一次入力とし、Architect が observed 断面で独立に verbatim 実読して二重化した。

### 行番号 currency の確定（区間実測）

review SHA `75a1c198d` → observed の `packages/framework/core/tools/amadeus-lib.ts` の hunk ヘッダは**2つのみ**:

```
@@ -227,17 +227,31 @@     ← resolveProjectDir、+14 行
@@ -6670,7 +6684,7 @@
```

総行数 8793 → 8807（**+14**）。SUBAGENT 領域は第1 hunk が `:243` で閉じた後、第2 hunk の `:6684` までの**非交差区間**にあるため、全引用が一律 **+14** で機械シフトする:

| 引用 | review 断面 `75a1c198d` | **observed `5f2ad9195`** | シフト |
|---|---|---|---|
| `SUBAGENT_DISPATCH_TOOL` | :4114 | **:4128** | +14 |
| ガード比較行 | :4147 | **:4161** | +14 |
| `subagentStartFields` シグネチャ | :4146 | **:4160** | +14 |
| doc-comment ブロック | :4146-4158 | **:4160-4172** | +14 |
| `PreToolUse{Task}` コメント | :4135 | **:4149** | +14 |

base 断面の grep も `4114` / `4147` を返し、シフト量 +14 は機械的に確認済み。**述語・文字列はいずれも無変更**。これは免除の適用ではなく、**区間実測による currency の確定**である（`cid:reverse-engineering:E-XBB-RE-S13-c2` の測定区間は review..observed に固定）。

### 検証手段

coverage 実行は `cid:code-generation:c1-coverage-single-owner` に従い**一切行っていない**。テスト実行・ファイル書込（codekb 以外）・git 状態変更・engine 操作もゼロ。検証は observed 断面の verbatim 実読（`sed` / `awk` / `grep` / `jq` / `git ls-files` / `git diff`、exit code を記録）のみ。

---

## 患部の実測

### 1. emit 鎖の単一性（迂回路の不在）

`packages/framework/core/hooks/amadeus-log-subagent-start.ts` verbatim:

| 行 | verbatim | 役割 |
|---|---|---|
| `:64` | `const started = subagentStartFields(parsed, join(projectDir, harnessDir(), "agents"));` | 唯一の判定呼出し |
| `:65` | `if (started === null) process.exit(0);` | 唯一の中断点（silent） |
| `:97` | `ensureOtelBootstrap(projectDir);` | emit 直前 |
| `:98` | `appendAuditEntryViaEvents("SUBAGENT_STARTED", fields, projectDir);` | **唯一の emit** |
| `:99-101` | `catch` → `recordHookDrop(projectDir, "log-subagent-start", errorMessage(e))` | fail-open（append 失敗と同一の drop 経路） |

判定関数 `subagentStartFields` の消費者も `:64` の1箇所のみ。⇒ **配線が無い / 判定が拒否する のいずれか一方でも emit は構造的にゼロ**。#2297 と #2303 は独立な2つの遮断点である。

### 2. live `.claude/settings.json` の hook 構成（全数）

hook command **11件**、全件が dispatcher 形 `bun "${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/amadeus-dispatch.ts" <slug>`（`grep -c 'amadeus-dispatch.ts' .claude/settings.json` → 11）:

| event | matcher | slug | 行 |
|---|---|---|---|
| UserPromptSubmit | `""` | mint-presence | :58 |
| SessionStart | `""` | session-start | :69 |
| SessionEnd | `""` | session-end | :80 |
| PostToolUse | `Write\|Edit` | audit-logger | :91 |
| PostToolUse | `Write\|Edit` | sensor-fire | :95 |
| PostToolUse | `TaskUpdate` | sync-statusline | :104 |
| PostToolUse | `AskUserQuestion` | mint-presence | :113 |
| PostToolUse | `Bash` | runtime-compile | :122 |
| PreCompact | `""` | validate-state | :133 |
| SubagentStop | `""` | log-subagent | :144 |
| Stop | `""` | stop | :155 |

- `grep -c 'PreToolUse' .claude/settings.json` → **0 / exit=1**（**PreToolUse ブロック自体が不在**）
- `grep -c 'plugin-compose' .claude/settings.json` → **0 / exit=1**

正本 `packages/framework/harness/claude/settings.json.example:60-68` の PreToolUse は逐語で実在:

```json
    "PreToolUse": [
      {
        "matcher": "^Task$",
        "hooks": [
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/amadeus-log-subagent-start.ts\""
          }
        ]
      }
    ],
```

同 `:44` に SessionStart 2本目として `amadeus-plugin-compose.ts` が実在（SessionStart ブロックは `:34` 起点）。

### 3. dispatcher `HOOK_PATHS` と呼出し規約

`packages/framework/harness/claude/hooks/amadeus-dispatch.ts:4-15` — **10スロット** verbatim:

```ts
const HOOK_PATHS = {
  "mint-presence": ".claude/hooks/amadeus-mint-presence.ts",
  "session-start": ".claude/hooks/amadeus-session-start.ts",
  "session-end": ".claude/hooks/amadeus-session-end.ts",
  "audit-logger": ".claude/hooks/amadeus-audit-logger.ts",
  "sensor-fire": ".claude/hooks/amadeus-sensor-fire.ts",
  "sync-statusline": ".claude/hooks/amadeus-sync-statusline.ts",
  "runtime-compile": ".claude/hooks/amadeus-runtime-compile.ts",
  "validate-state": ".claude/hooks/amadeus-validate-state.ts",
  "log-subagent": ".claude/hooks/amadeus-log-subagent.ts",
  stop: ".claude/hooks/amadeus-stop.ts",
} as const;
```

**スロット追加時に満たすべき契約**:

| 関数 | 行 | 契約 |
|---|---|---|
| `parseHookSlug` | `:24-27` | 未知 slug を throw → `main` catch（`:107-110`）が exit 1。**fail-closed** |
| `ensureCompleteHookTree` | `:50-57` | 全スロット実在を要求。**全欠 → `not-built` で exit 0 / 部分欠 → throw で exit 1** |
| `resolveHookPath` | `:59-66` | パス脱出ガード |
| `forwardToHook` | `:68-92` | `[process.execPath, hookPath, ...args]` を spawn。`env: process.env`、stdio 3系 `inherit`、SIGINT/SIGHUP/SIGTERM 転送 |

`ensureCompleteHookTree` verbatim（`:50-57`）:

```ts
function ensureCompleteHookTree(projectRoot: string): "not-built" | "complete" {
  const missing = KNOWN_SLUGS.filter((slug) => !existsSync(join(projectRoot, HOOK_PATHS[slug])));
  if (missing.length === KNOWN_SLUGS.length) return "not-built";
  if (missing.length > 0) {
    throw new Error(`hook tree is incomplete — missing: ${missing.join(", ")}; run \`bun run build\``);
  }
  return "complete";
}
```

⇒ **設計上の重要制約**: 部分欠 throw は slug を問わず全フックを巻き込む。スロット追加は対応する `.claude/hooks/amadeus-<name>.ts` が build で必ず生成されることとセットでなければならない。追加候補2件（`amadeus-log-subagent-start.ts` / `amadeus-plugin-compose.ts`）は `packages/framework/core/hooks/` と自己インストール面 `.claude/hooks/` の**両方に実在済み**で、この要件は現状で満たせる。

`forwardToHook` が stdin を素通しするため、フック側 `readHookStdin()` は dispatcher 経由でも直接パス形でも**同一に動く** — 配線方式の選択はランタイム挙動に差を生まない。

### 4. settings 3面の関係

| 面 | パス | `git ls-files --error-unmatch` | hook 件数 | 形式 |
|---|---|---|---|---|
| 正本 | `packages/framework/harness/claude/settings.json.example` | **exit=0**（tracked） | 13 | 直接パス形 |
| 投影 | `.claude/settings.json.example` | **exit=1**（untracked、source-only 生成物） | 13（正本と byte 一致） | 直接パス形 |
| live | `.claude/settings.json` | **exit=0**（tracked、非 gitignore） | 11 | dispatcher 形 100% |

**設計上の帰結（事実）**: 投影面は untracked なので fresh clone で `bun run build` 前には存在しない。⇒ **drift ガードの ground truth は正本（tracked）側でなければならず、投影面を基準にすると build 依存の偽赤/未検出になる**。

### 5. 包含の破れ 2 件

- example の distinct hook script: **12**（mint-presence, session-start, **plugin-compose**, session-end, **log-subagent-start**, audit-logger, sensor-fire, sync-statusline, runtime-compile, validate-state, log-subagent, stop）
- dispatcher `HOOK_PATHS`: **10**
- 差分は正確に2件 = `plugin-compose` と `log-subagent-start` — **live の欠落2件と完全一致**

⇒ 「example の hook script 集合 ⊆ 配線済み集合」という**1本の包含述語**で両方が閉じる。observed では左辺 12 に対し右辺 10（直接配線ゼロ）で **2件破れている**。

### 6. live 設定を検査する面の不在

`AMADEUS_SRC = <REPO_ROOT>/dist/claude/.claude`（`tests/harness/fixtures.ts:57`）。settings を読む既存ガード:

| テスト | 対象 | live を見るか |
|---|---|---|
| `tests/smoke/t03-settings-json.test.ts` | `AMADEUS_SRC/settings.json.example`（dist の example） | ✗ |
| `tests/integration/t40-settings-hook-config.test.ts` | 同上 | ✗ |
| `tests/integration/t131-hooks-settings-fire.test.ts` | 同上 | ✗ |
| `tests/unit/t132-hooks-doc-count-sync.test.ts` | `AMADEUS_SRC/settings.json.example` + `AMADEUS_SRC/hooks/*.ts` + doc | ✗ |
| `tests/integration/t327-hook-wiring-xor-closure.integration.test.ts:38` | `WIRING_SITE.claude = "packages/framework/harness/claude/settings.json.example"` | ✗（正本 example） |
| `tests/unit/t416` / `t418`（+ integration 版） | `.claude/settings.json` を**パス membership としてのみ**参照 | 部分（hook 集合は不検査） |

⇒ **live `.claude/settings.json` の hook 集合を検査する面は observed でも実在しない**。reviewer の主張は currency あり。

`t327` の設計コメント（`:35-36`）は `Read from source so dist staleness cannot mask a missing trigger.` と記し、正本を読む選択を明示している — この方針自体は正しいが、live 面は依然どのガードにも覆われない。

### 7. Unit B 患部 verbatim（observed）

`packages/framework/core/tools/amadeus-lib.ts:4125-4128`:

```ts
// The tool whose invocation opens a subagent on the harnesses that have no
// dedicated start event (Claude Code): the start seam there is PreToolUse, and
// PreToolUse fires for EVERY tool.
export const SUBAGENT_DISPATCH_TOOL = "Task";
```

同 `:4160-4161`:

```ts
export function subagentStartFields(payload: ClaudeCodeHookInput, agentsDir?: string): Record<string, string> | null {
  if (payload.tool_name !== undefined && payload.tool_name !== SUBAGENT_DISPATCH_TOOL) return null;
```

型: `tool_name?: string;`（`:4774`、`ClaudeCodeHookInput`）。

**定数の消費者は 1 箇所のみ** — `:4128` を読むのは `:4161` のガードだけ（repo 全域 grep、dist/self-install 除く。他ヒットは codekb 記述と `tests/.coverage-registry.json:4250` の `unitId: "function:SUBAGENT_DISPATCH_TOOL"`）。

### 8. テストピン 15 箇所（全数）

`grep -rn 'tool_name: *"Task"' tests/` → **15件 / 3ファイル**（レビュー時点と件数・所在とも不変）:

| ファイル | 行 | 件数 | 駆動形 |
|---|---|---|---|
| `tests/unit/t-subagent-purpose.test.ts` | 66, 89, 96, 97, 101, 113 | 6 | `subagentStartFields` を**正本から直 import**（`:15`）、in-process |
| `tests/integration/t454-subagent-model-attribution.integration.test.ts` | 291, 369, 377, 387, 395, 407, 418, 426 | 8 | `dist/claude/.claude/tools/amadeus-lib.ts` から import（`:33`）= 生成物面。`:291` は起動フック spawn 経路 |
| `tests/integration/t-log-subagent-start.integration.test.ts` | 106 | 1 | `taskDispatch`（`:104-108`）が `{hook_event_name:"PreToolUse", tool_name:"Task", tool_input}` を組みフックを **spawn**（`HOOK = join(AMADEUS_SRC, "hooks", …)` = dist 面） |

**非患部の "Task" リテラル**（誤爆させない面）:

| 面 | 行 | 性質 |
|---|---|---|
| `tests/smoke/t03-settings-json.test.ts` | :111 | `permissions.allow` の必須ツール一覧 |
| `tests/unit/t04-agent-frontmatter.test.ts` | :168-170 | agent frontmatter の tools 一覧 |
| `packages/framework/harness/claude/settings.json.example` | :14 | `permissions.allow` |
| docs（13-customization ×2、14-claude-features ×2） | — | `permissions` 記述 |

**既存の両語彙受理の先例**（両 reviewer 未言及、重要な設計材料）— `tests/integration/t189-compose-dispatch.sdk.test.ts:78-81`:

```ts
        // subagent tool as "Task" or "Agent" depending on the SDK build -
        // accept either; an inline-improvised grid would show neither.
        const taskCalls = r.toolResults.filter(
          (t) => t.toolName === "Task" || t.toolName === "Agent",
        );
```

### 9. doc 面の全数（レビューの4面より広い）

| 面 | observed 行 | レビュー言及 |
|---|---|---|
| `.claude/knowledge/amadeus-shared/audit-format.md` | :176、:181 | :176 のみ ✓ |
| `packages/framework/core/knowledge/amadeus-shared/audit-format.md`（正本） | :176、:181 | :176 のみ ✓ |
| `docs/reference/12-state-machine.md` | :400 | ✓ |
| `packages/framework/core/tools/amadeus-lib.ts` コメント | :4149 | ✓ |
| `packages/framework/core/hooks/amadeus-log-subagent-start.ts` | :10-12 | ✓ |
| `docs/reference/06-hooks-and-tools.md` | :26, :46, :205, :215, :219 | **未列挙** |
| `docs/reference/06-hooks-and-tools.ja.md` | :25, :44, :203, :213, :217 | **未列挙** |
| `docs/reference/23-telemetry-schema.md` | :194 | **未列挙 + stale cite** |
| `docs/reference/23-telemetry-schema.ja.md` | :189 | **未列挙 + stale cite** |

**新規発見 — 23-telemetry-schema の cite が完全に stale**。`docs/reference/23-telemetry-schema.md:194` verbatim:

> `| Claude Code | \`PreToolUse\` on the dispatch tool | the hook fires for *every* tool, so the field derivation declines anything but the dispatch tool \`Task\` (\`tools/amadeus-lib.ts:4430\`, \`:4456-4457\`) |`

observed の該当行は無関係:

```
4430: // The recorded repo set for an intent (its intents.json row's `repos`), or [] when
4456: }
4457: （空行）
```

正しい引用先は **`:4128`（定数）/ `:4160-4161`（ガード）**。`.ja.md:189` も同一 cite を持つ。#2303 の doc 同期はこの2面の cite 訂正も射程に入る（`cid:requirements-analysis:mechanism-cite-verify-at-draft` の違反実例）。

**語彙の切り分け（修正時に壊してはいけない区別）**: matcher `^Task$` は**表示名の名前空間**で照合され、reviewer-2 が `^Task$` / `^Agent$` / 素の `Task` の3 matcher 同時発火で正しさを確認済み。⇒ `settings.json.example:62` および `06-hooks-and-tools.md:46/:215`（ja `:44/:213`）の matcher 記述は**修正対象外**。旧語彙として直すべきは **payload の `tool_name` に関する記述のみ**。

### 10. kimi 経路の保全条件

短絡通過の実装は `amadeus-lib.ts:4161` の `payload.tool_name !== undefined &&`。設計意図は `:4149-4153` に逐語:

```
// Two payload shapes converge here: the tool envelope (PreToolUse{Task}, which
// carries subagent_type/prompt inside tool_input) and a dedicated start event
// (kimi's SubagentStart, which carries them at the top level and has no
// tool_name at all). Absence of tool_name therefore means "a seam that only
// fires for subagents", not "unknown tool".
```

kimi 側の payload 構築（`packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts:732-741` verbatim）:

```ts
    case "role-start":
      // The one real subagent-start seam across the harnesses (U4). Kimi ships
      // the dispatch prompt here, so Purpose is derivable; there is no
      // agent_id in any probed version and no tool envelope, which is what
      // tells the core hook this fires only for subagents.
      return JSON.stringify({
        hook_event_name: "SubagentStart",
        agent_type: env.agent_name ?? "",
        prompt: promptText(env.prompt),
      });
```

配線は `packages/framework/harness/kimi/hooks/amadeus-hooks.snippet.toml:59-60`（`event = "SubagentStart"` → `amadeus-kimi-adapter.ts role-start`）。

**保全条件（事実）**: kimi payload に `tool_name` キーは**存在しない**。⇒ 修正形は `tool_name === undefined` の分岐を必ず通過側に残す必要がある。回帰テストは `tests/unit/t-subagent-purpose.test.ts:82-86`（`{hook_event_name:"SubagentStart", agent_type:"explore", prompt:"Look around"}` → フィールド返却）が既にピンしている。

---

## 設計材料

### 方式 (a) / (b) の対比（Unit A の配線形）

| 観点 | **(a) dispatcher スロット追加 + dispatcher 形で配線** | **(b) live に直接パス形で配線** |
|---|---|---|
| 既存11エントリとの整合 | 一致（live は現在 100% dispatcher 形） | 混在が発生（11 dispatcher + 1〜2 直接） |
| example との対応 | 形式差は残る（example は直接パス形のまま） | 形式が example と一致 |
| 再発防止の検査形 | 「example 集合 ⊆ スロット集合」の**単一述語**で閉じる | 「⊆ スロット ∪ 直接配線」の**2項述語**が要る |
| 副作用リスク | `ensureCompleteHookTree` の**部分欠 throw** の母集団が広がる（全欠なら exit 0 なので fresh clone は保護される） | 追加なし |
| plugin-compose 同梱 | 同一機構で2件同時に解決 | 同左 |
| ランタイム挙動差 | なし（`forwardToHook` が stdin/env を素通し） | なし |

**裁定なし**（材料のみ）。

### 修正候補 C1 / C2 / C3 の対比（Unit B の語彙形）

| 候補 | (8) テスト15箇所 | (9) doc | (10) kimi 短絡 | 追加の副作用 |
|---|---|---|---|---|
| **C1: 定数を単一の新語彙へ置換** | 15箇所すべて改訂必須。`TaskUpdate`/`Write` の null 期待（`t-subagent-purpose.test.ts:77-78`）は**そのまま有効**（どちらも新語彙と不一致） | 「dispatch tool は `Task`」の記述をすべて新語彙へ。matcher 記述は不変 | 無影響（`undefined` 分岐は不変） | matcher `^Task$` が別語彙 payload に発火する非直観を doc で説明する必要（`:4145-4147` のコメントは要書き換え）。旧版ハーネスが旧語彙を送る場合の後方非互換は**未実測** |
| **C2: 両語彙受理**（`["Task","Agent"].includes(tool_name)` 相当） | 既存15箇所は**すべて緑のまま**（旧語彙も受理）。新語彙を受理する新テストが無いと欠陥閉包を実証できない → **偽 green のまま通過するリスク**（`cid:code-generation:corpus-sweep-for-new-guards` の両側実測が必須） | 「旧語彙 または 新語彙」へ。matcher 記述は不変 | 無影響 | `t189:78-81` の既存前例と整合。単数定数 `SUBAGENT_DISPATCH_TOOL` のままでは表現不能 → **集合定数への型変更**が要り、`tests/.coverage-registry.json:4250` の `unitId: "function:SUBAGENT_DISPATCH_TOOL"` も同期対象になる |
| **C3: 拒否リスト化**（`TaskUpdate`/`TaskCreate` 等を明示拒否し、それ以外を通過） | `:77-78` の `TaskUpdate` null 期待は維持できるが、`Write` の null 期待（`:78`）が**破れる** → 改訂必須 | 大幅書き換え | 無影響 | PreToolUse が全ツールで発火するため通過側が全ツールへ広がり誤 emit リスクが大。`subagent_type` 不在時 `normalizeAgentType`（`:4108-4110`）が `"unknown"` を返し、**大量の phantom `SUBAGENT_STARTED`** を生む |

**裁定なし**（材料のみ）。C2 の偽 green リスクは本 intent 最大の品質論点。

### drift ガードの正規化キー

形式差（dispatcher 形 `… amadeus-dispatch.ts <slug>` vs 直接形 `… amadeus-<name>.ts`）があるため、テキスト等価では 11/13 件すべてが差分に見える（reviewer 両名の指摘と一致）。正規化キーの候補は**三つ組**:

| 要素 | dispatcher 形からの導出 | 直接形からの導出 |
|---|---|---|
| `event` | JSON のキー | 同左 |
| `matcher` | JSON の `matcher` | 同左 |
| hook script 名 | slug → `HOOK_PATHS[slug]` の basename | command 中の `amadeus-*.ts` を抽出 |

ground truth は正本（tracked）側とする（§4 の帰結）。

### 閉包検証の材料

既存 `tests/integration/t-log-subagent-start.integration.test.ts` の形（`runHook` = フック spawn + `CLAUDE_PROJECT_DIR` 指定、`seededAuditDir`/`seededStateFile` で3ゲート充足、`fieldsFor(proj,"SUBAGENT_STARTED")` で監査行を読む）が**そのまま end-to-end 実証に転用可能**。`taskDispatch`（`:104-108`）の `tool_name` を live 語彙へ切り替えれば、**Unit B 側の閉包（`SUBAGENT_STARTED` が実際に1行出る）は決定的に実証できる**。

ただし **Unit A の閉包（live 配線）はこの形では実証できない** — テストは `CLAUDE_PROJECT_DIR` を fixture プロジェクトへ向け `.claude/settings.json` を読まずフックを直接 spawn するため。live 配線の閉包は §6 の drift ガード（正本 example ⊆ live の正規化包含）が担う設計になる。**両方直った状態の真の end-to-end 実証は live dispatch の監査観測を要し、テスト内では構造的に不能**（`cid:build-and-test:verdict-names-unverified-facets` の適用対象）。

### tNNN 採番の回避（t481 / t482）

observed に `tests/unit/t481-resolve-project-dir-worktree-marker.test.ts`（#2413 で着地）が実在し、open PR #2414 が `tests/integration/t481-pr-convergence-lifecycle.test.ts` を追加する。**同一番号 t481 が本線と open PR で重複**（`cid:code-generation:c1-tnnn-collision-on-regrounding` 該当）。本 intent の患部ではないが、新規テストを起こす際は **t481 / t482 を避け、再接地時に固定 base SHA の `tests/` で採番を再確認**すること。

---

## Unit A / Unit B の依存関係

ファイル単位で**非交差**:

| | Unit A（配線 / #2297） | Unit B（語彙 / #2303） |
|---|---|---|
| 変更面 | `.claude/settings.json`、`packages/framework/harness/claude/hooks/amadeus-dispatch.ts`（方式 (a) の場合）、新規 drift ガードテスト | `packages/framework/core/tools/amadeus-lib.ts`、`tests/unit/t-subagent-purpose.test.ts`、`tests/integration/t454-*`、`tests/integration/t-log-subagent-start.*`、`packages/framework/core/hooks/amadeus-log-subagent-start.ts`、doc 群 |

⇒ **worktree 隔離の並行実装が可能**。ただし交差候補が2点:

1. **`docs/reference/06-hooks-and-tools.md` / `.ja.md`** — Unit B の旧語彙面（`:26/:46/:205/:215/:219`）。Unit A が dispatcher スロットを追加する場合、同 doc の hook インベントリ節が `t132` の forward/reverse 照合対象（`AMADEUS_SRC/hooks/*.ts` × `settings.json.example` × doc）なので、**同一ファイルを両 Unit が触る可能性**。dispatcher スロット追加は hook スクリプトファイルを増やさず example も変えないため `t132` の3面には影響しないと**推定**されるが、これは**未実測の仮説**であり設計段で確認が必要。
2. **`packages/framework/harness/claude/settings.json.example`** — Unit A が方式 (b) を採り example の形式に寄せる場合に触る可能性。Unit B は matcher を変えないため触らない（§9 の切り分け参照）。

**論理的な依存**（ファイル交差とは別軸、両 reviewer が明示）: どちらか一方だけでは `SUBAGENT_STARTED` は 0 件のまま。⇒ 並行実装は可能だが、**閉包の実証は両方の着地後**にしかできない。

---

## 交差判定

- **open PR は1件のみ**: #2414 `bolt/landed-report`（pr-convergence plugin、8ファイル）。変更面は `plugins/pr-convergence/**`、`amadeus-sensor-pr-convergence-report-format.ts`、`t450`/`t481-pr-convergence-lifecycle`/`t482`。**本 intent の患部と非交差**。
- **base→observed の2 commits と患部の交差**: `amadeus-lib.ts` の hunk は `:227-243`（`resolveProjectDir`）と `:6684` のみ。SUBAGENT 領域 `:4128` / `:4160-4172` とは**非交差**（静的目録でなく hunk ヘッダの実測による）。他の変更ファイルは codekb・elections・intent record・`t144`・新規 `t481`・`project.md`・`.coverage-registry.json` で、患部ファイルはいずれも含まれない。

---

## 未解決・引き継ぎ

1. **例外5件の機序が未確定** — 両 Issue の reviewer が独立に検出し、いずれも「確定できず」。`260805-subagent-type-guard` の 2026-08-06T02:31:14Z〜03:40:38Z に `SUBAGENT_STARTED` が5件のみ存在（`Agent Type` は Claude Code ペルソナ名 — `amadeus-developer-agent` ×4 / `amadeus-architecture-reviewer-agent` ×1）。本スキャンでも新たな説明材料は得られていない（当該 worktree 不在、`git log --all` に該当する修正コミットなし、observed でも `:4128` は旧語彙のまま、live に `PreToolUse` なし）。reviewer-1（#2303）の提言「修正時にこの5件がなぜ通ったのかを確認する」は**未消化のまま要件段へ引き継ぐ** — 現在のガード理解が不完全である可能性を潰せるため、また修正形の妥当性判断（例えば当時 payload が別形状だったなら C2 が正解に近づく）に直接効くため。
2. **`plugin-compose` 同梱の可否** — 欠落2件は同一の構造原因から出ており包含述語1本で同時に閉じるため、**ガードを本 intent で入れるなら構造的に同梱が要求される**。一方 #2297 の本文・完了条件は PreToolUse のみを名指しており、同梱はスコープ拡大にあたる（`cid:requirements-analysis:implementation-deviation-election` の裁定事項）。影響（**仮説、未実測**）: live に plugin-compose が無いことで、このリポジトリ自身の plugin 自動 compose が発火していない可能性。`t327` の XOR closure は正本 example を見るため検出していない。
3. **live 配線の end-to-end 閉包はテスト内で構造的に不能**（§閉包検証の材料）。build-and-test の verdict で未検証面として明示されるべき事項。
