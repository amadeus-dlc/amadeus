# Code Generation Plan — U4 hook-wiring-remaining

> 上流入力(consumes 全数): functional-design/business-logic-model、functional-design/business-rules、functional-design/domain-entities、nfr-design/logical-components、nfr-design/reliability-design、nfr-design/security-design、nfr-design/performance-design、nfr-design/scalability-design、harness-capability-matrix(U1 BR-U1-7)、units-generation/unit-of-work(U4 行)、requirements(FR-3b)

## スコープ確定(BR-U1-7 の機械可読 Bolt6 結論からの転記のみ)

harness-capability-matrix.md (e) `bolt6_hook_wiring` を正とする(実装での面の追加/除外判断なし):

- **wired**(session-start 相当 measured — 自動 compose 配線対象): claude(U2 で配線済み)、codex、cursor、kimi、kiro、kiro-ide
- **deferred / degraded**(session-start seam 未配線): opencode
- **manual_floor_all**: 全 7 ハーネス共通 `bun <harnessDir>/tools/amadeus-plugin.ts compose`

U4 が新規配線する対応面 = codex / cursor / kimi / kiro / kiro-ide の 5 面。opencode は degrade(manual-only、決定済みクラス — matrix (b)/BR-U1-6 fail-closed)。

## 既習様式の踏襲(U2 claude 面)

U2 は core フック `packages/framework/core/hooks/amadeus-plugin-compose.ts`(compose 入口を呼ぶだけ・合成ロジック無し・失敗時 stderr 1 行+exit 0)を作り、claude の `settings.json.example` SessionStart に 2 つ目の独立フックとして配線した。このフックは既に全 7 ハーネスの `<harnessDir>/hooks/` へ投影済み(dist 実測)。U4 は残 5 面の session-start ディスパッチからこの**既存フックを 1 点起動**するだけ(BR-U4-1 — フック側に合成・判定を置かない)。

## 面ごとの配線点(business-logic-model フロー1 / logical-components — 各面アダプタ)

各アダプタの session-start 経路の様式差に合わせ、いずれも `amadeus-plugin-compose.ts` の 1 点起動を追加する:

| 面 | 配線点(正本) | 方式 | context チャネル保全 |
|---|---|---|---|
| codex | `harness/codex/hooks/amadeus-codex-adapter.ts` session-start case | inline `runCore("amadeus-plugin-compose.ts", "{}")` | compose は stdout を出さず、session-start の `wrapped` 出力に非干渉 |
| kiro | `harness/kiro/hooks/amadeus-kiro-adapter.ts` session-start 分岐 | inline `runCore("amadeus-plugin-compose.ts", {})` | context unwrap 後・exit 前に追加 |
| kiro-ide | `harness/kiro-ide/hooks/amadeus-kiro-adapter.ts` session-start 分岐 | 同上(promptSubmit→session-start、`--if-stale` 冪等) | 同上 |
| cursor | `harness/cursor/hooks/amadeus-cursor-lib.ts` `reconstruct` session-start | 純 seam の calls に追加。**compose を先頭**に置き session-start を末尾に維持 | `runAdapter` は lastStdout のみ転送 → session-start が context を保持 |
| kimi | `harness/kimi/hooks/amadeus-kimi-lib.ts` `routeTarget` session-start | 純 seam の返り値に `translate:"none"` で追加 | translate none で compose の空 stdout を drop、session-start relay が context を保持 |

**設定/emit は不変**: アダプタは session-start に対し依然 1 コマンド登録のまま。compose 起動はアダプタのディスパッチ内で行うため hooks.json / snippet.toml / agents.json / .kiro.hook の生成物は変更しない(surgical)。

## 判定層(REL-U4-1 の 2 軸閉包 — canonical 1 定義から導出)

`scripts/plugin-projection.ts` に U3 の `PLUGIN_HOST_CLASS`(matrix (b))と対で:

- `PLUGIN_COMPOSE_TRIGGER: Record<PackageHarness, "measured"|"deferred">`(matrix Bolt6 結論の 2 軸目を 1 回だけ転記)
- `classifyDisposition(clazz, trigger)`: manual-only **または** deferred → `degraded`、他 → `wired`(2 軸閉包 BR-U4-4)
- `resolveFaceDisposition(harness): FaceDisposition`(2 値判別 union `wired | degraded` — 「両方」「どちらでもない」を型で表現不能に = 沈黙欠落の構造的排除、parse-don't-validate)

## degrade 契約(opencode — U4 は契約定義のみ、書込呼出を持たない)

- **manualPath**: INSTALL の manual-only 文言(U3 `installDoc(name, harnessDir, "manual-only")` が投影済み — 「no auto-compose session hook」+ `bun .opencode/tools/amadeus-plugin.ts compose`)。
- **doctorVisibility**: advisory DropsRecord エントリが doctor に可視行として現れること(U5 `buildDoctorPluginSection` の projection — BR-U5-2(a) と共有)。書き手は compose 経路(logical-components shared-resources の分界どおり)。U4 は DropsRecord 書込コードを持たない。

## opencode deferred の判定(BR-U1-2 確定条件 — 本 Bolt 6 で判定)

matrix 列3 の確定条件「opencode plugin API の session lifecycle event を実測、なければ chat.message + --if-stale の per-message 冪等トリガ採用可否を Bolt 6 で判定」について、**manual-only(決定済みクラス、matrix (b)/BR-U1-6 fail-closed)を保持**する判定を採る:

1. opencode クラスは matrix (b) で `manual-only` と決定済み(landed U1 成果物)。
2. 本環境で opencode host CLI 未導入のため session lifecycle event の live 実測が不能。
3. chat.message を per-message トリガとして採用することは、決定済み fail-closed クラスを超える挙動追加(スコープ拡張)であり surgical でない。

→ opencode は degrade のまま(自動トリガ無し・手動床が唯一の契約)。chat.message 採用は確定条件未成立として引き続き deferred。**この判定は完了報告で明示し、reviewer/conductor の裁定に供する**(逸脱ではなく決定済みクラスの実装だが、deferred 判定を単独で下した事実を透明化)。

## テスト(t325〜t328 — 実 FS は integration、純関数は unit)

| ID | 層 | 対象 | BR |
|---|---|---|---|
| t325 | unit | `classifyDisposition` 2軸全4組合せ + `resolveFaceDisposition` 全7面 + matrix 結論 | BR-U4-4 / REL-U4-1 |
| t326 | unit | cursor `reconstruct` / kimi `routeTarget` の session-start に compose 1点、context チャネル非破壊、非 session-start へは非混入 | BR-U4-1 |
| t327 | integration | **XOR 全数 assert**: 全7面 wired XOR degraded、wired は配線点ソースに compose 実在 grep、degraded は compose 非配線+INSTALL manual床+doctor advisory 行描画 | REL-U4-1 / BR-U4-4 |
| t328 | integration | **実起動**: dist アダプタ 5面を session-start で spawn → 実 compose 到達(composition record に plugin)+ no-op 冪等(record byte 同一)。verification theatre 禁止 | BR-U4-3 / FR-3b / FR-3c |

coverage: 追加行の駆動面は (a) `scripts/plugin-projection.ts` の判定層 = t325 が in-process 駆動、(b) cursor-lib/kimi-lib の seam = t326 が in-process 駆動。codex/kiro/kiro-ide アダプタ入口は spawn 専用(LCOV 非在)で patch gate 対象外、t328 の実起動で機能検証。

## 検証(同期・exit code 個別)

`bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` / `bun run dist:check` / `bun run promote:self:check` / `bun run coverage:ci`(lcov DA:0 diff 実測)。正本変更後 `bun scripts/package.ts`(7 ハーネス)+ `bun run promote:self`。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T02:26:57Z
- **Iteration:** 1
- **Scope decision:** none

U4 wires the U2 core compose hook into the 5 remaining matrix-wired faces (codex/cursor/kimi/kiro/kiro-ide) 1:1 with the U1 Bolt6 conclusion, keeps opencode degraded per the already-decided manual-only class, and proves auto-compose via a real adapter-file spawn (t328), not a manifest/CLI-only check.

### Findings

- None
