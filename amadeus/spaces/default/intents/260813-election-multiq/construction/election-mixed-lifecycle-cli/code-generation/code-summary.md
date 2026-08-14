# コード概要 — election-mixed-lifecycle-cli

## 結果

コミット `fcd0d2f542 feat(election): orchestrate mixed lifecycle CLI` で統合済みの U5 実装を、functional design、security/performance design、U5 定義、requirements に照合した。9 verb、固定 machine-readable directive、mixed `partial`、held-only rerun、preserved digest、same-run repair、record render/verify は既存実装と tests で成立していたため再実装していない。

照合で実証できた report target の1 gapだけを補正した。初回 mixed tally 後、`hold` directive の notify は `partial → collecting` を成功させるが、report は current tally の初回全 question target と hold directive の held-only target を比較し、正当な完了報告を `stale-directive` として拒否していた。report の target 観測を、`tally-ready` はコミット済み run target、それ以外は現在の action target とする既存 `currentTargets` policyへ揃えた。state、run ID、target IDs、preserved digest の照合は維持している。

## 変更ファイル

| Path | 変更 |
|---|---|
| `packages/framework/core/tools/amadeus-election-v2-cli.ts` | `reportElectionV2` の target 観測を directive kind に応じた action target へ修正。共有U2差分による `resolveResponses` call-site変更はU5成果として帰属しない |
| `tests/integration/t555-election-v2-directive-executor.integration.test.ts` | mixed tally → hold-only再配布 → 再集計 → render → verify → done を、directive の `verb` / `report` のみで完走するprocess E2Eを追加 |
| `amadeus/spaces/default/intents/260813-election-multiq/construction/election-mixed-lifecycle-cli/code-generation/code-generation-plan.md` | Standard-depth plan、要件追跡、完了状況を記録 |
| `amadeus/spaces/default/intents/260813-election-multiq/construction/election-mixed-lifecycle-cli/code-generation/code-summary.md` | 実装判断と検証結果を記録 |
| `amadeus/spaces/default/intents/260813-election-multiq/construction/election-mixed-lifecycle-cli/code-generation/pr-convergence-report.md` | local convergence evidence と stage evidence blocker を記録 |

## 要件トレーサビリティ

| Requirement / rule | 実装・検証 |
|---|---|
| FR-RER-1〜4、BR-D1〜D5 | 全directiveの共通 field、held reason、held-only target、preserved digest、決定的 `next` を t553/t554/t555 で確認 |
| FR-TAL-2/5/6、BR-C1〜C5 | target-only ballot、established-target拒否、U2 tally、U3 store、U4 record/verification delegate を mixed process E2E で確認 |
| BR-T1〜T7、NFR-3/4 | state/run/target/digest照合、same-run repair、stale fail-closedを既存t553で維持し、hold notify/report の正当経路を新E2Eで固定 |
| BR-O1〜O4 | `next` のstdout JSON、成功時stderr空、verb/reportのみのexecutor、失敗時exit 1とtyped errorをprocess境界で確認 |
| NFR-1 | `next` / `status` はstore bytes不変。target/pending算出はdefinition/tallyの線形走査で、tally再計算やcross productを行わない |
| NFR-5 | focused 3 files、typecheck、lint、build、source-only、diff checkを実行 |

## テストカバレッジ概要

- Integration: malformed stateのfail-closed、partial directiveのheld reason/digest/store不変、held-only rerun、stale directive、established-target ballot、same-run repair、record tampering rejection。
- Property: 任意のmixed partitionに対するheld IDs/reasonsの完全一致と決定性。
- Process E2E: 単純multi-question完走に加え、mixed結果をdirectiveの再構築なしで `distribute → collect → tally → hold → redistribute → retally → render → verify → done` と完走。
- Test configuration: 既存の Bun `bun:test` / fast-check 設定を再利用し、新規設定ファイルは追加していない。

## 計画からの逸脱

主要実装は既存コミットに統合済みだったため、同じCLI surfaceを生成せずreconciliation型のcode-generationとした。実証できた report target gap のみを変更した。API/HTTP、database、migration、deployment artifact は standalone Bun CLI のU5に適用されず、codec/tally/store/record/migration/formal modelは他Unit ownershipのため変更していない。

## Blocker

U5 code/test に未解決 `BLOCKER` はない。repository lint は exit 0 で既存 baseline の 473 warnings / 17 infosを報告した。対象CLIには既存 complexity warning 3件、既存t553には1件があるが、新規t555 testは補助関数分割後にdiagnosticなしとなり、今回差分による新規warningはない。

code-generation stage のblocking sensorには未解決事項がある。正規 `pr-convergence-report.md` はplugin CLIがPR identity、head、audit receiptを結合して生成する。本実行はcommit、push、PR作成、state/audit editを許可されていないため、本unitのlocal reportはCLI attestationを持たず、blocking sensorはfail-closedとなる。これはU5 code defectではなく外部配送前提の未充足である。
