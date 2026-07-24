# Performance Requirements — mirror-operation-lifecycle

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Latency and Call Budgets

| ID | Path | Target | Verification |
|---|---|---|---|
| PERF-OL-01 | config＋state＋policyだけのsuppress／ask判断 | p95 ≤ 100 ms（lock待ち／利用者待ち除外） | temporary filesystem benchmark |
| PERF-OL-02 | create 1 lifecycle operation | read-only process最大3（readiness 2＋find 1）、mutation process最大1 | Gateway history |
| PERF-OL-03 | sync／close各1 lifecycle operation | read-only process最大3（view 1＋readiness 2）、mutation process最大1 | Gateway history |
| PERF-OL-03A | workflow completion auto | lifecycle operation最大3、read-only process最大9、mutation process最大3、順序create→sync→close | completion fixture |
| PERF-OL-04 | prompt回答前／skip／off | remote mutation 0件 | fake Gateway history |
| PERF-OL-05 | CAS conflict | 最新stateで再評価最大1回、busy loop 0件 | conflict fixture |
| PERF-OL-06 | status | local parse＋必要なread-only viewだけ、mutation 0件、p95 ≤ 250 ms（network除外） | CLI benchmark |
| PERF-OL-07 | auto completion end-to-end（GitHubが各deadlineまで応答） | drive開始からcontinued返却まで≤270秒＋local処理1秒 | fake clock deadline fixture |
| PERF-OL-08 | 32 caller同event競合 | CAS loserはremote mutation 0件、lock取得開始から5秒以内にconflict／pendingを返す | concurrent integration |

GitHub process deadlineはGateway Unitのreadiness各10秒、単一Issue operation各30秒、find 60秒を再利用する。create上限110秒、sync／close各80秒、completion合計270秒であり、Lifecycle側で別timeout／retry loopを重ねない。promptの人間回答待ちはend-to-end計測から除外し、ask返却までをPERF-OL-01で測る。

## Benchmark Protocol

GitHub Actions `ubuntu-24.04`／X64／同一runner image、pin済みBunで独立3 jobを実行する。各jobはwarm-up 100回後に1,000回、nearest-rank p95を算出し、3 p95の中央値を判定する。最大／最小比2.0超、image不一致、欠損はinconclusive failureとする。

## Resource Constraints

- boundary評価はcurrent Intentと最古eligible pendingだけを扱い、全Intentをscanしない。
- daemon、polling、scheduler、background networkは0件。
- prompt待ち中にprocess／lockを保持しない。
- completion loopはsuccess時だけ進み、3回で必ず停止する。

## Acceptance

1. PERF-OL-01〜06を固定fixtureで満たす。
2. failure／skip／blocked後、同一boundaryの後続operationに対する追加remote callは0件になる。別boundary／manualの明示reconciliationは許可する。
3. background task追加をdependency／timer testで拒否する。

## Review Iteration 1 Remediation

- lifecycle operation、read-only process、mutation processを分離し、operation別／completion全体の最大call数を固定した。
- Gateway deadlineからcreate 110秒、sync／close各80秒、completion 270秒のend-to-end上限を導出した。
- State Unitの2 MiB／1,000 receipt／1,000 warning／32 writer envelopeへcapacity modelを接続した。
- FR-6の全failure classificationに検出期限、state、workflow、再評価契機、RPOを定義した。
- shell非経由argument arrayとmetacharacter／newline／leading-dash fixtureをSecurityへ追加した。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T07:13:24Z
- **Iteration:** 1
- **Scope decision:** none

明白な循環依存はないが、性能の測定境界、容量モデル、回復目標、外部コマンド注入対策が未確定である。

### Findings

- Major — remote operationの計数単位が曖昧で、read-only call、mutation、lifecycle operationを区別していない。p95もlock待ち／networkを除外し競合時latencyを制約しない。
- Major — 32 caller／pending 100件の根拠、最大supported size、成長予測、時間・memory上限、容量超過時挙動がない。
- Major — GitHub unavailable fixture集合と定量的な回復期限／RPOが未定義で、FR-6障害分類matrixがない。
- Major — shell文字列ではなくargument arrayで外部commandを起動する要件が欠落し、command injection対策を検証できない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T07:17:10Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の4件は概ね解消され、循環依存や未解決cross-referenceは確認されなかった。remote effect分類と性能Acceptance境界は明文化余地がある。

### Findings

- Major — network／DNS／timeoutをeffect別に分割し、not-started、no-effect-confirmed、outcome-unknownの結果と再評価条件を固定すべき。
- Minor — failure／skip／blocked後の追加remote call 0件を同一boundary後続operationへ限定し、別boundary／manual reconciliationを許可すると明記すべき。

## Review Iteration 2 Remediation

- network／DNS／timeoutを`not-started | no-effect-confirmed | outcome-unknown`へ分割し、各stateと再評価条件を固定した。
- 追加remote call 0件を同一boundaryの後続operationへ限定し、別boundary／manual reconciliationを明示的に許可した。
