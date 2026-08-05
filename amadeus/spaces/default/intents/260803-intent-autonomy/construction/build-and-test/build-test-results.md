# Build and Test Results — Intent autonomy

## 対象と実行条件

U1 `loop-monitor-runtime`、U2 `quality-repair-runtime`、U3 `intent-autonomy-runtime`、U4 `autonomy-review-observability`、U5 `five-harness-intent-completion` の各`code-generation-plan.md`と`code-summary.md`、および設計を対象に、Bun 1.3.13でComprehensive strategyを実行した。`origin/main`（`be381078c32b1babf5880d0f4925ffa690b83f64`）へrebaseし、0 behind / 12 aheadであることを確認した後にbuildと全テストを再実行した。

## Build結果

| Command | Result | Evidence |
| --- | --- | --- |
| `bun run build` | PASS | rebase後のHEADでexit 0 |
| `bun run typecheck` | PASS | exit 0 |
| `bun run lint` | PASS | exit 0、warning 417件、info 12件、error 0 |
| `bun tests/gen-coverage-registry.ts --check` | PASS | registry fresh、guards green、ratchet held |
| `bun run source-only:check` | PASS | source-only配布契約と生成物境界が同期 |
| `bun run distribution:check` | PASS | payload 412、public projection 416、docs coverage 4 documents / 44 topics |
| `bun scripts/promote-self.ts --check --no-build` | PASS | project-local self installが同期 |
| `git diff --check` / cached check | PASS | whitespace error 0 |

rebase先では`bun scripts/package.ts --check`が廃止されている。これはbuild failureではなく、正規の`source-only:check`と`distribution:check`へ置換されたCLI契約である。

## Test結果

| Suite | Result | Evidence |
| --- | --- | --- |
| 全テスト | PASS | 808 files、0 failed files、10,806 assertions、0 failed assertions |
| Production path + live seam focused | PASS / SKIP | 6 pass、1 opt-in live skip、0 fail、74 assertions |
| rebase後のno-silent-drop採用証跡 | PASS | canonical evidenceを現HEADへ再束縛し、`t413`を含む14/14 testsが成功 |
| 修正対象の回帰 | PASS | mode、DAG fan-out、Stop hook、standing grant診断、Intent終端のfocused testsがすべて成功 |
| Formal Model Check | NOT_DETECTED | run ID `1fca666e-26b8-49f8-a43f-783972b6b650`、exit 0 |

最初の全実行で検出した2件は、旧autonomy fixtureとno-silent-drop証跡のrebase後revision不一致だった。production contractへ合わせてfixtureを修正し、証跡を現HEADへ再束縛した。その後、advisory回答の誤帰属を防ぐ回帰修正も含めて再実行し、全808ファイルは成功した。

AWS認証期限切れおよび5 harness分の実credential未投入により、外部live substrateは明示的SKIPである。SKIPをPASSへ読み替えていない。決定論的Core完了はlive receiptに依存せず、live seamはopt-inの外部検証として残る。

## Acceptance結果

- `none` / `semi` / `full`を実production stateとgate authorizationへ接続した。`semi`はphase内部、`full`はIntent終端まで事前承認された効果を使い、synthetic `HUMAN_TURN`を生成しない。
- `full`のproduction pathでquality failureをrepairし、初回閾値でreplanし、非生産的ループを`REPAIR_STALLED`としてparkする。park後もIntent-scoped grantは保持される。
- Core Intent completionは5 harness live receiptなしでatomicに終端できる。live credential seamはCore completionから疎結合である。
- Claude Code、Codex、Cursor、OpenCode、Kimi Codeは同じCore contractを消費する。将来harness追加をCoreの閉じた列挙へ固定していない。
- `none` / `semi` / `full`はいずれもUnit DAGの並列fan-outを維持し、authorization modeをexecution schedulingへ混入させない。
- legacy standing grantは診断・replay互換性だけを残し、新規workのlive authorizationには使わない。
- PR、merge、GitHub、Issue #1241、外部runner / supervisorは完了条件へ含めていない。

## 総合判定

production reachability、品質修復、loop park、Core終端、5 harness projection、配布整合、既存回帰を確認した。外部live検証の明示的SKIPは残るがCore blockerではないため、Build and Testは**READY**である。
