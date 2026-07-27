# Harness Capability Matrix — U1 harness-capability-matrix（Bolt 1）

> 上流入力(consumes 全数): functional-design/domain-entities、functional-design/business-logic-model、functional-design/business-rules、application-design/decisions(ADR-4/ADR-5)、application-design/components(C9)、application-design/component-methods(C1/C3/C4)、application-design/services、units-generation/unit-of-work-story-map、requirements(FR-1)、nfr-design/performance-design、nfr-design/security-design、nfr-design/scalability-design、nfr-design/reliability-design
> 7 ハーネス × 6 面の実測マトリクス。各セルは実測(file:line 引用 or コマンド出力 → ProbeRecord 参照)か `⚠ deferred(実装時実測)` +確定条件 1 行(BR-U1-2)。クラス literal の正準は ADR-4(`"native-manifest" | "folder-drop-auto" | "manual-only"`)。
> 各セルの trace は reliability-design「参照 ID 規約」の `P-<harness>-<面>` 形式 probe-id(7×6=42 個 distinct)で ProbeRecord 索引へ引く。42 count 照合は scalability-design「列の固定列挙」の §12a 機械確認 1 手。ProbeRecord のフィールド様式(probe-id / command verbatim / preprocessing / verdict)は security-design「ProbeRecord 様式」の fail-closed 決定に従う。performance-design のとおり所要時間・タイムスタンプフィールドは意図的に設けない。

## 測定 ref

- HEAD SHA(`git rev-parse HEAD` 実測): **`7833768fb6bca7de750d39bb800dccc0e0cc46d0`**
- 全 file:line 引用は本 SHA の作業ツリー実測に紐づく(measurement-ref-in-artifacts)。
- 数値・語彙はコマンド出力・実ファイルからの転記のみ(numbers-from-command-output-only)。

---

## (a) 7 行 × 6 列 マトリクス

各セル末尾の `[P-<harness>-<面>]` は下記 (d) ProbeRecord 索引表への per-cell trace ID(reliability-design の参照 ID 規約 — 42 個 distinct)。

### 列 1: distribution（配布形式 + クラス割当）

| harness | distribution 実測 | クラス割当 |
|---|---|---|
| claude | harnessDir `.claude`(`claude/manifest.ts:43`)。self-install 面(`SELF_INSTALL_HARNESSES`, `plugin-projection.ts:60`)に含む。ホスト native = Claude Code plugin marketplace(feasibility-assessment.md:24 の上流 Plugin Mechanism doc)。⚠ deferred(実装時実測): marketplace `/plugin` 導入 UI/コマンドはローカル起動不能 — 実装時に host CLI で実測。[P-claude-distribution] | `native-manifest` |
| codex | harnessDir `.codex`(`codex/manifest.ts:24`)。self-install 含む(`plugin-projection.ts:60`)。ホスト native プラグイン導入 UI は不在 — 配布は git tag+hash pin(feasibility-assessment.md:24)。自動 compose の実測 seam は SessionStart フック(下記列4)。[P-codex-distribution] | `folder-drop-auto` |
| cursor | harnessDir `.cursor`(`cursor/manifest.ts:30`)。self-install 含む(`plugin-projection.ts:60`)。ホスト native プラグイン導入機構は上流に前例なし(feasibility-assessment.md:28)。実測 seam = sessionStart フック(列4)。[P-cursor-distribution] | `folder-drop-auto` |
| kimi | harnessDir `.kimi-code`(`kimi/manifest.ts:35`)。self-install 含む(`plugin-projection.ts:60`)。ホスト native 導入機構は上流に前例なし(feasibility-assessment.md:28)。実測 seam = SessionStart スニペット(列4)。[P-kimi-distribution] | `folder-drop-auto` |
| kiro | harnessDir `.kiro`(`kiro/manifest.ts:27`)。self-install **非対象**(`projections.ts:105` `selfRoot: null`; `SELF_INSTALL_HARNESSES` に不在, `plugin-projection.ts:60`)。上流は Kiro を「信頼ゲートなし folder-drop」(feasibility-assessment.md:29)。実測 seam = agentSpawn フック(列4)。[P-kiro-distribution] | `folder-drop-auto` |
| kiro-ide | harnessDir `.kiro`(`kiro-ide/manifest.ts:24`)。self-install **非対象**(`projections.ts:111` `selfRoot: null`)。native IDE hook ファイル(`.kiro.hook`)を `.kiro/hooks/` から自動ロード(下記列4)。[P-kiro-ide-distribution] | `folder-drop-auto` |
| opencode | harnessDir `.opencode`(`opencode/manifest.ts:35`)。self-install 含む(`plugin-projection.ts:60`)。ホスト native 導入機構は上流に前例なし(feasibility-assessment.md:28)。自動 compose 用の session-start seam は **未配線**(列4参照 — chat.message のみ実測)。[P-opencode-distribution] | `manual-only`（fail-closed, BR-U1-6） |

### 列 2: trust（信頼境界 + 承認方法）

| harness | trust 実測 | Amadeus grant との重ね方 |
|---|---|---|
| claude | `settings.json.example` が Amadeus ツールを事前承認(hooks 経路 `${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/…`, `settings.json.example:29,40,51`)。[P-claude-trust] | ADR-4「trust grant・no-clobber・atomic は engine 側で同一」。grant なし compose は fail-closed |
| codex | S9a trust-hash recipe: `trustHash(eventSnake, command)` が `sha256:` を生成(`codex/emit.ts` 内 `trustHash`/`trustEntries`)。Starlark `prefix_rule(pattern=["bun",".codex/tools/"], decision="allow")`(`codex/emit.ts:109-110`)。[P-codex-trust] | ADR-4 と同一。hash pin はホスト側 tamper 検出、compose gate は Amadeus grant |
| cursor | hooks.json + permission `deny`/`ask`(`cursor/emit.ts:42`)。[P-cursor-trust] | ADR-4 と同一 |
| kimi | hooks.snippet.toml 経由(`kimi/hooks/amadeus-hooks.snippet.toml`)。permission narrowing は host 既定に従う。[P-kimi-trust] | ADR-4 と同一 |
| kiro | agents/amadeus.json の hooks 登録(`kiro/agents/amadeus.json:53-94`)。ホスト信頼ゲートなし(上流, feasibility-assessment.md:29)。[P-kiro-trust] | ADR-4「上流 Kiro の信頼ゲートなしより強い契約」= Amadeus grant が唯一のゲート |
| kiro-ide | `.kiro.hook` の `"enabled":true`(`kiro-ide/hooks/amadeus-session-start.kiro.hook`)。ホスト信頼ゲートなし。[P-kiro-ide-trust] | 同上 — Amadeus grant が唯一のゲート |
| opencode | `opencode.json` permission narrowing(edit/bash/webfetch を allow→ask, `opencode/emit.ts:52-53`)。JS plugin ロードは host 既定で許可要求。[P-opencode-trust] | ADR-4 と同一。grant なし compose は fail-closed |

### 列 3: composeTrigger（イベント語彙の存在実測 + 語彙実測）

BR-U1-4: 「機構の存在」と「イベント語彙・起動保証」を分離。書き手の起動条件まで実測(seam-writer-mode-precondition)。

| harness | 機構の存在 | イベント語彙(実測) | session-start 相当の起動保証 |
|---|---|---|---|
| claude | settings.json hooks(`settings.json.example:34-44`) | `SessionStart`(matcher `""`, `settings.json.example:34-37`) | ✅ measured: native SessionStart イベント。eager(上流 Plugin Mechanism doc, feasibility:24)。[P-claude-composeTrigger] |
| codex | hooks.json(`codex/emit.ts` `HOOK_WIRING`) | `SessionStart` → target `session-start`(`codex/emit.ts:31`) | ✅ measured: SessionStart 配線実在(`codex/emit.ts:31`)。adapter case `session-start`(`codex/hooks/amadeus-codex-adapter.ts:247`)。[P-codex-composeTrigger] |
| cursor | hooks.json(`cursor/emit.ts` `HOOK_WIRING`) | `sessionStart` → target `session-start`(`cursor/emit.ts:63`) | ✅ measured: sessionStart 配線実在。adapter case `session-start`(`cursor/hooks/amadeus-cursor-lib.ts:98-107`)。[P-cursor-composeTrigger] |
| kimi | hooks.snippet.toml | `event = "SessionStart"` → `amadeus-kimi-adapter.ts session-start`(`kimi/hooks/amadeus-hooks.snippet.toml:20-22`) | ✅ measured: SessionStart 実在。ただし context 注入は none(観測のみ, `kimi/hooks/amadeus-kimi-lib.ts:40-44`) — compose 起動には context 注入不要のため充足。[P-kimi-composeTrigger] |
| kiro | agents/amadeus.json hooks | `agentSpawn` → `amadeus-kiro-adapter.ts session-start`(`kiro/agents/amadeus.json:54-56`) | ✅ measured: agentSpawn(セッション起動相当)で session-start target 発火。[P-kiro-composeTrigger] |
| kiro-ide | `.kiro.hook` ファイル | `"when":{"type":"promptSubmit"}` → `amadeus-kiro-adapter.ts session-start`(`kiro-ide/hooks/amadeus-session-start.kiro.hook`) | ⚠ 語彙差 measured: 真の session-start ではなく **promptSubmit** 発火。初回プロンプト時に発火するため `compose --if-stale`(冪等)で充足。確定条件: 実装時に「初回 promptSubmit までに compose が走ってよい」を Bolt 6 で確認。[P-kiro-ide-composeTrigger] |
| opencode | JS plugin(`opencode/plugin/amadeus-opencode-plugin.ts`) | `chat.message` のみ配線(`amadeus-opencode-plugin.ts:36`)。**session-start / session lifecycle イベントは未配線** | ⚠ deferred(実装時実測): opencode plugin API の session-start 相当イベントの有無は未実測。現状 seam は per-message の `chat.message`(JS in-process、bun スクリプト起動ではない)。確定条件: 実装時に opencode plugin API の session lifecycle event を live/上流 doc で実測、なければ chat.message + `--if-stale` を per-message 冪等トリガとして採用可否を Bolt 6 で判定。[P-opencode-composeTrigger] |

### 列 4: rootResolution（project / plugin / harness root の解決）

| harness | root 解決(実測) |
|---|---|
| claude | hook 起動行 `bun "${CLAUDE_PROJECT_DIR:-.}/…"`(`claude/manifest.ts:37`)。`:-.` は CLAUDE_PROJECT_DIR 未設定時に cwd 相対へ倒す(`claude/manifest.ts:25-32`)。スクリプト側は共通 ladder(下記)。[P-claude-rootResolution] |
| codex | `codex.cwd ?? process.cwd()`(`codex/hooks/amadeus-codex-adapter.ts:92`) [P-codex-rootResolution] |
| cursor | `process.cwd()`(`cursor/hooks/amadeus-cursor-lib.ts:300`) [P-cursor-rootResolution] |
| kimi | `env.cwd ?? projectDir`(projectDir=`process.cwd()`)(`kimi/hooks/amadeus-kimi-lib.ts:317,351`) [P-kimi-rootResolution] |
| kiro | `resolveProjectDirFromHook(import.meta.url, payloadCwd)`(共通 core ladder, `core/tools/amadeus-lib.ts:297`)。payload cwd(marker 有時) → CLAUDE_PROJECT_DIR → cwd marker ancestor → script-path 派生 → cwd(`amadeus-lib.ts:304-335`) [P-kiro-rootResolution] |
| kiro-ide | `resolveProjectDirFromHook(import.meta.url)`(`kiro-ide/hooks/amadeus-kiro-adapter.ts:71`) — 共通 core ladder [P-kiro-ide-rootResolution] |
| opencode | `opencodeProjectDir(input)`: PluginInput の `worktree`(優先) → `directory`(`opencode/lib/amadeus-opencode-vocab.ts:20-26`)。path heuristic 不要(絶対パス供給) [P-opencode-rootResolution] |

> 共通 ladder（全ハーネスの plugin root / harness root）: plugin source root = `plugins/<name>/`(neutral bundle 実測: `dist/plugins/formal-model-check/`, `plugin-projection.ts:274`)。harness root = 各 harnessDir(列1)。host 投影先 = `dist/<harness>/<harnessDir>/plugins/<name>/`(`plugin-projection.ts:4-5`)。

### 列 5: userOps（compose / doctor / drop の手動床 — C1 verb 表への写像）

component-methods.md C1(`amadeus-plugin.ts` CLI)は engine 中立で全ハーネス共通。全ハーネスで手動床 1 コマンド `compose` が成立(BR-U1-3)。

共通契約(C1 verb 表): `bun <harnessDir>/tools/amadeus-plugin.ts compose [--if-stale] [--project-root <dir>]`。doctor = `… amadeus-plugin.ts doctor`([degraded]=FAIL/[advisory]=PASS)。drop = `… amadeus-plugin.ts drop <plugin-name>`。引数なし=usage(exit 2)、未知フラグ=fail-closed 拒否(exit 2)。

| harness | 手動床(harnessDir 具体化 + 起動条件) |
|---|---|
| claude | `bun .claude/tools/amadeus-plugin.ts compose …`(self-install 対象 — 作業ツリー直起動可)。[P-claude-userOps] |
| codex | `bun .codex/tools/amadeus-plugin.ts compose …`(self-install 対象)。[P-codex-userOps] |
| cursor | `bun .cursor/tools/amadeus-plugin.ts compose …`(self-install 対象)。[P-cursor-userOps] |
| kimi | `bun .kimi-code/tools/amadeus-plugin.ts compose …`(self-install 対象)。[P-kimi-userOps] |
| kiro | `bun .kiro/tools/amadeus-plugin.ts compose …` — self-install 非対象のため dist ツリー or 明示 `--project-root` で起動(列6 degrade 契約)。[P-kiro-userOps] |
| kiro-ide | kiro と同 harnessDir(`.kiro`)・同床(self-install 非対象)。[P-kiro-ide-userOps] |
| opencode | `bun .opencode/tools/amadeus-plugin.ts compose …`(self-install 対象)。manual-only クラスのため本手動床が唯一の契約(列6)。[P-opencode-userOps] |

> harnessDir は列1(claude=`.claude`, codex=`.codex`, cursor=`.cursor`, kimi=`.kimi-code`, kiro/kiro-ide=`.kiro`, opencode=`.opencode`)。kiro/kiro-ide は self-install 非対象のため手動床は dist ツリー or 明示 `--project-root` で起動(下記 degrade 契約)。

### 列 6: degradeContract（ホスト機構がない場合の明示 degrade — silent skip 禁止）

| harness | degrade 契約(手動床 1 コマンド + doctor 表示) |
|---|---|
| claude | marketplace deferred の間: 手動床 `compose`(C1)で folder-drop-auto と同等に着地。doctor 出力 `[advisory] claude: marketplace install deferred — manual compose available`。[P-claude-degradeContract] |
| codex | native UI なし: SessionStart 自動 compose(列3 measured)を既定。フック未登録時の床 = 手動 `compose`。doctor `[degraded] codex: session-start hook not wired` / 正常時 `[advisory]`。[P-codex-degradeContract] |
| cursor | codex と同型(sessionStart)。doctor `[degraded] cursor: session-start hook not wired` / 正常時 `[advisory]`。[P-cursor-degradeContract] |
| kimi | codex と同型(SessionStart)。doctor `[degraded] kimi: session-start hook not wired` / 正常時 `[advisory]`。[P-kimi-degradeContract] |
| kiro | self-install 非対象: 手動床は `--project-root <repo>` 明示 or dist ツリー起動。agentSpawn 自動 compose 既定。doctor `[degraded] kiro: agentSpawn hook not wired` / 正常時 `[advisory]`。[P-kiro-degradeContract] |
| kiro-ide | self-install 非対象(kiro と同床)。promptSubmit 自動 compose(冪等 `--if-stale`)。doctor `[advisory] kiro-ide: compose triggers on first prompt (promptSubmit)`。[P-kiro-ide-degradeContract] |
| opencode | session-start seam 未配線(manual-only): **手動床 `compose` が唯一の契約**。doctor `[degraded] opencode: no session-start trigger — run 'amadeus-plugin.ts compose' manually`。chat.message seam の採用可否は Bolt 6 の deferred(列3)。[P-opencode-degradeContract] |

---

## (b) クラス割当 + 判定根拠（決定的 — business-logic-model.md:16-19）

| harness | クラス | 判定根拠(決定的ロジックのどの枝か) |
|---|---|---|
| claude | `native-manifest` | Claude Code plugin marketplace が documented host native 機構(feasibility:24)。install UI はローカル実測不能のため distribution セルは ⚠ deferred だが、ADR-4 canonical が claude を native 系に指定し、自動 compose の SessionStart フックは measured(列3) — folder-drop-auto を下限として保証しつつ native-manifest を上位割当 |
| codex | `folder-drop-auto` | native プラグイン導入 UI 不在(git tag+hash pin は手動 git 操作)。セッションライフサイクルフック(SessionStart)から bun スクリプト起動が measured(`codex/emit.ts:31`) → 枝(ii) |
| cursor | `folder-drop-auto` | native 機構なし・sessionStart フック measured(`cursor/emit.ts:63`) → 枝(ii) |
| kimi | `folder-drop-auto` | native 機構なし・SessionStart スニペット measured(`kimi/hooks/amadeus-hooks.snippet.toml:20`) → 枝(ii) |
| kiro | `folder-drop-auto` | native 機構なし・agentSpawn→session-start measured(`kiro/agents/amadeus.json:54-56`) → 枝(ii)。上流も folder-drop |
| kiro-ide | `folder-drop-auto` | native IDE hook ファイル自動ロード + promptSubmit 発火 measured(`.kiro.hook`) → 枝(ii)(語彙差は `--if-stale` 冪等で吸収) |
| opencode | `manual-only` | native 機構なし。session-start / session lifecycle フックが **未配線**(chat.message のみ measured, `amadeus-opencode-plugin.ts:36`) — セッションライフサイクルからの bun スクリプト起動が実測できず、枝(ii)不成立 → **fail-closed で枝(iii)**(BR-U1-6)。手動 1 コマンド compose のみを契約 |

### クラス割当 集計（列挙からの機械再計算 — ledger-count-mechanical-recalc）

- `native-manifest`: **1**(claude)
- `folder-drop-auto`: **5**(codex, cursor, kimi, kiro, kiro-ide)
- `manual-only`: **1**(opencode)
- 合計: **7**(欠落・「未定」なし — BR-U1-1 / domain-entities.md:30)

---

## (c) degrade 契約（横断サマリ — BR-U1-3 silent skip 禁止）

- どのクラスでも trust grant・no-clobber・atomic は engine 側で同一(ADR-4)。grant なし compose は fail-closed。
- 全 7 ハーネスで手動床 1 コマンド `compose`(C1)が成立 — 行の省略・空欄での回避なし。
- deferred 面(claude marketplace / kiro-ide promptSubmit 語彙差 / opencode session-start)は必ず doctor に可観測な行を出す(列6)。doctor verb 契約 `[degraded]=FAIL / [advisory]=PASS`(component-methods.md C1)。
- self-install 非対象の kiro / kiro-ide は手動床を `--project-root` 明示 or dist ツリーで起動(列6)。

---

## (d) ProbeRecord（プローブ記録 — 参照 ID で trace）

> 本セッションはホスト CLI 未導入のため全プローブが **read-only のリポジトリ実測**(mutation なし)。ホスト native 導入機構のライブ起動は不能面を `deferred(実装時実測)` とし確定条件を記した(BR-U1-2)。ライブ起動が可能になった際の前処理等価(probe-preprocessing-parity / BR-U1-5)は各 deferred の確定条件に含む。
> 構造は 2 層: (d-1) 元プローブ実行記録 P1〜P6(面ごとに 1 回のコマンド実行で 7 ハーネス分を一括実測 — command verbatim は security-design の機械走査層の対象)、(d-2) per-cell 索引表(reliability-design の `P-<harness>-<面>` 42 ID → 元プローブ + セル固有 evidence の file:line)。マトリクス各セルは (d-2) の ID で trace する。

### (d-1) 元プローブ実行記録（P1〜P6 — 面単位の一括実測）

| ID | target | command(verbatim) | output(要点) | verdict |
|---|---|---|---|---|
| P1 | 7 harness × distribution | `git rev-parse HEAD`；`grep -n 'SELF_INSTALL_HARNESSES\|PACKAGE_HARNESSES' scripts/plugin-projection.ts`；`grep -rn 'harnessDir' packages/framework/harness/*/manifest.ts`；`sed -n '94,125p' packages/framework/harness/projections.ts`；`ls dist/ dist/plugins` | HEAD=`7833768f…`; `SELF_INSTALL_HARNESSES=["claude","codex","cursor","opencode","kimi"]`(:60); `PACKAGE_HARNESSES` 7 値(:46-54); harnessDir 各値; kiro/kiro-ide `selfRoot:null`(:105,111); dist に 7 harness + plugins | measured(native UI 面は deferred) |
| P2 | 7 harness × trust | `grep -rniE 'trust\|prefix_rule\|permission' packages/framework/harness/*/emit.ts claude/settings.json.example`；`sed -n '119,160p' codex/emit.ts` | codex `trustHash`/`sha256:`/`prefix_rule … decision="allow"`(:109-110); cursor/opencode permission narrowing; claude settings pre-approve | measured |
| P3 | 7 harness × composeTrigger | `grep -nE 'event:\|target:' packages/framework/harness/{codex,cursor}/emit.ts`；`cat kimi/hooks/amadeus-hooks.snippet.toml`；`grep -nE 'agentSpawn\|session-start' kiro/agents/amadeus.json`；`cat kiro-ide/hooks/amadeus-session-start.kiro.hook`；`grep -nE 'chat.message\|session' opencode/plugin/amadeus-opencode-plugin.ts` | claude SessionStart(settings:34); codex SessionStart(emit:31); cursor sessionStart(emit:63); kimi SessionStart(snippet:20); kiro agentSpawn(agents:54-56); kiro-ide `when.type=promptSubmit`; opencode `chat.message` のみ(:36) | measured(opencode session-start は deferred) |
| P4 | 7 harness × rootResolution | `grep -rniE 'PROJECT_DIR\|projectDir\|cwd\(\)' packages/framework/harness/*/hooks/*.ts`；`sed -n '297,336p' packages/framework/core/tools/amadeus-lib.ts`；`sed -n '20,30p' opencode/lib/amadeus-opencode-vocab.ts` | codex `cwd??process.cwd()`(:92); cursor `process.cwd()`(:300); kimi `env.cwd??projectDir`(:317); kiro/kiro-ide `resolveProjectDirFromHook`(:297 ladder); opencode `worktree>directory`(:20-26); claude `${CLAUDE_PROJECT_DIR:-.}`(manifest:37) | measured |
| P5 | 全 harness × userOps | (一次資料直読)`component-methods.md` C1 verb 表 :6-20 | compose/doctor/drop/status/usage/fail-closed の 6 verb、exit 契約明記。engine 中立で全ハーネス共通 | measured |
| P6 | 全 harness × degradeContract | (起草)business-logic-model.md:12 + component-methods.md C1 doctor verb | 非対応・deferred 面ごとに手動床 1 コマンド + doctor 行を明文化 | measured(deferred 面の doctor 行は確定条件付き) |

### (d-2) per-cell 索引表（42 ID — reliability-design 参照 ID 規約）

各マトリクスセルの probe-id → 元プローブ(P1〜P6)+セル固有 evidence。全 evidence は測定 ref SHA `7833768f…` の作業ツリー実測。distinct ID 数の機械照合(scalability-design の §12a 機械確認 1 手): `grep -oE 'P-(claude|codex|cursor|kimi|kiro|kiro-ide|opencode)-(distribution|trust|composeTrigger|rootResolution|userOps|degradeContract)' harness-capability-matrix.md | sort -u | wc -l` = **42**。

| probe-id | 元プローブ | セル固有 evidence(file:line) | verdict |
|---|---|---|---|
| P-claude-distribution | P1 | `claude/manifest.ts:43`; `plugin-projection.ts:60`; feasibility-assessment.md:24 | measured(marketplace UI 面は deferred) |
| P-codex-distribution | P1 | `codex/manifest.ts:24`; `plugin-projection.ts:60`; feasibility-assessment.md:24 | measured |
| P-cursor-distribution | P1 | `cursor/manifest.ts:30`; `plugin-projection.ts:60`; feasibility-assessment.md:28 | measured |
| P-kimi-distribution | P1 | `kimi/manifest.ts:35`; `plugin-projection.ts:60`; feasibility-assessment.md:28 | measured |
| P-kiro-distribution | P1 | `kiro/manifest.ts:27`; `projections.ts:105`(selfRoot null); feasibility-assessment.md:29 | measured |
| P-kiro-ide-distribution | P1 | `kiro-ide/manifest.ts:24`; `projections.ts:111`(selfRoot null) | measured |
| P-opencode-distribution | P1 | `opencode/manifest.ts:35`; `plugin-projection.ts:60`; feasibility-assessment.md:28 | measured |
| P-claude-trust | P2 | `claude/settings.json.example:29,40,51` | measured |
| P-codex-trust | P2 | `codex/emit.ts:109-110`(trustHash / prefix_rule) | measured |
| P-cursor-trust | P2 | `cursor/emit.ts:42` | measured |
| P-kimi-trust | P2 | `kimi/hooks/amadeus-hooks.snippet.toml`(全文) | measured |
| P-kiro-trust | P2 | `kiro/agents/amadeus.json:53-94`; feasibility-assessment.md:29 | measured |
| P-kiro-ide-trust | P2 | `kiro-ide/hooks/amadeus-session-start.kiro.hook`(`"enabled":true`) | measured |
| P-opencode-trust | P2 | `opencode/emit.ts:52-53` | measured |
| P-claude-composeTrigger | P3 | `claude/settings.json.example:34-37`(SessionStart, matcher `""`) | measured |
| P-codex-composeTrigger | P3 | `codex/emit.ts:31`; `codex/hooks/amadeus-codex-adapter.ts:247` | measured |
| P-cursor-composeTrigger | P3 | `cursor/emit.ts:63`; `cursor/hooks/amadeus-cursor-lib.ts:98-107` | measured |
| P-kimi-composeTrigger | P3 | `kimi/hooks/amadeus-hooks.snippet.toml:20-22`; `kimi/hooks/amadeus-kimi-lib.ts:40-44` | measured |
| P-kiro-composeTrigger | P3 | `kiro/agents/amadeus.json:54-56`(agentSpawn→session-start) | measured |
| P-kiro-ide-composeTrigger | P3 | `kiro-ide/hooks/amadeus-session-start.kiro.hook`(`when.type=promptSubmit`) | measured(語彙差 — 確定条件付き) |
| P-opencode-composeTrigger | P3 | `opencode/plugin/amadeus-opencode-plugin.ts:36`(chat.message のみ — session-start 未配線) | deferred(確定条件付き) |
| P-claude-rootResolution | P4 | `claude/manifest.ts:37,25-32`(`${CLAUDE_PROJECT_DIR:-.}`) | measured |
| P-codex-rootResolution | P4 | `codex/hooks/amadeus-codex-adapter.ts:92` | measured |
| P-cursor-rootResolution | P4 | `cursor/hooks/amadeus-cursor-lib.ts:300` | measured |
| P-kimi-rootResolution | P4 | `kimi/hooks/amadeus-kimi-lib.ts:317,351` | measured |
| P-kiro-rootResolution | P4 | `core/tools/amadeus-lib.ts:297,304-335`(共通 ladder) | measured |
| P-kiro-ide-rootResolution | P4 | `kiro-ide/hooks/amadeus-kiro-adapter.ts:71`; `core/tools/amadeus-lib.ts:297` | measured |
| P-opencode-rootResolution | P4 | `opencode/lib/amadeus-opencode-vocab.ts:20-26`(worktree>directory) | measured |
| P-claude-userOps | P5 | component-methods.md C1 verb 表:6-20; harnessDir=`.claude`(`claude/manifest.ts:43`) | measured |
| P-codex-userOps | P5 | component-methods.md C1 verb 表:6-20; harnessDir=`.codex`(`codex/manifest.ts:24`) | measured |
| P-cursor-userOps | P5 | component-methods.md C1 verb 表:6-20; harnessDir=`.cursor`(`cursor/manifest.ts:30`) | measured |
| P-kimi-userOps | P5 | component-methods.md C1 verb 表:6-20; harnessDir=`.kimi-code`(`kimi/manifest.ts:35`) | measured |
| P-kiro-userOps | P5 | component-methods.md C1 verb 表:6-20; `projections.ts:105`(selfRoot null → `--project-root` 床) | measured |
| P-kiro-ide-userOps | P5 | component-methods.md C1 verb 表:6-20; `projections.ts:111`(selfRoot null → 同床) | measured |
| P-opencode-userOps | P5 | component-methods.md C1 verb 表:6-20; harnessDir=`.opencode`(`opencode/manifest.ts:35`) | measured |
| P-claude-degradeContract | P6 | business-logic-model.md:12; C1 doctor verb; marketplace deferred(P-claude-distribution) → `[advisory]` 行 | measured(doctor 行は確定条件付き) |
| P-codex-degradeContract | P6 | business-logic-model.md:12; C1 doctor verb; SessionStart 配線(P-codex-composeTrigger) → `[degraded]`/`[advisory]` 行 | measured |
| P-cursor-degradeContract | P6 | business-logic-model.md:12; C1 doctor verb; sessionStart 配線(P-cursor-composeTrigger) | measured |
| P-kimi-degradeContract | P6 | business-logic-model.md:12; C1 doctor verb; SessionStart 配線(P-kimi-composeTrigger) | measured |
| P-kiro-degradeContract | P6 | business-logic-model.md:12; C1 doctor verb; `projections.ts:105` + agentSpawn 配線(P-kiro-composeTrigger) | measured |
| P-kiro-ide-degradeContract | P6 | business-logic-model.md:12; C1 doctor verb; promptSubmit 語彙差(P-kiro-ide-composeTrigger) → `[advisory]` 行 | measured(確定条件付き) |
| P-opencode-degradeContract | P6 | business-logic-model.md:12; C1 doctor verb; session-start 未配線(P-opencode-composeTrigger) → `[degraded]` 行 | measured(手動床が唯一の契約) |

### deferred 面の確定条件(1 行ずつ — BR-U1-2)

- **claude / distribution(marketplace)**: 実装時に Claude Code の `/plugin` marketplace 導入コマンドを host CLI で live 実測し、install 後配置が compose 入口から到達するかを確認する。
- **kiro-ide / composeTrigger(promptSubmit 語彙差)**: 実装時に「初回 promptSubmit までに `compose --if-stale` が走ってよい(セッション起動を阻害しない)」を Bolt 6 で確認する。
- **opencode / composeTrigger(session-start 未配線)**: 実装時に opencode plugin API の session lifecycle event の有無を live/上流 doc で実測し、なければ `chat.message` + `--if-stale` を per-message 冪等トリガとして採用可否を Bolt 6 で判定する。

---

## (e) 結論: Bolt 3 / Bolt 6 の確定集合（機械可読 — BR-U1-7）

```yaml
# harness-capability-matrix conclusion — machine-readable for downstream Bolts
# measured at HEAD=7833768fb6bca7de750d39bb800dccc0e0cc46d0
measurement_ref: 7833768fb6bca7de750d39bb800dccc0e0cc46d0

class_assignment:
  native-manifest: [claude]
  folder-drop-auto: [codex, cursor, kimi, kiro, kiro-ide]
  manual-only: [opencode]

# Bolt 3 — 投影対象面（host projection targets, ADR-5 / C3）
# 全 7 harness が PACKAGE_HARNESSES（plugin-projection.ts:46-54）。
# host 投影先 = dist/<harness>/<harnessDir>/plugins/<name>/、neutral = dist/plugins/<name>/。
bolt3_projection_targets:
  neutral_bundle: "dist/plugins/<name>/"        # harness-neutral（既存: dist/plugins/formal-model-check/）
  host_projections:                              # dist/<harness>/<harnessDir>/plugins/<name>/
    - { harness: claude,   harnessDir: ".claude",     self_install: true,  install_artifacts: [plugin_content, marketplace_metadata, hooks_snippet, INSTALL_doc] }
    - { harness: codex,    harnessDir: ".codex",      self_install: true,  install_artifacts: [plugin_content, hooks_snippet, trust_hash_recipe, INSTALL_doc] }
    - { harness: cursor,   harnessDir: ".cursor",     self_install: true,  install_artifacts: [plugin_content, hooks_snippet, INSTALL_doc] }
    - { harness: kimi,     harnessDir: ".kimi-code",  self_install: true,  install_artifacts: [plugin_content, hooks_snippet_toml, INSTALL_doc] }
    - { harness: kiro,     harnessDir: ".kiro",       self_install: false, install_artifacts: [plugin_content, agents_hook_entry, INSTALL_doc] }
    - { harness: kiro-ide, harnessDir: ".kiro",       self_install: false, install_artifacts: [plugin_content, kiro_hook_file, INSTALL_doc] }
    - { harness: opencode, harnessDir: ".opencode",   self_install: true,  install_artifacts: [plugin_content, INSTALL_doc] }   # manual-only: no auto hook snippet

# Bolt 6 — フック配線面（auto-compose session hook wiring, C4）
# compose 呼出: bun <harnessDir>/tools/amadeus-plugin.ts compose --if-stale
bolt6_hook_wiring:
  wired:                                         # session-start 相当が measured — auto-compose 配線対象
    - { harness: claude,   event: "SessionStart",  site: "settings.json.example:34", vocab: SessionStart }
    - { harness: codex,    event: "SessionStart",  site: "codex/emit.ts:31",          vocab: SessionStart }
    - { harness: cursor,   event: "sessionStart",  site: "cursor/emit.ts:63",         vocab: sessionStart }
    - { harness: kimi,     event: "SessionStart",  site: "kimi/hooks/amadeus-hooks.snippet.toml:20", vocab: SessionStart }
    - { harness: kiro,     event: "agentSpawn",    site: "kiro/agents/amadeus.json:54", vocab: agentSpawn }
    - { harness: kiro-ide, event: "promptSubmit",  site: "kiro-ide/hooks/amadeus-session-start.kiro.hook", vocab: promptSubmit, note: "not true session-start; idempotent --if-stale required" }
  deferred:                                       # session-start seam 未配線 — Bolt 6 で確定条件を判定
    - { harness: opencode, current_seam: "chat.message", site: "opencode/plugin/amadeus-opencode-plugin.ts:36", condition: "probe opencode plugin API for a session lifecycle event; else adopt chat.message + --if-stale as per-message idempotent trigger" }
  manual_floor_all: "bun <harnessDir>/tools/amadeus-plugin.ts compose"   # 全 7 harness 共通（C1）
```

## (f) 測定 ref（再掲）

- HEAD SHA: `7833768fb6bca7de750d39bb800dccc0e0cc46d0`（`git rev-parse HEAD`）
