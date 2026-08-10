# Code Summary — U4 hook-wiring-remaining

> 上流入力(consumes 全数): functional-design/business-logic-model、functional-design/business-rules、functional-design/domain-entities、nfr-design/logical-components、nfr-design/reliability-design、nfr-design/security-design、nfr-design/performance-design、nfr-design/scalability-design、harness-capability-matrix(U1 BR-U1-7)、units-generation/unit-of-work(U4 行)、requirements(FR-3b)

## 実装内容

U1 マトリクスの機械可読 Bolt6 結論(BR-U1-7)を正に、残 5 対応面(codex/cursor/kimi/kiro/kiro-ide)の session-start ディスパッチへ **U2 の core フック `amadeus-plugin-compose.ts` を 1 点起動**する配線を追加(claude は U2 済み、opencode は degrade)。フック側に合成・判定ロジックは置かず(BR-U4-1)、compose 入口の `--if-stale` no-op 高速路(FR-3c)へ委譲。

### 配線(正本、面ごと)

| 面 | ファイル(正本) | 変更 |
|---|---|---|
| codex | `packages/framework/harness/codex/hooks/amadeus-codex-adapter.ts` | session-start case に `runCore("amadeus-plugin-compose.ts", "{}")` を追加(session-start core 実行後) |
| kiro | `packages/framework/harness/kiro/hooks/amadeus-kiro-adapter.ts` | session-start 分岐(context unwrap 後)に `runCore("amadeus-plugin-compose.ts", {})` |
| kiro-ide | `packages/framework/harness/kiro-ide/hooks/amadeus-kiro-adapter.ts` | 同上(promptSubmit→session-start、`--if-stale` 冪等) |
| cursor | `packages/framework/harness/cursor/hooks/amadeus-cursor-lib.ts` `reconstruct` | session-start calls を `[compose, session-start]` に(compose 先頭 → `runAdapter` の lastStdout=session-start で context チャネル保全) |
| kimi | `packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts` `routeTarget` | session-start return に `{hookPath:"amadeus-plugin-compose.ts", translate:"none"}` を追加(compose の空 stdout を drop) |

設定/emit 生成物(hooks.json / snippet.toml / agents.json / .kiro.hook)は不変 — アダプタのディスパッチ内で起動するため(surgical、後方互換シム無し)。

### 判定層(REL-U4-1 の 2 軸閉包)

`scripts/plugin-projection.ts`(U3 `PLUGIN_HOST_CLASS` と同居 = canonical 1 定義):
- `PLUGIN_COMPOSE_TRIGGER: Record<PackageHarness, "measured"|"deferred">`(matrix Bolt6 結論の 2 軸目を 1 回転記)
- `classifyDisposition(clazz, trigger)` — manual-only または deferred → degraded、他 → wired
- `resolveFaceDisposition(harness): FaceDisposition`(2 値判別 union `wired | degraded` — 沈黙欠落を型で表現不能に)

### degrade(opencode)

U4 は契約定義のみで書込コードを持たない(分界どおり)。manualPath は U3 `installDoc(..., "manual-only")`(「no auto-compose session hook」+ 手動 compose)、doctorVisibility は U5 `buildDoctorPluginSection` の advisory エントリ描画(BR-U5-2(a) と共有)。

### opencode deferred の判定(要 conductor 確認)

matrix 列3 の確定条件「chat.message + --if-stale 採用可否を Bolt 6 で判定」について、**manual-only(決定済みクラス、matrix (b)/BR-U1-6 fail-closed)を保持**(自動トリガ無し)と判定。理由: (1) クラスは U1 で決定済み、(2) 本環境で opencode host CLI 未導入のため session lifecycle event の live 実測不能、(3) per-message トリガ採用は決定済み fail-closed クラスを超える挙動追加。chat.message は確定条件未成立として deferred のまま。**この deferred 判定を単独で下した事実を透明化 — 逸脱ではなく決定済みクラスの実装だが、reviewer/conductor の裁定に供する。**

## テスト(t325〜t328)

| ID | 層 | 内容 |
|---|---|---|
| t325 | unit | `classifyDisposition` 2軸全4組合せ + `resolveFaceDisposition` 全7面 + matrix 結論(wired 6 / degraded 1=opencode) |
| t326 | unit | cursor `reconstruct` / kimi `routeTarget` の session-start に compose 1点・context 保全・非 session-start 非混入 |
| t327 | integration | XOR 全数 assert(全7面 wired XOR degraded、wired は配線点ソースに compose grep、degraded は非配線+INSTALL manual床+doctor advisory 描画) |
| t328 | integration | 実起動: dist アダプタ 5面を session-start で spawn → 実 compose 到達(record に plugin)+ no-op byte 同一(verification theatre 禁止) |

既存テスト是正(seam 形状変更に伴う): `t-cursor-adapter`(session-start が [compose, session-start] 2 calls に)、`t-kimi-adapter`(session-start が 2 calls に)、`gen-coverage-registry`(t328 を `EXPECTED_NONE_TO_CLI` へ追記 = deterministic spawner)。

## 検証(全て worktree 内・同期実行・exit code 実測)

| コマンド | exit | 備考 |
|---|---|---|
| `bun run typecheck` | 0 | tsc --noEmit(src+tests) |
| `bun run lint` | 0 | Biome(既存 warning のみ、新規 error 無し) |
| `bun scripts/package.ts`(7 ハーネス) | 0 | 配線を全 dist へ再生成 |
| `bun run promote:self` | 0 | self-install 同期 |
| `bun run dist:check` | 0 | drift 無し |
| `bun run promote:self:check` | 0 | 同期確認 |
| `bash tests/run-tests.sh --ci` | 0 | 是正後、上記4ファイル含め全 green(初回は seam 形状差で 3 ファイル赤 → 是正済み) |
| `bun run coverage:ci` / patch gate | (下記 lcov 参照) | 追加行の lcov DA:0 diff |

## lcov 残余(patch gate)

追加行の駆動:
- `scripts/plugin-projection.ts` 判定層 → t325 が in-process 駆動
- cursor-lib `reconstruct` / kimi-lib `routeTarget` の compose 追加行 → t326 が in-process 駆動
- codex/kiro/kiro-ide アダプタ入口の `runCore` 行 → spawn 専用(LCOV 非在、patch gate 母集団外)。機能は t328 の実起動で検証

<!-- COVERAGE_RESULT_PLACEHOLDER -->

## 逸脱の有無

宣言済み設計からの逸脱なし。1 点、opencode deferred の判定(上記「opencode deferred の判定」節)を単独で下した事実を明示 — 決定済みクラス(manual-only)の実装であり逸脱ではないが、matrix 列3 の「Bolt 6 で判定」文言に対する判定の透明化として報告する。
