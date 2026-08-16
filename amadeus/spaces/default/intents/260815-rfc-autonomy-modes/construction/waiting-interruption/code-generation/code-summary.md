# Code Summary — unit waiting-interruption(U3)

## Commits(worktree `bolt-waiting-interruption`、base `swarm-int-rfc0001@54baec9ce`)

| sha | subject |
|---|---|
| `efeeeadd4` | fix(state): remove the park autonomy guard (RFC-0001 FR-3) |
| `89b275306` | feat(waiting): add the waiting cause and its rate constraint |
| `3e4a27fa6` | feat(audit): register the waiting lifecycle markers |
| `cdf0ebd2e` | feat(autonomy): make waiting a first-class terminal on the ledger |
| `0fa60f7f7` | feat(engine): present waiting as its own terminal directive |
| `85cc3554e` | chore(tests): regenerate the coverage registry for the waiting test files |
| `2eccf61b3` | test(waiting): read both bolt dispatch tables in the no-CLI-verb check |
| `69a78b714` | chore(tests): record the new CLI-spawning test files in the mechanism census |

## 実装 summary

- `amadeus-state.ts`(-一部): park の autonomy guard(`:1600` 拒否条件 + `:1574-1595` 解説コメント)を撤去。1turn=1park 会計(`outstandingHumanTurns`)は無改変。
- `amadeus-waiting.ts`(新規、238行): waiting cause(occurrence/非一意 outcome/derivation transcript/basis fingerprint/interactivity judgment)とレート制約(`occurrenceId + basisFingerprint` の正規化digest鍵、台帳照合)。
- `amadeus-intent-autonomy-runtime.ts`(+124行): `AutonomyRuntimeEvent` union に waiting 判別子を追加、`INTENT_AUTONOMY_TRANSACTION_COMMITTED` 監査行へ payload として格納(R-7a)。
- `amadeus-intent-autonomy.ts`: waiting union / resumeInterruption 分岐。
- `amadeus-directive.ts`(+37行)・`amadeus-intent-autonomy-production.ts`(+108行)・`amadeus-orchestrate.ts`(+50行): waiting 専用 directive kind の production entry/reader/resume。REPAIR_STALLED は `parked` directive のまま無退行。
- `amadeus-audit.ts`・`otel/event-registry.ts`・`audit-format.md`: `WORKFLOW_WAITING_ENTERED`/`WORKFLOW_WAITING_RESUMED` を四集合へ登録、カウント 96→98。

## 検証(実測、worktree HEAD `69a78b714`)

| コマンド | 結果 |
|---|---|
| `bun run build` | exit 0 |
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0 |
| `bun tests/gen-coverage-registry.ts --check` | exit 0 |
| `bun packages/framework/core/tools/amadeus-sensor-event-registry-drift.ts` | exit 0(`{"pass":true,"errors":[],"findings_count":0}`) |
| 13 unit+integration ファイル(own + touched pins) | 201 pass / 0 fail |
| 11 adjacent autonomy/orchestrate/stop-hook ファイル | 220 pass / 0 fail |

## Red 逐語

### FP-1 — park guard(R-1〜R-5)

`bun test tests/unit/t1241-park-guard-removal.test.ts` → 4 fail / 2 pass、Ran 6 tests。
```
113 |     const res = runState(["park"]);
115 |     expect(res.rc).toBe(0);
error: expect(received).toBe(expected)
Expected: 0
Received: 1
(fail) t1241 park under autonomous mode (FR-3: the guard is removed) > an unattended autonomous run CAN park
```
（2件のGreenは R-3 の無退行ケース、改修前後で不変。guard除去+コメント除去後: 6 pass / 0 fail）

### FP-2/FP-3 — waiting domain

`bun test tests/unit/t1241-waiting-cause.test.ts` → 0 pass / 1 fail / 1 error:
```
error: Cannot find module '../../packages/framework/core/tools/amadeus-waiting.ts'
```
実装後: 26 pass / 0 fail。

### FP-5 — audit vocabulary

`bun test tests/unit/t1241-waiting-audit-vocabulary.test.ts` → 0 pass / 6 fail:
```
error: unmapped audit event type: WORKFLOW_WAITING_ENTERED — drift guard violation (BR-7)
```
四集合 + カウント同期(96→98)後: 6 pass / 0 fail。

### FP-6 — ledger round trip(型レベルの不能、FDの予測どおり)

`bun run typecheck`:
```
tests/unit/t1241-waiting-ledger.pbt.test.ts(101,35): error TS2339: Property 'enterWaiting' does not exist on type 'IntentAutonomyCoordinator'.
tests/unit/t1241-waiting-terminals.test.ts(39,3): error TS2305: Module '"...amadeus-waiting.ts"' has no exported member 'resumeInterruption'.
```
union + coordinator + `resumeInterruption` 実装後: 16 pass / 0 fail。

### R-14 — waiting directive

`bun test tests/unit/t1241-waiting-directive.test.ts` → 0 pass / 10 fail:
```
Received: "unknown kind: \"waiting\" (expected one of run-stage | ... | parked | await-completion | await-approval)"
```
4つの directive table 実装後: 10 pass / 0 fail。

### Engine path(production)

`bun test tests/integration/t1241-waiting-engine.integration.test.ts`:
```
SyntaxError: Export named 'waitingDirectiveFor' not found in module '.../amadeus-orchestrate.ts'
```
production entry/reader/resume + orchestrate 分岐実装後: 8 pass / 0 fail。

## 申し送り

- 空虚述語の是正(2件、実装欠陥ではなくテストの検査対象修正、コミット `2eccf61b3`):
  1. R-6 の no-CLI-verb sweep が `amadeus-bolt.ts` の `case "…waiting…"` regex を使っていたが、同ファイルは autonomy verbs を `const handlers` lookup map 経由で dispatch する箇所があり、その半分が無条件に一致0件でパスしていた。両方の dispatch 形状を読み、各抽出が実在する verb を見つけることを assert する形へ修正。
  2. あるintegrationテストがレート制約を駆動するとコメントされていたが実際は `workflow-already-suspended` で通過していた(waiting 記録が開いている間はレート検査に到達不能)。コメントとアサーションを実際に測っているものへ訂正。レート制約自体は unit テストで直接駆動する形に。
- 逸脱: none。
