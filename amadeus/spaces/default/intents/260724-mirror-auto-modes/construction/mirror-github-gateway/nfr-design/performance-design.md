# Performance Design — mirror-github-gateway

> 上流入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`

## Deadline Architecture

`MirrorProcessRunner`はoperation profileを必須入力とし、spawn前にdeadlineとstdout上限を固定する。

| Profile | Deadline | stdout hard limit |
|---|---:|---:|
| version／auth | 10秒 | 1 MiB |
| create／view／edit／close | 30秒 | 1 MiB |
| find全pagination | 60秒 | 64 MiB |

deadline timerは1 processにつき1個で、完了時に必ずclearする。Gateway内retry、polling、background workerは作らない。mutationはreadiness成功後に1 remote processだけを起動し、成功responseを得るための追加viewを行わない。

## Output and Memory Control

runnerはstdout chunkを受けるたびに累積byte数を確認し、limit＋1 byteでreaderを停止してdeadlineと共通のtermination controllerへ`capacity` triggerを渡す。上限内では1つのBufferへ蓄積する。findはJSON parse前にbyte-level JSON string scannerで各`body` tokenを認識し、escapeをdecodeしたUTF-8 bytesを最大256 KiBまで数える。scannerがinvalid、未完、超過なら全Bufferをparseせずfailureにする。

scanner通過後にHTTP envelopeを分離しJSON.parseする。最大同時保持は`gh` child aggregate、親raw Buffer 64 MiB、UTF-8 string最大128 MiB相当、parsed object、必要field DTOであり、raw Bufferはparse直後、full parsed pageはfilter直後に解放する。10,000×4 KiB fixtureのprocess tree peak RSS 512 MiBを実測gateとし、超過実装は採用しない。PR entryはcandidate DTO化前に除外する。partial page、partial JSON、body超過時にcandidateを返さない。

## Benchmark Protocol

10,000 Issue、100 page、body各4 KiB以下、PR 10%、marker一致0／1／2件のfixtureを使う。GitHub Actions `ubuntu-latest`、pin済みBun、warm-up 3回後20 run、nearest-rank `ceil(0.95×20)`でp95を求める。

- find: p95 ≤ 60秒。
- runner親をrootとする全process treeの同時刻RSS合計peak ≤ 512 MiB。
- `/proc/*/stat`のPPID＋starttimeでtreeを50 msごとに再構築し、各`VmRSS`をsamplingする。
- 非数値、timeout、説明不能なsampling欠損はfail closed。
- 100 read-only callは同期で逐次実行し合計60秒以内、cross-talk 0件。

## Verification

1. fake clock／hanging runnerで10／30／60秒deadlineとtimer cleanupを検証する。
2. argv historyでmutation 1回、追加view 0回、background process 0件を検証する。
3. 64 MiB＋1 byte／1 MiB＋1 byteで共通termination controllerとtyped failure、256 KiB＋1 byte bodyでJSON.parse call 0件を確認する。
4. large fixtureで全page、RSS、p95、marker semanticsを検証する。

## Traceability

| Requirement | Design／Verification |
|---|---|
| PERF-GW-01〜04 | Deadline Architecture、fake-clock timeout tests |
| PERF-GW-05 | single-mutation argv history |
| throughput／RSS | Output and Memory Control、large fixture benchmark |
| no retry／background | one timer／one process invariant、spawn scan |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T08:38:29Z
- **Iteration:** 1
- **Scope decision:** none

上流NFRとの対応、effect certainty、runtime capability拒否、責務分離は概ね具体化。一方、paginationのstdout contract、process-group lifecycle、termination上限、body/RSS境界に残件がある。

### Findings

- [Blocker] gh api --include --paginate --slurpの反復HTTP envelopeとslurped aggregateのbyte grammar、page別status、途中page欠落識別が未定義。
- [Major] detached spawn後のPGID確認失敗をnot-startedとは証明できず、deadlineとexit/reap競合、PGID再利用防止のatomic settlementがない。
- [Major] SIGKILL後のreap／group消滅確認、Windows taskkillを含むtermination総時間がboundedでない。
- [Major] body 256 KiBのparse前検査と、gh slurp／raw Buffer／string／parsed DTO併存時の512 MiB根拠がない。
- [Major] RSS計測が親＋直接子だけでdescendantを除外している。
- [Major] output超過時のterminationがdeadline terminationと同じ契約か未定義。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T08:42:58Z
- **Iteration:** 2
- **Scope decision:** none

pagination grammar、termination総上限、parse前body上限、全process-tree RSS、capacity terminationは解消。leader先行reap時の子孫残存処理に1件残る。

### Findings

- [Major] 元childのclose/reap後に同一process groupのdescendantだけが残る場合、再signal禁止ではdescendant 0を満たせない。group identityを安全に保持するか、このケースをtermination-failedへ確実にsettleする必要がある。
- [Resolved] include/paginate/slurp byte grammarとpage count一致を定義済み。
- [Resolved] cleanup合計5秒、Windows同一上限。
- [Resolved] parse前body scanner、全process tree RSS、共通termination controllerを定義済み。

## Review Iteration 2 Remediation

- leaderが先にreapされgroupだけが残る場合は、PGID再利用による誤killを避け、5秒以内に`termination-failed + residualDescendantPossible`へsettleするfailure pathを追加した。
- 通常cleanupのdescendant 0件とleader-first-exit failure fixtureを分離し、reap後signal 0件を検証条件にした。
