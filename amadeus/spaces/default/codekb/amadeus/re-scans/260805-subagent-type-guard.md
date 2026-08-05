# RE スキャン記録 — 260805-subagent-type-guard

## 実行メタデータ

- Date: `2026-08-06`
- Intent: `260805-subagent-type-guard`(scope `self-feature`、Brownfield、単一 repo `amadeus`、Depth: Standard)
- Base commit: `b938898f364160d4b5857e153579b40b5ab18372`
  - 選定根拠: `cid:reverse-engineering:rescan-base-ancestry` に従い、記録済み observed のうち**祖先性を満たし距離最小**を採用。直前記録 `260804-phase-boundary-approval` の observed がそのまま該当する。`git merge-base --is-ancestor b938898f3 7060956c5` は exit 0(実測)。
- Observed commit: `7060956c5617125dd2f4e284957aa180cb306484`
  - `cid:reverse-engineering:c2-observed-mainline-commit` に従い mainline 系譜のコミットを記録。`git merge-base --is-ancestor 7060956c5 origin/main` は exit 0(実測)。
  - 本 worktree の HEAD は `c66a2c987aa1d5940b7ab93762bd000ba5d33b4f`(= observed + record コミット1件)。**患部8ファイルはこの1件で無変更**であるため、本記録の file:line は worktree 実読と observed 断面で同一である。
- 区間規模: `git rev-list --count b938898f3..7060956c5` = **34 commits**、`git diff --shortstat` = `493 files changed, 43826 insertions(+), 217 deletions(-)`。
- Focus: [Issue #2279](https://github.com/amadeus-dlc/amadeus/issues/2279)(mirror [#2288](https://github.com/amadeus-dlc/amadeus/issues/2288))— subagent イベントの `Agent Type` に型規律の照合が一切なく、実効 model が記録されない。患部は subagent 観測パイプラインの4層(hook seam → `normalizeAgentType` / `subagentStartFields` → audit registry → 集計 seam)。
- Scan mode: **xrev scan mode**(`cid:reverse-engineering:c1-xrev-scan-mode`、単発 Issue への拡張 `c1-xrev-single-issue`)。クロスレビュー2名の verdict を Developer scan の一次入力とし、Architect が患部座標を observed 断面の verbatim 実読でスポット再実測した(11 seam、**引用不一致4件を検出・訂正** — 下記「Developer scan との差分」)。
- **行番号再解決の免除: APPLIES(適用される)** — 両 verdict の `<!-- target-sha: 7060956c5617125dd2f4e284957aa180cb306484 -->`(`gh issue view 2279 --json comments` から抽出、2件とも同一)が observed と**完全一致**するため、`E-OBB5-RES13` の免除条件「当該引用が observed と一致する SHA で検証済みであること」を満たす。**免除の根拠は patient files の no-touch ではない**(同 norm は「区間 touch の有無のみを根拠とした一般免除へ拡大しない」と明示している)— Developer scan §0 は no-touch を免除根拠として記述しており、これは根拠の取り違えである(訂正済み。結論の APPLIES 自体は変わらない)。
- Verification: `tests/unit/t-subagent-purpose.test.ts` / `t-subagent-lifetime.test.ts` / `t211-log-subagent-complete-gate.test.ts` / `tests/integration/t-log-subagent-start.integration.test.ts` を Architect 段で再実行 — **43 pass / 0 fail / 118 expect() calls / 4 files / 970ms**。coverage 実行は `cid:code-generation:c1-coverage-single-owner` に従い一切行っていない。
- Updated artifacts: 共有9成果物の現在断面を更新し、直前の `260804-phase-boundary-approval` 節を本文保持のまま履歴へ降格(`cid:reverse-engineering:c3-relabel`)。履歴節の file:line は当時の observed 時点を指すため変更していない(`cid:requirements-analysis:historical-section-cite-check-at-observed`)。

## 0. 区間デルタ — 患部は無変更

患部8ファイルへの `git diff --stat b938898f3..7060956c5` は**空出力**(= 全件無変更):

`packages/framework/core/tools/amadeus-lib.ts` / `core/hooks/amadeus-log-subagent.ts` / `core/hooks/amadeus-log-subagent-start.ts` / `core/otel/resource-suppliers.ts` / `core/hooks/amadeus-statusline.ts` / `core/otel/subagent-lifetime.ts` / `harness/codex/hooks/amadeus-codex-adapter.ts` / `tests/fixtures/codex-hook-payloads/payloads.json` / `core/tools/amadeus-graph.ts`(9パスを1コマンドで確認、Architect 実測)

区間内で変わった隣接面は `core/otel/event-registry.ts` のみで、差分は `EXPECTED_CANONICAL_COUNT` 88→90 と新規2イベント(`INTENT_COMPLETION_TRANSACTION_COMMITTED` / `AUTO_DECISION_REVIEWED`)の追加。`SUBAGENT_STARTED` / `SUBAGENT_COMPLETED` の定義そのものは無変更。

外部依存: `git diff --stat b938898f3..7060956c5 -- package.json bun.lock packages/setup/package.json` は**空出力**。外部依存の追加・更新・削除は区間内でゼロ。

## 1. C10 裁定 — model 供給はハーネス別に異なる

> `cid:reverse-engineering:c1-xrev-mechanism-resolution` により、クロスレビュー2名が機序で食い違った場合の裁定先は本 scan 段である。

### 到達可能な分岐(reviewer-2 の仮説を支持)

**Codex では `model` が hook payload に供給されている。** `tests/fixtures/codex-hook-payloads/payloads.json` の `subagentStop` が `"model":"openai.gpt-5.5"` を持つ(fixture provenance は `tests/unit/t149-codex-hook-adapter.test.ts:6-8` に「field-verbatim captures off Codex CLI 0.137.0 — the spike corpus at tmp/codex-dist/payload-corpus/」と記載 = live 捕捉由来だが 0.137.0 時点)。`model` は `sessionStart` / `stop` / `postToolUse_*` / `preCompact` / `postCompact` / `subagentStop` の全 payload に存在する(10 パス)。

アダプタ側 `packages/framework/harness/codex/hooks/amadeus-codex-adapter.ts` の `model` grep ヒットは **0 件**(Architect 実測)。`:349` `case "log-subagent": {` → `:352` `runCore("amadeus-log-subagent.ts", rawInput);` が rawInput を verbatim で渡す。したがって **model は core hook の stdin まで到達しており、core hook が読んでいないだけ**(供給あり・消費なし)。

### 到達不能な分岐(reviewer-1 の「供給経路ゼロ」は一般命題として成立しない)

**Claude Code では `model` が両 seam に不在。** live 実測(2026-08-05、Claude Code `2.1.222`、隔離 scratch プロジェクト + `claude -p --permission-mode acceptEdits --model sonnet`、exit 0):

| seam | model パス | 備考 |
| --- | --- | --- |
| `PreToolUse`(dispatch) | `[]`(皆無) | `effort` は常在するが model ではない。CLI の `--model sonnet` は payload に反映されない |
| `SubagentStop`(completion) | `[]`(皆無) | 同上 |
| `PreToolUse`(明示 model 指定時) | `tool_input.model = "haiku"` | Agent ツールへ `model:` を渡した対照 run のみ出現 |

→ Claude Code の `model` 供給は「Agent ツールに `model` を明示指定したときの `tool_input.model` だけ」。セッションの実効 model はどちらの seam にも載らない。

### 裁定

**C10 の不一致は「ハーネス横断で一律か否か」の粒度差であり、両者の観測はそれぞれの対象ハーネスについて正しい。** 設計は「ハーネス別に供給有無が異なる」前提で組む必要がある(`cid:application-design:external-seam-vocab-measurement` の面分割)。

未実測として明示すべき残余(HYPOTHESIS / UNMEASURED):
- Codex live(現行 CLI `0.146.0`。fixture は 0.137.0 由来)
- Cursor / OpenCode / Kimi / Kiro / Kiro-IDE / Pi の payload の model 有無
- Claude Code で `--model` を省略した場合(対照 run は既定モデルのレート上限で exit 1、未測定。ただし `--model` 明示でも載らない実測があるため載る可能性は低い)

### 型面の非破壊性

`ClaudeCodeHookInput`(`packages/framework/core/tools/amadeus-lib.ts:4687-4707`)に `model?: string` の宣言は無いが、`:4706` に `[key: string]: unknown;` のインデックスシグネチャがあるため型追加は非破壊(Architect 実読で確認)。

## 2. 新規発見 — latent 欠陥2件

### D-1(S2 相当、**新規**): Claude Code の `tool_name` は `"Agent"` で `SUBAGENT_DISPATCH_TOOL` の照合が構造的に不一致

| 座標(observed `7060956c5`) | verbatim |
| --- | --- |
| `amadeus-lib.ts:4102` | `export const SUBAGENT_DISPATCH_TOOL = "Task";` |
| `amadeus-lib.ts:4129` | `if (payload.tool_name !== undefined && payload.tool_name !== SUBAGENT_DISPATCH_TOOL) return null;` |

live payload の `tool_name` は `"Agent"`(§1 の実測)。in-process seam 実測(live payload の**キー形状**を再構成、本文は合成プレースホルダ):

```
tool_name=Agent (live shape)   -> null
tool_name=Task  (assumed shape) -> {"Agent Type":"Explore","Purpose":"p"}
```

→ **Claude Code 2.1.222 では `subagentStartFields` が常に `null` を返し、`SUBAGENT_STARTED` は永久に emit されない。**

matcher は無関係と確定(負対照 run): settings の matcher を `^Agent$` に変えても同様に発火し、payload の `tool_name` は `"Agent"`。`^Task$` / `^Agent$` の**どちらでも matcher は通り**、落ちるのはフック内部の文字列比較だけである。

`:4133-4137` のコメントは `TaskUpdate` / `TaskCreate` の誤検知を防ぐことが照合の目的だと明示しており、この防波堤は修正形の選択に影響する(§6 Q2)。

### D-2(S3、**既知 — 訂正**): live `.claude/settings.json` に `PreToolUse` が存在しない

- `.claude/settings.json`(tracked)の `.hooks` キー集合は `PostToolUse / PreCompact / SessionEnd / SessionStart / Stop / SubagentStop / UserPromptSubmit`(`jq -r '.hooks | keys'` 実測)→ **`PreToolUse` 不在**。
- `^Task$` → `amadeus-log-subagent-start.ts` の配線は `.claude/settings.json.example` にのみ存在(`jq -c '.hooks.PreToolUse'` = `[{"matcher":"^Task$","hooks":[{"type":"command","command":"bun \"${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/amadeus-log-subagent-start.ts\""}]}]`)。
- CLAUDE.md の指示は「settings.json が既に無い場合にのみ example をコピー」であるため、この repo は example の `PreToolUse` を取り込む契機が構造的に無い。

**Developer scan の「Issue 起票候補」判定を訂正する**: D-2 は既に [#2297](https://github.com/amadeus-dlc/amadeus/issues/2297)(`bug` / `P2` / `S3-MAJOR`、OPEN)として起票済みであり、本 intent の scope-document で Out(行き先確定)に置かれている。新規発見は **D-1 のみ**である。

### D-1 と D-2 の関係 — #2297 の修正だけでは症状が閉じない

両者は**独立**であり、`SUBAGENT_STARTED` が Claude Code で発火するには**両方**の修正が必要である。#2297 は配線欠落のみを対象とするため、**#2297 を修正しても D-1 が残り start seam は依然 0 件のままになる**。この含意は #2297 の受入基準に反映されていない(`cid:code-generation:ruling-premise-closure-verification` の多層欠陥面 — ガードの背後に第2層の欠陥が隠れている典型)。

### 構造的裏取り(audit 実測)

| 指標 | 値 | 測定時刻 |
| --- | --- | --- |
| `SUBAGENT_STARTED` | **60** | Architect 再実測 2026-08-06 |
| `SUBAGENT_COMPLETED` | **974** | 同上(Developer scan 時点は 973) |

取得コマンド: `cat amadeus/spaces/default/intents/*/audit/*.jsonl | jq -r 'select(.attributes.Event=="SUBAGENT_STARTED")|"S"' | wc -l`(COMPLETED も同型)。

`SUBAGENT_STARTED` を含むシャードは**1 intent のみ**(`260801-tla-multi-model`)。その 60 件の `Agent Type` は `coder` 33 / `explore` 27 のみ(Architect 再実測、`uniq -c` 出力からの転記)。`log-subagent-start` の配線を持つのは kimi(`packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts:625-626` `case "role-start":` → `return [{ hookPath: "amadeus-log-subagent-start.ts", stdin, translate: "none" }];`)と Claude Code の `settings.json.example` だけで、codex アダプタには配線が無い(grep 0 件)。

→ **Claude Code 由来の `SUBAGENT_STARTED` は全 132 intent で 0 件。**

## 3. R-3 — 「実効 model」解決順の各段の取得可否

解決順 = 明示指定 > agent 定義の model ピン > セッション継承。

| 段 | 取得元 | 実在 | 座標 / 実測 |
| --- | --- | --- | --- |
| ① 明示指定 | `PreToolUse` の `tool_input.model` | **可**(明示時のみ) | live 対照 run: `tool_input.model = "haiku"`。非明示 run では key 自体が不在 |
| ② persona ピン | `.claude/agents/*.md` frontmatter `model:` | **可**(静的読取) | 14 ファイル全数にピン有り。`opus` 9 / `sonnet` 5。ピン無しは 0(Architect 再実測: `grep -H '^model:' .claude/agents/*.md`、`ls .claude/agents/*.md | wc -l` = 14) |
| ③ セッション継承 | statusline payload の `input.model?.id` | **限定的に可(現在は休眠)** | `core/hooks/amadeus-statusline.ts:232` `const modelId = input.model?.id ?? "";` |

### ③ の到達経路とその破断点

`amadeus-statusline.ts:230-256` の `recordRuntimeAttrs(projectDir, input)` が `{model, harness, updatedAt}` を `<telemetryDir>/runtime-attrs.json` へ書く(`:237` path 組立、`:249-252` 書込)。ただし3点で休眠している(いずれも Architect 実測):

1. `:234` `if (!observabilityEnabled(projectDir)) return;` — observability 無効時は書かれない。**本 repo の `amadeus/config.json` の `observability` は `null`**(`jq '.observability'`)。
2. `find . -name 'runtime-attrs.json'` → **0 件**(ディスク上に実体なし)。
3. `grep -rn 'runtime-attrs' packages/` は **2 hit** で、いずれも `amadeus-statusline.ts` の書き手側。**読み手 0 件**の write-only 面である。

→ ③ は「機構は在るが、現在は無効かつ読み手不在」。加えて statusline はメインセッションのプロセスで動き、subagent hook とは別プロセス・別 payload であるため、subagent の hook プロセスへ直接届く経路は無い。

**設計含意:** ③ を実効 model として使うには (a) observability 有効化を要件化するか、(b) 別の常時書込経路(`SessionStart` 等)を新設するかの裁定が必要。①②のみで組む案(明示 > persona ピン > `"unknown"`)は追加機構ゼロで成立する。

### `gen_ai.request.model` — 宣言済み・本番供給ゼロの休眠キー

- 宣言: `core/otel/resource-suppliers.ts:22-27` の `SUPPLIED_RESOURCE_KEYS`(`gen_ai.request.model` は `:24`)。
- `supplyResourceAttribute(` の**本番呼出は 1 箇所のみ**(`grep -rn 'supplyResourceAttribute(' packages/ scripts/` からテストを除外して実測): `core/hooks/amadeus-session-start.ts:148` `supplyResourceAttribute("session.id", sessionId);` — 引数は `"session.id"`。
- `gen_ai.request.model` を実引数に取る本番呼出は **0 件**(テストのみ)。
- 別経路として `core/otel/metrics-instruments.ts:102` `"gen_ai.request.model": usage.model,` がメトリクス属性に載せる(resource ではなく span/metric 属性)。

→ **`gen_ai.request.model` は resource 面では宣言済み・本番供給ゼロの休眠キー。** CAP-2 の実装先の第一候補。

## 4. R-2 再計測 / R-4 — 型語彙の全数

### 実測タリー(`SUBAGENT_COMPLETED`、`Agent Type` 別)

測定 ref: worktree `c66a2c987` の working tree(tracked 216 シャード / 132 intent + 本 intent の untracked シャード)、Architect 再実測 2026-08-06。

| 分類 | distinct | イベント数 | 判定 |
| --- | --- | --- | --- |
| `amadeus-*-agent` persona | 8 | 416 | 許可集合内(定義済み persona) |
| ハーネス組込型 | 8 | 297 | 許可集合内(組込) |
| その場限りの `name:` 値 | **184** | **261** | **許可集合外** |
| 合計 | **200** | **974** | — |

内訳の和は `416 + 297 + 261 = 974` で総数と一致(機械照合済み)。

### 観測された組込型語彙(8)

| 値 | 件数 | 由来 |
| --- | --- | --- |
| `default` | 136 | Codex(fixture `subagentStop.agent_type = "default"` と一致) |
| `unknown` | 69 | `normalizeAgentType` の fallback(`amadeus-lib.ts:4082-4084`) |
| `coder` | 37 | Codex / kimi native |
| `explore` | 29 | Codex / kimi native(小文字) |
| `worker` | 14 | Codex / kimi native |
| `general-purpose` | 9 | Claude Code 組込 |
| `Explore` | 2 | Claude Code 組込(**大文字** — `explore` と別値) |
| `Plan` | 1 | Claude Code 組込 |

**大小の衝突(`Explore` vs `explore`)は許可集合の照合設計で明示的に扱う必要がある** — ハーネス間で同一概念が別ケーシングで到来する。

### 許可集合外 184 値の実例

`xrev-2279-reviewer-1` / `re-dev-scan` / `subagent-1` / `subagent-2` / `cpg-fd-u1` / `builder-oms-b4` / `reviewer-pr1938` / `obb5-ras13-v1` / `e-stg-s13-subagent-1` …(いずれも Agent ツールの `name:` 相当)

→ **問題の核**: `subagentStartFields` / `normalizeAgentType` が受ける値は「型(`subagent_type`)」であるべきところに、実運用では `name:` が入って記録されている。ただし `subagent_type: "Explore"`(`name:` 指定なし)の live probe では `PreToolUse` の `tool_input.subagent_type` と `SubagentStop` の `agent_type` が両方 `"Explore"` で一致しており、**`name:` 由来の値がどの seam から来るのかは本 scan では未確定(HYPOTHESIS)**。名前付き spawn(`name:` 指定あり)の live probe が未実施 — §6 Q8 として RA へ送る。

### 組込型の正本は repo から observable でない

セッションの system-reminder が列挙する Claude Code 組込型は `claude` / `claude-code-guide` / `Explore` / `general-purpose` / `Plan` / `statusline-setup`(+ プロジェクト定義の `amadeus-*-agent` 14 件)。`docs/` 配下に組込型を列挙した正本は見つからず、**組込型の正本はハーネス側にあり repo からは observable でない**。許可集合の組込部分は手書き台帳になるため、`cid:code-generation:count-comment-sync-on-catalog-change` / count-free 系の設計配慮が要る。

## 5. 患部の現在 file:line(observed `7060956c5`)

| 対象 | 座標 |
| --- | --- |
| `normalizeAgentType` | `packages/framework/core/tools/amadeus-lib.ts:4082-4084` |
| `SUBAGENT_PURPOSE_MAX_LENGTH` | 同 **`:4097`** |
| `SUBAGENT_DISPATCH_TOOL = "Task"` | 同 `:4102` |
| `CONTROL_CHARS` | 同 **`:4107`** |
| `subagentPurposeLine` | 同 **`:4109-4114`** |
| `subagentStartFields` | 同 **`:4128-4139`**(照合行 `:4129`、`TaskUpdate` 防波堤コメント `:4133-4137`) |
| `ClaudeCodeHookInput` | 同 `:4687-4707`(`model` 宣言なし / `[key: string]: unknown` は `:4706`) |
| start hook 本体 | `core/hooks/amadeus-log-subagent-start.ts:61-72`(`:70-72` が literal 再構成 — t385 静的可読性のため) |
| complete hook 本体 | `core/hooks/amadeus-log-subagent.ts:50-52`、`:68-72` |
| registry `SUBAGENT_STARTED` | `core/otel/event-registry.ts:`**`612-623`**(`auditEvent` は `:617`、required `["Agent Type"]` は `:620`、optional `["Agent ID","Purpose"]` は `:621`) |
| registry `SUBAGENT_COMPLETED` | 同 `:624-632`(`auditEvent` は `:626`、required `:629`、optional `["Agent ID","Message"]` は `:630`) |
| `SUPPLIED_RESOURCE_KEYS` | `core/otel/resource-suppliers.ts:22-27`(`gen_ai.request.model` は `:24`) |
| statusline model 読取 | `core/hooks/amadeus-statusline.ts:232` |
| runtime-attrs 書込 | 同 `:230-256`(`:234` guard、`:237` path、`:249-252` write) |
| codex adapter subagent 経路 | `harness/codex/hooks/amadeus-codex-adapter.ts:349-352` |
| kimi role-start 経路 | `harness/kimi/hooks/amadeus-kimi-lib.ts:625-626` |
| audit-format doc | `core/knowledge/amadeus-shared/audit-format.md:154`(Emitter 欄に `(PreToolUse{Task} / SubagentStart)` と旧語彙を記載 — D-1 の同期対象) |

太字は Developer scan からの訂正箇所(§7)。

### `Purpose` / `Message` の非対称は設計意図

START は `Purpose`(dispatch prompt から導出した**ラベル**。`:4109-4114` で escape 正規化 → 初行 → control 除去 → trim → 200 字)、COMPLETE は `Message`(`amadeus-log-subagent.ts:52` `(parsed.last_assistant_message ?? "").slice(0, 200)`)。両者は別フィールド・別意味で、registry も別 optional として登録済み(`:621` / `:630`)。**設計上意図された非対称**であり、統合は要件化されていない。

### 許可集合照合の不在(再確認)

- 実行時 spawn 経路: `subagentStartFields`(`:4128-4139`)/ `normalizeAgentType`(`:4082-4084`)/ 両 hook 本体に**所属検査は 1 行も無い**。`normalizeAgentType` は `raw?.trim() ? raw : "unknown"` の空白判定のみで、非空値は verbatim 返す。
- compile 時のロスタ照合は**別物**: `core/tools/amadeus-graph.ts:2191` `const knownAgents = loadAgents().map((a) => a.slug);` + `:2218` `const validation = validateStageFrontmatter(parsed, { agents: knownAgents });` は、**stage frontmatter の `lead_agent` / `support_agents` を `.claude/agents/*.md` の slug と突き合わせる**(コメント `:2186-2190` 逐語: "Known agent slugs (the `name:` field of each .claude/agents/*.md), passed to validateStageFrontmatter so a stage referencing a lead_agent or support_agent with no matching agent file fails the compile loudly rather than surfacing at runtime as a \"subagent not registered\" Task error.")。**dispatch の `subagent_type` は一切見ない。**

### 既存テストが D-1 の誤前提をピンしている

`grep -rln 'subagent\|SUBAGENT' tests/unit tests/integration` → 51 ファイル。中核4ファイルの実行結果は §実行メタデータの Verification のとおり(43 pass / 0 fail)。

`tests/unit/t-subagent-purpose.test.ts:89`(verbatim):

```
    expect(subagentStartFields({ tool_name: "Task", tool_input: { prompt: "x" } })).toEqual({
```

同 `:96` / `:97` / `:101` も `tool_name: "Task"` を前提に assert している(Architect 実読で全4箇所を確認)。

→ **既存テストが D-1 の誤前提を固定している。** `cid:reverse-engineering:c1-pinned-behavior-ruling` により、これは「バグでない証明」ではなく「**変更に裁定が要る証明**」である — 要件段でテスト契約の明示改訂とセットで裁定すべき。

同ファイル `:82` は `{ hook_event_name: "SubagentStart", agent_type: "explore", prompt: "Look around" }`(tool_name 不在 = kimi 経路)を別ケースとして持っており、tool_name 不在経路は D-1 の影響を受けない。

## 6. CAP-3 — 集計 seam の現状

| 候補 | 現状 | 判定 |
| --- | --- | --- |
| `amadeus-runtime.ts summary` | `runtime-graph.json` に対する集計。`Agent Type` / `SUBAGENT` の grep ヒット **0 件** | audit を読まないため CAP-3 の host に不適 |
| `core/otel/subagent-lifetime.ts` の `composeSubagentLifetimes` | `:112` `export function composeSubagentLifetimes(records: readonly JournalRecord[]): SubagentLifetime[]` が START/COMPLETE を Agent ID 優先 → 型 fallback(LIFO)でペアリング。**本番消費者 0 件**(`grep -rn 'composeSubagentLifetimes' packages/ tests/ scripts/` のヒットは定義元と `tests/unit/t-subagent-lifetime.test.ts` のみ、Architect 実測) | **CAP-3 の第一候補。** audit journal を入力に取る唯一の subagent 集計面であり、休眠 seam の配線で足りる |
| `core/otel/metrics-instruments.ts:102` | `"gen_ai.request.model": usage.model` をメトリクス属性に載せる | model 別集計のメトリクス面。audit 由来の型別集計とは別軸 |
| `amadeus-norm-metrics.ts` / `amadeus-loop-monitor-runtime.ts` | audit を読む CLI の既習様式 | reuse inventory の参照先(実装様式の先例) |

**含意:** CAP-3 は新規 CLI を作らず `composeSubagentLifetimes` を配線して型別・model 別タリーを出す形で組めるが、その入力である `SUBAGENT_STARTED` が Claude Code で 0 件(D-1 / D-2)である限り、lifetime ベースの集計は Claude Code 上で構造的に空になる。→ **CAP-3 の前提として D-1 / D-2 の修正が必要か、COMPLETED 単独集計に倒すかの裁定が要る**(§7 Q9)。

## 7. Requirements Analysis へ送る裁定候補

| # | 論点 | 選択肢 | 本 scan が確定した事実 |
| --- | --- | --- | --- |
| Q1 | D-1(`tool_name: "Agent"`)を本 intent で直すか、別 Issue に切るか | (a) 本 intent に取り込む(CAP-1 / CAP-2 の start 側の前提)/ (b) 別 Issue・本 intent は COMPLETED 側のみ | D-1 は live 確定。既存テスト `t-subagent-purpose.test.ts:89` 他4箇所が `"Task"` をピン。`cid:reverse-engineering:c1-pinned-behavior-ruling` により要件段の裁定事項。#2297(D-2)の修正だけでは症状が閉じない |
| Q2 | D-1 の修正形 | (a) `SUBAGENT_DISPATCH_TOOL` を集合(`{"Task","Agent"}`)化 / (b) `"Agent"` へ置換 / (c) tool_name 照合を廃し `tool_input.subagent_type` の実在で判定 | matcher は `^Task$` / `^Agent$` どちらでも発火(負対照 run)。落ちるのは内部の文字列比較のみ。(c) は `TaskUpdate` 誤検知の防波堤(`:4133-4137` コメント)を失う。(b) は kimi 経路(tool_name 不在)には無害だが、`"Task"` を送るハーネスがあれば退行する |
| Q3 | D-2 の扱い | (a) #2297 の受入基準へ「D-1 との二層性」を追記して分離維持 / (b) 本 intent へ引き上げ | scope-document は D-2 を Out(#2297 行き)と裁定済み。ただし #2297 単独では start seam が 0 件のまま — 受入基準に閉包が書かれていない |
| Q4 | 実効 model の解決範囲 | (a) ①明示 + ②persona ピン + `"unknown"`(追加機構ゼロ)/ (b) ③セッション継承も含める(observability 有効化 or 新規常時書込経路が前提) | ③ は `runtime-attrs.json` 経由だが observability 未設定・実体 0 件・読み手 0 件。subagent hook は別プロセスで直接到達不能 |
| Q5 | ハーネス別の model 供給差の扱い | (a) 供給があるハーネス(Codex)は payload の `model` を優先し、無いハーネス(Claude Code)は ①② から導出 / (b) ハーネス横断で ①② のみ | Codex fixture に `model: "openai.gpt-5.5"` 実在(0.137.0 捕捉)、アダプタは verbatim pipe。Claude Code は両 seam に不在(live `2.1.222`)。CON-3(parity で fail-closed に落ちない)が制約 |
| Q6 | model 属性の記録先 | (a) audit の `Agent Type` と並ぶ新規 optional 属性 / (b) `gen_ai.request.model` resource key / (c) 両方 | registry は `SUBAGENT_*` の optional 集合を持つ(`:621` / `:630`)。`gen_ai.request.model` は宣言済み・本番供給 0 の休眠キー |
| Q7 | 許可集合の組込型部分の正本 | (a) 手書き台帳(count-free)/ (b) ハーネス別 registry から導出 | Claude Code 組込型を列挙した repo 内正本は不在。`Explore` vs `explore` のケーシング衝突を扱う必要あり |
| Q8 | `name:` 値が `Agent Type` に入る機序 | **未確定(HYPOTHESIS)** | live probe(`subagent_type: Explore`、`name:` 指定なし)では両 seam が `"Explore"` で一致。`name:` 指定ありの probe が未実施 — RA 段で live 追試を要求するか、CAP-1 の照合対象から外すかの裁定が必要 |
| Q9 | CAP-3 の入力 | (a) lifetime(START × COMPLETE ペア)/ (b) COMPLETED 単独 | `composeSubagentLifetimes` は消費者 0 の休眠 seam。(a) は D-1 / D-2 修正が前提。実測 STARTED 60 / COMPLETED 974 |

## 8. 技術的負債シグナル

1. **D-1: dispatch tool 名の語彙 drift(S2 相当)** — `SUBAGENT_DISPATCH_TOOL = "Task"` が Claude Code `2.1.222` の実 payload(`"Agent"`)と不一致で、start seam が構造的に沈黙する。既存テスト4箇所と `audit-format.md:154` の doc が誤前提を固定しているため、修正には契約改訂が要る。
2. **観測の非対称(S2 相当)** — `SUBAGENT_STARTED` 60 対 `SUBAGENT_COMPLETED` 974。START は 1 intent・2型のみに存在し、Claude Code 由来は全 132 intent で 0 件。lifetime 集計面(`composeSubagentLifetimes`)は入力が構造的に欠けている。
3. **型規律の不在(本 Issue の主題、S3 相当)** — `Agent Type` の distinct 200 のうち 184(261 イベント)が許可集合外の `name:` 値。`normalizeAgentType` は空白判定のみで所属検査が 1 行も無く、compile 時のロスタ照合(`amadeus-graph.ts:2191`/`:2218`)は dispatch を見ない。
4. **休眠面の三重(S3 相当)** — `gen_ai.request.model`(resource 宣言済み・本番供給 0)/ `composeSubagentLifetimes`(本番消費者 0)/ `runtime-attrs.json`(書き手のみ・読み手 0・observability 無効)。いずれも「宣言と本番結線の非対称」クラスで、`cid:requirements-analysis:symmetric-pair-review` の観点に該当する。
5. **ケーシング衝突(S4 相当)** — `Explore`(Claude Code)と `explore`(Codex / kimi)が別値として audit に共存する。許可集合の照合設計で正規化方針を決めないと、同一概念が二重計上される。

## 9. Developer scan との差分(Architect が実読で訂正した点)

スポット再実測 11 seam のうち、座標の不一致 **4件**と根拠・判定の訂正 **3件**を検出した。

### 座標の訂正(いずれも off-by-one / 範囲端)

| 項目 | scan の記述 | observed 実測 |
| --- | --- | --- |
| `SUBAGENT_PURPOSE_MAX_LENGTH` | `:4098` | **`:4097`** |
| `CONTROL_CHARS` | `:4106` | **`:4107`** |
| `subagentPurposeLine` | `:4108-4113` | **`:4109-4114`** |
| `subagentStartFields` | `:4128-4140` | **`:4128-4139`**(`:4139` が閉じ `}`、`:4140` は空行) |
| registry `SUBAGENT_STARTED` | `:616-623` | **`:612-623`**(オブジェクトリテラルは `:612` の `{` で開く。`:616` は `name:` 行) |

一致を確認した座標(訂正不要): `normalizeAgentType:4082-4084` / `SUBAGENT_DISPATCH_TOOL:4102` / 照合行 `:4129` / `ClaudeCodeHookInput:4687-4707` と `[key: string]: unknown` の `:4706` / `SUBAGENT_COMPLETED:624-632`(`:626` / `:630`)/ `SUPPLIED_RESOURCE_KEYS:22-27` と `gen_ai.request.model:24` / `statusline:232`・`:234`・`:237` / `log-subagent-start:61-72` と `:70-72` / `log-subagent:50-52`・`:68-72` / `codex adapter:349-352` と model grep 0 件 / `kimi:625-626` / `composeSubagentLifetimes:112` と本番消費者 0 件 / `t-subagent-purpose.test.ts:82`・`:89`・`:96-101` / `audit-format.md:154` / `amadeus-graph.ts:2186-2191`・`:2218`。

### 根拠・判定の訂正

| 項目 | scan の記述 | 訂正 |
| --- | --- | --- |
| 行番号再解決の免除根拠 | 「患部が touch されていないこと」 | **verdict の target-sha が observed と完全一致すること**。`E-OBB5-RES13` は「区間 touch の有無のみを根拠とした一般免除へ拡大しない」と明示している。結論(APPLIES)は同じだが根拠が誤り |
| D-2 の位置づけ | 「Issue 起票候補(新規発見)」 | **既知**。[#2297](https://github.com/amadeus-dlc/amadeus/issues/2297)(`bug` / `P2` / `S3-MAJOR`、OPEN)として起票済みで、scope-document が Out に置いている。新規発見は D-1 のみ。加えて **#2297 単独では症状が閉じない**(D-1 が残る)という含意を追加した |
| 組込型のイベント数 | 297(ただし内訳の和は 296 で自己不一致) | **297**(再実測。内訳は `unknown` が **69** で和が 297 に一致。scan の `unknown` 68 が測定時点差による過少) |
| `SUBAGENT_COMPLETED` 総数 | 973 | **974**(Architect 再実測 2026-08-06。audit は本セッション中も追記され続けるため**測定時刻依存の移動値**である。差分 +1 は `unknown` 1件の増。許可集合外イベント数は 260 → **261**) |

**含意:** 座標の4件はいずれも1行以内のずれで結論を変えないが、免除根拠の訂正と D-2 の既知判定は**下流の裁定を変える** — 免除は norm の条件に接地して初めて有効であり、D-2 は新規起票ではなく #2297 の受入基準の補強(D-1 との二層性の明記)が正しい行き先である。

## 10. 次の検証者向け手法メモ

1. **audit の event 照合は必ず `.attributes.Event` の jq 等値比較で行う。** `grep -c '"SUBAGENT_STARTED"'` は本 intent の `WORKFLOW_STARTED` の `Request` 本文に語が含まれるため偽陽性を出す(COMPLETED では 6825 対 真値 974 の約7倍過大を実測)。
2. **`SUBAGENT_COMPLETED` の総数は移動値である。** 本セッションの subagent 実行がそのまま audit へ追記されるため、計数には必ず測定時刻を添える(`cid:reverse-engineering:measurement-ref-in-artifacts` の時刻面)。
3. **hook payload の live 実測は隔離 scratch プロジェクト + `claude -p --permission-mode acceptEdits` で成立する。** `permissions.allow` は trust dialog 未承認だと無視される警告が出るが、`--permission-mode acceptEdits` があれば Task dispatch は通る。既定モデルはレート上限に当たりうるため `--model sonnet` を明示すると安定する。
4. **payload dump は CON-1(CXR-33)準拠で `jq keys` + model パスの値のみに絞る。** `jq -c '[paths(scalars) as $p | select(any($p[]; type=="string" and test("model";"i"))) | {path,value}]'` が model 供給の有無を本文非保存で確定できる。
5. **matcher と payload の tool 名は別語彙。** matcher は alias 側(`Task`)でも canonical 側(`Agent`)でも発火するため、matcher の実験だけでは payload の `tool_name` を推定できない。dump 必須。
6. **`bun` で core モジュールを直 import する in-process seam は成立する。** `packages/framework/core/tools/` の **CLI** は canonical 直実行が禁止(`cid:code-generation:no-canonical-direct-execution`)だが、純関数の import は別面で問題ない。
7. **休眠面の判定は「宣言」と「本番呼出」を別 grep で数える。** `SUPPLIED_RESOURCE_KEYS` の宣言と `supplyResourceAttribute(` の実引数を分けて grep すると `gen_ai.request.model` が宣言済み・本番 0 と即断できる。同型に `composeSubagentLifetimes`(定義 + テストのみ)と `runtime-attrs`(書き手のみ)。
8. **免除条項の適用は norm の条件文に接地して書く。** 本 scan では xrev verdict の `target-sha` を `gh issue view 2279 --json comments` から実抽出して observed と照合した。touch の有無は免除条件ではない。
