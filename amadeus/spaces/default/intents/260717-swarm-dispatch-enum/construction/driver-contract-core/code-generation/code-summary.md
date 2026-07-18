# Code Summary — driver-contract-core(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `business-logic-model.md`(決定表の実装正)、`business-rules.md`(BR-1〜8 受け入れ)、`domain-entities.md`(型 verbatim)、`logical-components.md`(部品表)。

## 実装結果(bolt branch `bolt-driver-contract-core`、commit e131b003b)

- `packages/framework/core/tools/amadeus-swarm.ts`: DriverName 三値化(`ultracode` 撤去)・`HarnessName`/`HARNESS_VALUES` 新設・`DriverResolution` 判別 union・`resolveDriver` export 純関数(16セル)・`handleResolve` export(exit 注入 seam)・main switch 第4 case `resolve`・emitSwarmDegraded 三値追随(Fallback :291 固定不変)
- `tests/unit/t233-driver-resolution.test.ts` 新規(31 tests: 手書き16セル matrix+negative+invalid-harness。退役値 ultracode の reject fixture 4件は意図的残存)
- `tests/e2e/t134-swarm-referee.test.ts` case 10 fixture を claude-ultra へ更新
- dist 6本+self-install 4本を package.ts / promote:self で再生成(手編集ゼロ)
- `tests/.coverage-patch-allowlist.json`: spawn-only main() 配線2行(:862-864 case / :868 message)を precedent 同型(amadeus-state.ts:408-413/:458)で allowlist(spawn-blindspot-two-step (ii))

## 検証(builder 実測+conductor 裏取り再実行)

| 検証 | builder | conductor 裏取り |
|---|---|---|
| typecheck / lint | 0 / 0 | 0 / — |
| dist:check / promote:self:check | 0 / 0 | 0 / — |
| --ci フル | 0(375 files / 0 fail / 5315 assertions) | — |
| t233 | 31 pass | 31 pass 0 fail |
| patch gate | PASS(42 added / 38 covered / 4 allowlisted / 0 uncovered) | — |
| 落ちる実証 | unset 分岐改変で 5 fail → revert 31 pass(注入非コミット) | — |
| referee check | — | converged:true / tampered:false |

## 逸脱

なし(builder 申告+conductor 検分一致。コメント ultracode 撤去と in-body コメント移設は既決ノルム適用)。
