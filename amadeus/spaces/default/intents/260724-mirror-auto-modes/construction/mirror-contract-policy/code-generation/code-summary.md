# Code Summary — mirror-contract-policy

> 上流入力（consumes 全数）: `functional-design/business-logic-model.md`、`functional-design/business-rules.md`、`functional-design/domain-entities.md`、`nfr-design/performance-design.md`、`nfr-design/security-design.md`、`units-generation/unit-of-work.md`、`requirements-analysis/requirements.md`

## 実装概要

walking-skeleton Bolt1 の基盤ユニット。auto-mirror の三モード契約（C0 型 / C1 config resolver / C2 policy）を `packages/framework/core/tools/` の TypeScript / ESM / Bun 構成へ実装した。

### C0 `amadeus-mirror-types.ts`（新規・type-only leaf）

- `MirrorMode = "off" | "prompt" | "auto"`、`MirrorOperation = "create" | "sync" | "close"`、`MirrorBoundary`（5 variant, 全て `instance` 保持）、`MirrorEventIdentity`、`MirrorCreateIdentity`、receipt / provenance / warning / snapshot、`MirrorDecision`、`MirrorGitHubGateway` interface、`MirrorMutationPermit`（非 export brand）ほか `component-methods.md` C0 の全 DTO。
- runtime import 0（filesystem / process / GitHub / C1 / C2 を import しない type-only leaf、実測確認）。

### C1 `amadeus-mirror-config.ts`（置換）

- `resolveMirrorConfig(projectDir: string, explicitIntentDir?: string): MirrorConfigOutcome`
- `readMirrorConfigLayers(projectDir, explicitIntentDir?): MirrorConfigReadOutcome`（唯一の FS 所有者・bounded read / realpath containment reader）
- `parseMirrorConfigLayers(layers): MirrorConfigOutcome`（pure。厳密 `off|prompt|auto`、未指定 → `prompt`、Global < Space < Intent 後勝ち、boolean / 未知値 / 非 object root / unknown-key を全件 invalid、read-failure は redacted・workspace-relative path）

### C2 `amadeus-mirror-policy.ts`（新規・pure、import は C0 のみ・実測）

- `mirrorEventIdentity(intentUuid, boundary, operation): MirrorEventIdentity`
- `mirrorEventKey(event): string`（versioned tuple → 標準 JSON → base64url padding なし → `mirror-event:v1:` prefix）
- `decideMirrorAction(input): MirrorDecision`（manual → execute / off 先行 suppress / not-applicable / skipped-for-event / prompt|auto、pending は retryOf 付与）
- `approveMirrorPrompt(...): execute|suppress`（expected × answer × state 完全一致、別 event / operation 注入を拒否）
- `nextCompletionOperation(input): MirrorOperation | null`（create → sync → close、terminal-block で null、corrupted status は fail-fast throw）

## C7 typecheck ブリッジ（暫定・Issue #1454）

E-MAMB1 裁定に従い、後続 unit `mirror-operation-lifecycle` 所有面の `amadeus-orchestrate.ts` へ最小 typecheck ブリッジを申告付きで含めた。

**裁定の出典（agmsg-git-evidence-split 準拠で分離）:**
- **git 検証可能な事実**: 追跡 Issue [#1454](https://github.com/amadeus-dlc/amadeus/issues/1454)（裁定の実装義務=off 抑止の後続実装をエンコード）、本 intent の audit シャード（`audit/j5ik2o-mac-studio-lan-82294a1d0d65.md` に E-MAMB1 での裁定中を記録）。
- **チーム election store ホストの事実**（本ワークツリーからは直接検証不可）: 票内訳「Opt1・4-1・全票 GoA2」・投票者・タイムラインは、election-cli-canonical に従い **leader ワークツリーの election store**（`amadeus/spaces/default/elections/260724-e-mamb1/record.md`）がホストする。leader の record-sync で main へ反映されるまでは本ワークツリーに未着（reviewer が本ワークツリーで発見できなかった Major 2 はこの provenance に起因し、fabrication ではない）。

- 対象: `amadeus-orchestrate.ts` の `emitMirrorBoundaryIfNeeded` 内 **4 箇所のみ**（:136 import 名 / :247 `resolveMirrorConfig(projectDir, intent)` 2 引数呼出 / :249-255 `resolved.issues` 新 shape 整形 / :262 `resolved.config.autoMirror === "auto"` の boolean 化）。`decideMirrorBoundary` 本体（:163-169）と `t265-engine-boundary.test.ts` は不変（git diff で無変更を実測確認）。
- **暫定意味ギャップ**: `autoMirror === "auto"` のみ従来 boolean auto-sync 経路へ写像。`off` / `prompt` はいずれも旧 false と同様 `ask` に落ちる。**真の `off` 完全抑止・`prompt` の event 単位確認は本 unit のスコープ外**であり、後続 `mirror-operation-lifecycle` unit が三モード policy（`decideMirrorAction` / `driveMirrorBoundary`）で正実装する。追跡: **Issue #1454**。
- **forward migration**: 旧 boolean API（`resolve` / `ResolveOutcome` / boolean `MirrorConfig` / `DEFAULT_MIRROR_CONFIG` 等）は撤去済み（grep 実測 0 件）。新旧併存の互換 shim は作らないため Forbidden（互換シム禁止）に**非該当**。
- **越境の限定**: `amadeus-orchestrate.ts` への変更は本 unit の typecheck 維持のための 4 点ブリッジのみ。`mirror-operation-lifecycle` unit 着地時に、このブリッジと `decideMirrorBoundary`（:163-169）を三モード実装へ置換する（Issue #1454。置換 PR のレビュー観点にブリッジ除去の実測確認を含める）。

## 検証（conductor 独立再実測）

| # | コマンド | exit code | 備考 |
|---|---|---|---|
| 1 | `bun run typecheck` | **0** | source / tests 双方 strict |
| 2 | `bun run lint` | **0** | Biome。既存 baseline warning のみ（error 0） |
| 3 | `bun test`（自 unit 3 integration 直接） | **0** | 21 pass / 0 fail |
| 4 | unit t257 / t268 | **0** | t257-mirror-config 29 pass、t268-mirror-policy 30 pass |
| 5 | `bun run dist:check` | **0** | dist 再生成後（下記 dist 同期を参照） |
| 6 | `bun run promote:self:check` | **0** | self-install 同期後 |

### dist / self-install 同期（project.md Mandated 準拠）

`packages/framework/core/tools/` を編集したため、project.md Mandated「ALWAYS core 変更後は `bun scripts/package.ts` で `dist/` を再生成」「ALWAYS `bun run promote:self`」に従い配布物を同期した（決定済み規則の機械執行）。

- 初回 `dist:check` は exit 1（24 problem = 6 harness × [config.ts DIFFERS / policy.ts MISSING / types.ts MISSING / orchestrate.ts DIFFERS] — 全て本 unit の core .ts 変更、無関係 drift 0 件を実測確認）。
- `bun scripts/package.ts`（exit 0）+ `bun run promote:self`（exit 0）で再生成 → `dist:check` / `promote:self:check` ともに exit 0。再生成後の `typecheck` / `lint` も exit 0（回帰なし）。
- 同期対象は mirror core .ts（config/policy/types）+ orchestrate.ts の dist 24 面 + self-install 16 面のみ（他ファイルへの波及 0 件を実測確認）。
- **本同期は本 unit の core .ts 変更の配布反映であり、Bolt 2（`mirror-distribution-docs`）が所有する mirror SKILL / tool / harness manifest / 日英 docs の配布とは別責務（非競合・additive）。**

## baseline red の分離（本 unit と無関係）

`bash tests/run-tests.sh --integration --filter "t257|t268|t269"` は exit 1 になるが、唯一の失敗は **`tests/integration/t257-status-registry-migration.test.ts`**（t257 番号を共有するが別物・本 unit の変更対象外）。

- git 未変更・mirror / orchestrate モジュールへの import 依存 0 件（grep 実測）
- 根本原因: `currentGitSha`（:205-216）が worktree の common-dir loose ref を解決できず throw する環境起因バグ（CI の通常 checkout では非発現）
- **Issue #1455 として起票**（bug / P2 / S3-MAJOR）。本 intent とは因果なし。

## トレーサビリティ

`code-generation-plan.md` の Step 1〜11 を実装。要件 / Acceptance Slice トレースは plan の対応表どおり。E2E 非適用（本 unit は CLI / engine wiring / GitHub mutation / 配布物を所有しない）は後続 owner（`mirror-operation-lifecycle` / `mirror-distribution-docs`）へ trace。

## 変更ファイル

- `packages/framework/core/tools/amadeus-mirror-types.ts`（新規・C0）
- `packages/framework/core/tools/amadeus-mirror-config.ts`（置換・C1）
- `packages/framework/core/tools/amadeus-mirror-policy.ts`（新規・C2）
- `packages/framework/core/tools/amadeus-orchestrate.ts`（C7 4 点ブリッジ）
- `tests/unit/t257-amadeus-mirror-config.test.ts`（三モード化）
- `tests/unit/t268-amadeus-mirror-policy.test.ts`（新規）
- `tests/integration/t257-amadeus-mirror-config.integration.test.ts`（三モード化）
- `tests/integration/t268-amadeus-mirror-contract-policy.integration.test.ts`（新規）
- `tests/integration/t269-amadeus-mirror-contract-policy-performance.integration.test.ts`（新規）

### 生成物（project.md Mandated 準拠で同期）

- `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/.../tools/amadeus-mirror-{config,policy,types}.ts` + `amadeus-orchestrate.ts`（`bun scripts/package.ts` で再生成、24 面）
- self-install ツリー（`.claude` / `.codex` / `.cursor` / `.kiro` / `.opencode` の対応 tools、`bun run promote:self` で同期、16 面）

harness manifest・docs・他 core module は未変更（surgical）。dist / self-install の変更は上記 mirror core .ts + orchestrate.ts の決定的 projection のみ（無関係 drift 0 件を実測確認）。Bolt 2（`mirror-distribution-docs`）が所有する mirror SKILL / tool / manifest / 日英 docs の配布とは別責務。
