# Code Summary — guard-integration

Integration spot-check `GUARD-INTEGRATION-PRIMARY-1`: 共通guard正本は `packages/framework/core/tools/amadeus-lib.ts`。

Integration spot-check `GUARD-INTEGRATION-PRIMARY-1`: 正本実装は `packages/framework/core/tools/amadeus-lib.ts`。

## 実装結果

- `select`、`next`、`unpark`共通のtyped guardと、`intent-not-found` / `intent-archived` rejection、実行可能なunarchive recovery commandを追加した。
- public identity factoryは公開しない。preflight-only resolverはactive `LockedIntentRegistryContext`とregistry entryを受け、lock/context有効性、対象の存在・一意性、dirName/status snapshot一致を検証して、runtime Symbolでbrandedされた不可分 `{identity,status}` を返す。guardはこのvalidated targetだけを受け、callerによるidentity/statusの組み替えを拒否する。3 public callerはpreflight内resolverを使用し、復旧commandの引数はsingle quoteする。
- utility selectorはrecord dirと一意slugをstrict lifecycle preflight内で解決し、archived intentへのcursor変更を副作用なしで拒否する。
- utilityの`intent archive/unarchive`はlock解放後にstate CLIへresolved dirNameを渡し、stdout、stderr、exit code、signalを透過する。
- orchestratorの`next`はstage resolution前にstale archived cursorを検出し、`kind:error`を正確に1件返してaudit/stateを変更しない。
- stateの`unpark`はmarker read/write前にguardし、parked有無にかかわらずarchived intentをnon-zeroで拒否する。

## 検証結果

- focused tests: 14 pass、0 fail。forged target拒否、selector 2形態、allowed baseline、stale cursor、unpark 2形態、委譲成功/失敗、8並行、AST corpus、1x/2x growthを含む。
- 8並行archived selectorは全件exit 1となり、cursor、registry、audit bytesは不変だった。
- AST 1xは全call 4,746、sink 7件（`setActiveIntentCursor` 2、`archivedNextGuard` 1、`removeField` 2、`transitionIntentStatusLocked` 2）。2xは全call 9,492、sink 14件（4、2、4、4）で、総数・全種別とも正確に2倍だった。unresolved 0、dynamic 0、unclassified 0。
- AST 100 samplesのmedianは1x 21.023ms / 360,054,784 bytes、2x 44.951ms / 397,492,224 bytes。倍率はtime 2.138、RSS 1.104で、どちらも2.5以下だった。
- 10,000件fixture、warm-up 10回、各100 pairでvalidated resolver+guardを測定した。`select`はallowed p95 1.925500ms、archived p95 1.938833ms、pairwise差分p95 0.110833ms、RSS差分p95 49,152 bytes、correctness 200/200。
- `next`はallowed p95 1.938708ms、archived p95 1.914375ms、pairwise差分p95 0.056792ms、RSS差分p95 32,768 bytes、correctness 200/200。`unpark`はallowed p95 1.940292ms、archived p95 1.928791ms、pairwise差分p95 0.105625ms、RSS差分p95 16,384 bytes、correctness 200/200。
- provenance: fixture SHA-256 `ef2158dbca9f4954cc8d60f5765da9283fab787da5d5b5a4767d25f7bb86f3`、Git SHA `cb3525fa85d3fe22f945ee3c4f74c681a32b9ae6`、Bun 1.3.13、Apple M4 Max、runner `local`。

## 配布・品質

- Claude、Codex、Cursor、Kiro、Kiro IDE、OpenCodeの6 harnessを再生成した。
- Claude、Codex、Cursor、OpenCodeの4 self-install面を同期した。
- typecheck、complexity gate、coverage registry freshness、dist drift、self-install driftはpass。
- lintはpass（repository既存advisory warningのみ）。
- 不可分validated targetとlegacy UUID-suffix registry対応を含む最終生成状態で`bun run test:ci`を再実行した。
- `bun run test:ci`: 470 files、6,747 assertions、0 failed files、0 failed assertions、RESULT PASS。既存のwall-clock drift 1件はadvisory。
- Git操作・commitは行っていない。

## Non-goals

- status永続化、transaction内部、force option、database、cloud、daemon、external telemetry、新runtime dependency、新CI jobは追加していない。
