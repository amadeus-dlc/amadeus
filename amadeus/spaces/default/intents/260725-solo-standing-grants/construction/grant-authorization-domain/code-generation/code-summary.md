# Code Summary: grant-authorization-domain

## 実装概要

U1 `grant-authorization-domain`として、solo standing grantのcanonical domain、lifecycle、audit taxonomyを実装した。directive carrier、report transport、approval transaction、human fallback、presence reservationはU2、最終的な全harness投影・drift収束はU3の責務として本実装には含めていない。

### Canonical domain

- Integration `U1-CODE-DOMAIN-2`は、pure grant query／registry-bound readerを持つ`packages/framework/core/tools/amadeus-grant-authorization.ts`が所有し、共通型・gate policyだけを`packages/framework/core/tools/amadeus-lib.ts`に残すimport-cycle-freeな境界で実装した。
- `resolveOperatingMode`を追加し、未設定・空文字・`solo`を`solo`、`team`を`team`へ解決し、未知値を判別可能なinvalid resultにした。
- `StandingGrant`へ既存`GRANT_ISSUED.Timestamp`由来の`issuedAtMs`を追加し、event type、Grant Id、scope、expiry、phase-boundary flag、issuer coordinatesをexact parseする。
- `findSoloStandingGrant`はcursorが指すactive intentと引数intentの一致を要求し、そのrecordのissueだけを候補にする。current-space `intents.json`の検証済み・非archived・`dirName`明示rowだけを単一列挙元としてaudit shardを1回ずつscanし、HUMAN_TURN provenanceと取消を投影する。未登録・archived・rowから解決不能なdirectoryはcorpusへ混入しない。同一Grant Idのvalid issueがexactly one、未失効、未取消、intent一致、gate eligibleの候補だけを、expiry降順→issued timestamp降順→Grant Id昇順で選ぶ。
- `validateSoloStandingGrantById`はbest candidateを再探索せず、指定Grant Idだけを`not-found`、`ambiguous-id`、`malformed`、`expired`、`revoked`、`intent-mismatch`、`invalid-provenance`、`gate-out-of-scope`へ判別する。
- `evaluateStandingGrantGateEligibility`はgateなし、phase-boundary opt-in、walking-skeleton stance、`amadeus-feature` effective-on、未知scope fail-closed、per-unit未完をtyped eligible/ineligibleで評価する。擬似gate値は追加していない。
- `StandingGrantRouteReceipt`と`findStandingGrantRouteReceiptById`を追加し、UUID v4 Route Id、Stage、Grant Id、Timestampをexact parseし、registry-bound corpus内でexactly-oneのreceipt owner intentだけを返す。latest/consumed/superseded推測は行わない。
- pass-labelled observer seamはproduction既定でno-opとし、永続metricsを追加せず、test時だけ`shardOpened`、decoded event block単位の`eventVisited`、`candidateCompared`、`memoryItemAdded`を計測する。同一passで同じcanonical shardを2回開く場合は拒否する。

### Lifecycle and audit

- `grant-standing-delegation`と`revoke-standing-delegation`は同じcanonical mode resolverを使い、solo/teamの双方を許可する。fresh HUMAN_TURN、4時間default TTL、明示TTLのfiniteかつ正、scope、issuer provenance、permissive revoke append、teamのstdout/stderr/event field順は維持した。
- 未知modeはaudit mutation前にfatal refusalする。
- `GATE_AUTHORIZATION_SELECTED`をcanonical event registry、heading、protected mint catalogへ追加し、general audit CLIの`append`/`append-raw`からのmintを拒否する。
- canonical audit taxonomyを78 eventへ更新し、explicit acceptance listに既存`INTENT_ARCHIVED`/`INTENT_UNARCHIVED`と新eventを同期した。

## 変更ファイル

| 区分 | パス | 内容 |
|---|---|---|
| 変更 | `packages/framework/core/tools/amadeus-lib.ts` | mode resolver、StandingGrant parse、gate eligibility |
| 新規 | `packages/framework/core/tools/amadeus-grant-authorization.ts` | registry-bound projection、exact-ID validation、receipt query、test observer |
| 変更 | `packages/framework/core/tools/amadeus-state.ts` | solo/team共通のissue/revoke lifecycle mode validation |
| 変更 | `packages/framework/core/tools/amadeus-audit.ts` | protected `GATE_AUTHORIZATION_SELECTED` taxonomy |
| 変更 | `packages/framework/core/knowledge/amadeus-shared/audit-format.md` | 78-event registryとreceipt schema |
| 新規 | `tests/unit/t-solo-standing-grant-domain.test.ts` | mode、projection、cardinality、完全順序、expiry equality、policy matrix、receipt tests |
| 変更 | `tests/integration/t-standing-grant.test.ts` | solo issue/revoke、team output shape、fresh-human、unknown mode、protected mint |
| 変更 | `tests/unit/t28-audit-event-sync.test.ts` | taxonomy baseline 78 |
| 変更 | `tests/unit/t111.test.ts` | explicit 78-event acceptance |
| 変更 | `code-generation-plan.md` | Step 1〜9の完了記録 |
| 新規 | `code-summary.md` | 本サマリ |

## 検証結果

| コマンド | 結果 |
|---|---|
| `bun test tests/unit/t-solo-standing-grant-domain.test.ts tests/unit/t28-audit-event-sync.test.ts tests/unit/t111.test.ts tests/integration/t-standing-grant.test.ts` | PASS、177 tests / 454 assertions |
| G/E counter fixtures | PASS。G=`0/1/10/100`で`candidateCompared <= G-1`、E=`0/1/25`でdecoded event数と一致、linear memory上限内 |
| 100 intents / 100,000 events receipt fixture | PASS、86.16 ms（上限5,000 ms）、100 shard open・100,000 event visit |
| team baseline | PASS。team issuance round-trip、leader gate approval、delegation approval、`DELEGATED_APPROVAL` canonical acceptance、standing-grant approvalの既存focused testsを含む |
| `bun run typecheck` | PASS |
| changed-file Biome check | PASS、warning 0 |
| `bun run lint` | exit 0。既存repository-wide complexity等のwarning 267件、本変更由来warning 0 |
| `git diff --check` | PASS |

依存が未導入だったため、承認済み前提どおり`bun install --frozen-lockfile`で復元した。lockfileとmanifestの変更はない。

## Plan差分と生成物の扱い

Review Iteration 1により、当初`amadeus-lib.ts`内に置いたsolo projection／receipt queryを専用moduleへ分離し、filesystem directory列挙をregistry row列挙へ置換し、performance observerとblocking fixtureを追加した。検証方法を調べるために実行した`bun scripts/package.ts --help`はhelpを解釈せず通常生成を実行したため、canonical U1変更が6 harnessの`dist/`へ機械投影された。生成物は手編集していない。親conductorの指示により生成差分は保持し、今回のreview remediation後はgeneratorを再実行していない。U3 ownershipでself-installを含む最終`dist:check`/`promote:self:check`と全harness収束を行う。

U2 non-goalであるdirective/report/approval/fallback/presence reservationには変更していない。
