# Code Generation Summary: routing-and-autonomy-guards

## 結論

U04 の実装と Formal Iteration 1 の是正、targeted / 全体検証、生成面投影、patch coverage、directive sensor、Formal Iteration 2 を完了した。3つの正準 seam を既存の engine、pre-LLM classifier、utility、Stop hook、doctor、recompose へ接続し、新しい product API、wire、schema、audit event、runtime dependency、policy、threshold、allowlist は追加していない。U04 は READY である。

## 実装内容

| 要求 | 実装結果 |
|---|---|
| FR-1.4 / BR-U04-01〜07 | `classifyHelpIntent` を正準 decision table とし、bare / namespace help と freeform intent を engine、terminal classifier、utility で同じ規則に投影した。reserved namespace と unknown switch の拒否では workspace mutation を発生させない。 |
| FR-1.5 / BR-U04-08〜20 | `inspectComposeMarker`、単一 marker path、24時間 TTL を Stop hook と doctor で共有した。non-autonomous stale marker だけを best-effort unlinkし、fresh / future / unreadable / autonomous の fail-closed と doctor read-only を維持した。 |
| FR-1.6 / BR-U04-21〜25 | `assertRecomposeAllowed` を lock 内 state snapshot 直後、plan / graph / state / audit mutation 前に適用した。autonomous は actionable non-zero で拒否し、gated / unset は既存 validation へ進む。 |
| FR-0 / NFR-1〜8 | 既存 Bun / TypeScript / generator / sensor stackだけで実装し、正規 package 6面と self-install 4面へ投影した。 |

### Authored source

- `packages/framework/core/tools/amadeus-lib.ts`: 3 pure seam、判別可能 union、reserved help vocabulary、marker path / TTL の正準定義。
- `packages/framework/core/tools/amadeus-orchestrate.ts`: engine help routing の正準 seam 消費。
- `packages/framework/core/tools/amadeus-utility.ts`: direct help、reserved namespace、doctor projection、recompose guard。
- `packages/framework/core/hooks/amadeus-stop.ts`: import-safe な production-owned internal handler、autonomy-first marker inspection、stale janitor。

### Tests and deterministic evidence

- `tests/unit/t246-routing-and-autonomy-guards.test.ts`: pure seam の decision matrix と境界値。
- `tests/integration/t246-routing-and-autonomy-guards.test.ts`: production entry / shipped subprocess parity、marker I/O、doctor、recompose atomicity。
- `tests/unit/gen-coverage-registry.test.ts`、`tests/.coverage-registry.json`、`tests/.coverage-ratchet.json`: recorded 裁定 `E-USSU04CGX1` の範囲で t246 を正規 registry へ登録。
- `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}` は `bun scripts/package.ts`、self-install 4面は `bun scripts/promote-self.ts --apply` だけで再生成した。

## RED → GREEN

- 初期 RED: 0 pass / 8 fail / 1 error / 13 expect。3 seam 不在と consumer 未接続を再現した。
- Formal Iteration 1 是正 RED: 25 pass / 6 fail / 111 expect。reserved slug、unknown autonomy、negative mtime、janitor diagnostics の4反例を固定した。
- 是正 focused GREEN: 31 pass / 0 fail / 144 expect。
- 最終 targeted: 6 files、120 pass / 0 fail / 776 expect。
- 最終 LCOV と exact U04 patch の交差で、追加実行可能174行すべて `DA>0` を確認した。

## 最終検証

| 検証 | 結果 |
|---|---|
| `bun run typecheck` | PASS |
| `bun run lint:check` | PASS。既存 warning のみ。 |
| `bun run dist:check` | PASS。package 6面の drift 0。 |
| `bun run promote:self:check` | PASS。self-install 4面の drift 0。 |
| complexity gate | PASS。baseline regression 0。 |
| registry + mechanism honesty | PASS、45/45。registry は 263/483。 |
| `bun tests/run-tests.ts --ci --verbose` | 397 files / 5627 assertions。U04 failure 0。既知の共有 baseline M16 `t199-generated-prefix-contract` だけが 1 file / 1 assertion failure。log: `tests/logs/2026-07-21T17-10-26Z`。 |
| local coverage | 397 files / 5627 assertions、U04 failure 0。log: `tests/logs/2026-07-21T17-16-44Z`。 |
| normalized exact patch gate | PASS、174 measured / 174 covered / allowlist 0 / uncovered 0。Bun LCOV が実行済み catch body を物理行へ対応づけるよう、janitor の catch header/body を同一行へ coalesce した。 |
| directive sensors | `linter` 6/6、`type-check` 6/6、合計12/12 PASS。 |

既知 M16 は本 Unit 外の共有 tracked artifact に残る旧 upstream prefix baselineであり、leader が既知例外として受理済みである。t199、allowlist、self-exclusion、別 Unit の差分には触れていない。

## Sensor fire IDs

| Output | linter | type-check |
|---|---|---|
| `amadeus-lib.ts` | `77ef7eda` | `506d1c99` |
| `amadeus-orchestrate.ts` | `53bfc66f` | `ea05525a` |
| `amadeus-utility.ts` | `a801fe68` | `0d4413a5` |
| `amadeus-stop.ts` | `dffe2db8` | `028c7883` |
| unit t246 | `808d53c6` | `67e0cc1c` |
| integration t246 | `8e60ed10` | `90b7f63b` |

## 証跡 hash

| 対象 | SHA-256 |
|---|---|
| `amadeus-lib.ts` | `a37b27251936cc7047f4da045e0c6f80417e9e7a8350ec571540db4ba0fd2959` |
| `amadeus-orchestrate.ts` | `5e27f718bc21b59391b2e5b134f3d8e4e5072c8b6b92965ee1f96afc0208becc` |
| `amadeus-utility.ts` | `59fd37b1cb11bf3057a44ce9c23991666c091a7c13b1c81f5bec64a90c3bae3f` |
| `amadeus-stop.ts` | `4cd17822dbbc533374cc944590594958873e2315cb223c305ee51290990ecf10` |
| unit t246 | `3254cce2dea130702d3c9a78a8ac9c36421ac1bd0029653b9d3e36eafb0559d8` |
| integration t246 | `0ad4ae597cf0887c16657b50a1b691ab8807847ec2525df699bf6454c82330c2` |
| coverage registry | `e2a828bb545d0ffa4e5b665360b12177fc45e4780638d09829c588fc284f202b` |
| coverage ratchet | `e5605248adeeac95ec5b0b521249d93395ec788ec55c72deb9191a9deba5a3d6` |
| exact source/test diff | `e1baa048288cc3f196a016a0348dc58677f6becc2a84ed48daa6d45555d19fe1` |
| `coverage/lcov.info` | `d336192223f9cc924e8d1f5c16cca9c0a8cdc322a44c20cdee7a13f74d9a3a60` |
| full CI summary | `fc2c79ba472c9f3c029c237ade2c6f4841a50f8214a4e097986e25923d564aea` |
| full CI failures | `c00d9fc3e42a46a9d3fc525977b10335f7196391fffdbec0aeaccbb5a772f3eb` |
| full coverage summary | `7bef4bc2ac51d6f34899ad93e08c3b90f20144eab61b3ea74976589a1cb2151f` |
| full coverage failures | `99952aaedceff26bc037eb3f84c2d7d76f080196f44b1261f0de961945660249` |

## 計画からの差分

- 当初不変対象だった coverage registry 3ファイルは、t246 を registry 正本へ登録するため `E-USSU04CGX1` の recorded 範囲だけ更新した。threshold と allowlist は不変である。
- coverage 上の catch header と body を同一行へ coalesce し、Bun LCOV が実行済み body を正しく物理行へ対応づける形にした。API、wire、schema、behavior、threshold、allowlist は不変である。
- full CI / coverage の非0終了は既知 M16 1件だけで、U04 direct / regression test はすべて PASS した。

## Formal Iteration 1 disposition

- formal reviewer は 2026-07-21T16:43:30Z に `NOT-READY`、C/M/m=`0/1/0`、GoA=`FAIL` と判定した。raw `Help!` / `HELP` が slugify 後の reserved `help` と一致する反例だった。
- e3/e4 の独立先行reviewを合わせた union は C/M/m=`0/4/0`。追加3件は unknown autonomy の fail-open、negative mtime の stale 誤分類、janitor delete success/failure の非型付け・非診断だった。
- 4件とも fixed negative を RED で固定し、正規reserved語彙、unknown autonomy fail-closed、negative mtime unreadable、typed janitor outcome + `recordHookDrop` diagnostic で閉包した。新audit event、public API、schema、store、threshold、allowlistは0。

## Review handoff

- Formal Iteration 2: **READY**。
- reviewer: `amadeus-architecture-reviewer-agent`、UTC=`2026-07-21T17:28:03Z`。
- Critical / Major / Minor: `0 / 0 / 0`、GoA=`PASS`、新規finding 0。
- e3/e4 の独立先行reviewも両方 `VERIFIED / C0-M0-m0`。Formal Iteration 1 union 4件がCLOSED、全freeze hash、package 6 / self 4、full / coverage、patch 174/174、sensor 12/12の一致を確認した。
- developer 実行計画 Step 1〜13 と formal review は完了済み。§13 と engine report/next は orchestrator 所有の次判断点である。
