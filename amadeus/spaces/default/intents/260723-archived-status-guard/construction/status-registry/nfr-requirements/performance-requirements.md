# Performance Requirements — status-registry

上流の `business-logic-model`、`business-rules`、`requirements` とbrownfield `technology-stack`に基づく。対象はローカルBun CLIの単一JSON registryであり、network serviceのresponse SLAではない。

## Latency and resource targets

| Operation | Dataset | Target |
|---|---:|---:|
| strict read + full status validation | 10,000 entries | p95 ≤ 100ms |
| one-shot migration dry validation + intended-bytes生成 | 10,000 entries | p95 ≤ 250ms |
| incremental RSS | 10,000 entries | ≤ 64MiB |

release gateは既存`.github/workflows/ci.yml`の`ubuntu-latest` x64 check job（標準4 vCPU / 16GiB class）で、既存`test:ci`へ登録したbenchmark testが所有する。新しいCI jobは作らない。runner OS/arch/CPU count/memoryがこのclassと異なる場合は性能合否を出さず、environment mismatchとしてfail-closedにする。

fixtureを一度読んでwarm filesystem cacheにし、同じfixtureでwarm-up 10回後、独立child processを100回起動する。各回のwall-clockを昇順に並べ、nearest-rankの95番目をp95とする。Bunはlockfileからinstallしたversion、fixture bytesとSHA-256、runner image、CPU modelをartifactへ記録する。

RSSは各operation childを`/usr/bin/time -v`で測ったMaximum resident set sizeとし、同じmodule loadだけを行うnoop childのpeak RSSを差し引く。operation/noopは交互に100組実行し、負値を0へ丸めたpeak incremental RSSのnearest-rank p95を64MiB以下とする。明示GCには依存せず、各測定を新processに隔離する。

## Complexity constraints

- registry parse、strict validation、target scan、post-transform validationはO(n)時間。
- decoded rowsとraw bytesの保持はO(n) memory。
- target探索でnested full scansを行わず、migration全体をO(n)に保つ。
- 10,000 entriesを保証範囲とし、要求外のhard capは追加しない。

## Pass/fail

100測定のp95またはpeak incremental RSS上限を1つでも超えれば既存check jobをfailする。性能testはcorrectness assertionを先に通し、不正結果を高速成功として数えない。常駐service throughput、requests/sec、autoscaling latencyは実在境界がないためN/A。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T08:51:32Z
- **Iteration:** 1
- **Scope decision:** none

NFRは数値化されているが、性能再現条件、RSS、filesystem threat、typecheck実行面、UTF-8切詰めが未確定。

### Findings

- BLOCKER — 性能基準環境、既存release gate、実行command、cache準備、p95算出を固定する。
- MAJOR — peak RSSのbaseline/process isolation/GC条件を定義する。
- MAJOR — local filesystem actorとsymlink TOCTOUの脅威境界を閉じる。
- MAJOR — tsc不在実測とrelease条件を整合させる。
- MINOR — 256-byte previewのvalid UTF-8切詰め規則を定義する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T08:53:47Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の5指摘は解消された。性能/RSS測定、security threat boundary、typecheck bootstrap、UTF-8診断上限が再現可能である。

### Findings

- RESOLVED — 既存CI、runner class、cache、100 child process、nearest-rank p95を定義。
- RESOLVED — peak RSSのnoop差分とprocess isolationを定義。
- RESOLVED — filesystem threat boundaryを明示。
- RESOLVED — bun install後のtypecheck実行を定義。
- RESOLVED — valid UTF-8 256-byte previewを定義。
