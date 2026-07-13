# Release & Migration Closure Scalability Design

## 入力契約とscale model

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。scale dimensionはmanifest file、receipt、coverage、findingである。contractは3 provider、4 native driver、4 harness、2 deterministic platform、macOS live 4 driver、FR-01〜FR-26、6 closure domainへ閉じる。

## Closed expected sets

| Dimension | Expected set/cardinality | Validation |
|---|---|---|
| provider/driver | 3/4、Claude/Codex/Kiro = 2/1/1 | production composition exact set |
| distribution | Claude/Codex/Kiro/Kiro IDE = 4 | package manifest exact set |
| self-install | Claude/Codexのみ | existing target exact set |
| deterministic platform | macOS + GitHub Actions Linux = 2 | candidate-bound receipt |
| credentialed live | macOS 4 native driver | sealed index exact set |
| requirements | FR-01〜FR-26 |各1以上のvalid evidence |
| closure domain | registry/projection/docs/platform/live/Issue = 6 | all green |

unknown/extra/missingを動的discoveryやcatch-allで受け入れず、blocked findingとして全件集約する。

## Data organization and candidate isolation

file digestはpath key、receiptはdomain/ID key、coverageはFR key、findingはdomain/code/subject keyでindexし、各collectionをcanonical sortする。timeは`O(f log f)`と`O((r+q+k) log(r+q+k))`以下、追加memoryは線形とする。

tree変更ごとにnew candidate IDを作り、全receiptを再評価する。旧closed reportや別candidateの部分receiptをincremental successへ流用しない。receipt/report/provider summary更新だけはinput digestを変えず、authored/generated manifest input変更だけがnew candidateを要求する。

## Growth and contention policy

provider、driver、harness、platform、live matrix、FR集合の追加はrelease schema changeであり、expected set、registry cardinality、package/docs manifest、coverage、live evidence、test matrixを同一Intentで更新する。remote database/cache/queue/distributed workerは追加しない。

Issue publisher concurrencyは1に限定し、create後re-searchでopen exactly 1を要求する。concurrent publisherやexternal raceを検出した場合、追加mutationせずblockedにする。

## Degradation policy

input/receipt/finding増加時にdomain、driver、platform、coverage rowをsample/dropしない。missing/red/stale/extra/unknownは全件blocked findingへ入れる。live不足をfake/skip/floor/legacyで補完せず、Linux receiptをmacOS liveへ変換せず、Issue競合を自動修復しない。

## Scalability verification

- generated file/receipt/coverage/finding setでoperation/object countとcanonical digestを検証する。
- closed expected setのmissing/extra/duplicate/unknownをdimensionごとにproperty testする。
- manifest input mutationでnew candidate全再評価、output-only mutationでcandidate不変を検証する。
- Issue concurrent/race fixtureでpublisher最大1、conflict後mutation 0を確認する。
- finding aggregationがfirst-error停止せず全subjectをexactly 1件返すことを確認する。
