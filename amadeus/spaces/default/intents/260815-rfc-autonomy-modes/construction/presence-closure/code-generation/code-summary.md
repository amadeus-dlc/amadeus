# Code Summary — unit presence-closure(U6 / C13 / FR-12 / D7・D8 / ADR-11)

## Commits(worktree `bolt-presence-closure`、base `swarm-int-rfc0001@57f40d5d5`)

| sha | subject |
|---|---|
| `02d3cf820` | feat(presence): close D7/D8 presence gaps in approve-batch and gate-presence resolution |
| `7cd2e028d` | test(presence): update fail-open pins for D8 uniform fail-closed ledger-absent |
| `3d7ed13e6` | test(presence): update delegate-rejection error pin for D8 gate ordering |
| `b9833d8b6` | chore(tests): regen coverage registry for the new presence-guard test file |

## 実装 summary

- `amadeus-lib.ts`(+114行): `resolveGatePresence` を新設し、ledger-absent を scope 分岐なしで一律 `{present:false, reason:"ledger-absent"}` へ(D8)。`verifyBatchApprovalPresence` を新設し `humanActedSinceGate(pd)` のverb省略形を再利用(R-6、独自判定ロジックを持たない)。
- `amadeus-bolt.ts`(+30行): `handleApproveBatch` の `withAuditLock` コールバック最初の操作として presence check を追加(状態読取・冪等ショートカットより前段、TOCTOU排除)。
- `tests/integration/t-approve-batch-presence-guard.integration.test.ts`(新規、274行)。
- `tests/unit/t188-human-presence-gate.test.ts` / `tests/integration/t509-presence-legacy-shard.integration.test.ts`: 旧fail-openピンをfail-closedへ更新。
- `tests/unit/t112-delegated-approval.test.ts`: `handleDelegateRejection`の一般presenceゲートがfail-closed化した結果生じた別refusalメッセージへピン更新(下記「第2の発見された退行」参照)。

## 検証(実測)

| コマンド | 結果 |
|---|---|
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0(469件の全リポジトリpre-existing warnings、無関係。触った2ファイル(`amadeus-bolt.ts`/`amadeus-lib.ts`)は`git show HEAD:...`で改修前から存在するunused-import warning 1件のみ) |
| `bun tests/gen-coverage-registry.ts --check` | exit 0(regen後) |
| `bun run build` | dist再生成2回(lib/bolt編集後、bypass追加後の再確認) |
| 11ファイル一括(D7/D8隣接) | 184 pass / 0 fail / 575 expect() calls |
| bypass回帰確認(`AMADEUS_SKIP_HUMAN_PRESENCE_GUARD=1`で t33/t507/t145) | 50 pass / 0 fail |

## Red 逐語

### Red #1 — D7(approve-batch presence guard)、実装前

Command: `bun test tests/integration/t-approve-batch-presence-guard.integration.test.ts`
```
 2 pass
 3 fail
 9 expect() calls
Ran 5 tests across 1 file. [619.00ms]
```
Failing(期待どおり3件 — approve-batchがpresence無しで無条件成功):
- `D7 ... > R-1/R-7: no HUMAN_TURN on the ledger -> refuse...` — `expect(rc).not.toBe(0)` got 0
- `D7 ... > R-2: a presence-less re-approve of an ALREADY-approved batch still refuses...` — got rc 0
- `R-6: verifyBatchApprovalPresence reuses humanActedSinceGate...` — 関数が未存在(`expect(fnStart).toBeGreaterThan(-1)` got -1)

### Red #2 — D8(ledger-absent fail-closed)、`bun run build` 後(testはdistからimport)

Command: `bun test tests/unit/t188-human-presence-gate.test.ts tests/integration/t509-presence-legacy-shard.integration.test.ts`
```
 26 pass
 3 fail
 92 expect() calls
```
Failing(期待どおり3件、旧fail-openピン):
- t188 `F: humanActedSinceGate fails CLOSED on an empty ledger (D8)` — expected false, got true
- t188 `seam: humanActedSinceGate scopes to the named record; every scope fails closed when empty (D8)` — got true
- t509 `no audit dir at all: humanActedSinceGate now fails CLOSED (D8)...` — expected false, got true

### Green — 実装後

全11ファイル(D7/D8隣接):
```
bun test tests/integration/t-approve-batch-presence-guard.integration.test.ts \
  tests/unit/t188-human-presence-gate.test.ts \
  tests/integration/t509-presence-legacy-shard.integration.test.ts \
  tests/unit/t112-delegated-approval.test.ts \
  tests/unit/t208-presence-crossshard-tiebreak.test.ts \
  tests/unit/t-delegate-answer-consume.test.ts \
  tests/unit/t203-mint-presence-classify.test.ts \
  tests/unit/t1241-waiting-terminals.test.ts \
  tests/integration/t404-bolt-emit-audit-fatal-latch.test.ts \
  tests/integration/t414-bolt-partial-merge-recovery.test.ts \
  tests/unit/t211-swarm-batch-progress.test.ts

184 pass / 0 fail / 575 expect() calls / 11 files
```

## 申し送り

- FDに記載のない発見(スコープ内の一貫性追補として実装、逸脱ではない): `amadeus-state.ts` の兄弟presence guard(`assertHumanPresentForGateResolution`/`handleDelegateApproval`/`handleDelegateRejection` — FDのG25/G26/G27)は`humanActedSinceGate`呼出し前に`humanPresenceGuardDisabled()`(`AMADEUS_SKIP_HUMAN_PRESENCE_GUARD`)を見る。`tests/run-tests.ts`はスイート全体にこのenvを設定する(`tests/run-tests.ts:632-643`のコメント: "most approve/advance tests drive the gate without recording a HUMAN_TURN... so the suite sets the bypass globally")。`verifyBatchApprovalPresence`に同じチェックを追加しないと既存approve-batchテスト(t33/t507-approve-batch-idempotent/t145のRMW-under-lockスイート)がすべて壊れることを実測で確認し、兄弟パターンと同形の短絡を追加、新テストでpinした。生産presenceロジック(R-1〜R-7)には影響しない。
- 第2の発見された退行(テストピン更新で解消、設計逸脱ではない): `t112-delegated-approval.test.ts`の「delegate-rejection writer — grounded issuance gate (#685)」>「refuses to issue when this session's shard holds no HUMAN_TURN」ケースで、`handleDelegateRejection`が一般`humanActedSinceGate`ゲートを自身の特定own-shard groundingチェックより先に実行する構造がある。D8前は一般ゲートが空ledgerでfail-openし、特定チェックの別メッセージが素通しでpinされていた。D8後は一般ゲートが先にfail-closedするため、その別(だが同等に正当な)拒否メッセージへピン更新。
- 本 unit のスコープ外(unit-of-work.mdの「§12a iteration-2 FOLLOW-UP」項目): `services.md`のC13補記と`component-dependency.md`マトリクスのC13行は conductor の record tree(`inception/application-design/`)配下でありworktree外・owned files外。触っていない — conductorが別途design-doc同期を適用する必要がある。
- 逸脱: none。
