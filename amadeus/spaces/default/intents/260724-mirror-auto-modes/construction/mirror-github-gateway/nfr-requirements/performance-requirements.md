# Performance Requirements — mirror-github-gateway

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Latency Budgets

| ID | Path／Load | Target | Measurement |
|---|---|---|---|
| PERF-GW-01 | `gh --version` | deadline 10秒 | fake clock＋hanging runner |
| PERF-GW-02 | `gh auth status --hostname github.com` | deadline 10秒 | fake clock＋hanging runner |
| PERF-GW-03 | create／view／edit／closeの1 process | deadline 30秒 | process runner timeout test |
| PERF-GW-04 | findの全paginationを行う1 process | deadline 60秒 | multi-page fake／hanging runner |
| PERF-GW-05 | readiness後の1 mutation | remote command exactly 1回、追加view 0回 | runner argv history |

deadline到達時にprocessを終了し、read-onlyは`network + no-effect-confirmed`、mutation request送信後は`network + outcome-unknown`を返す。deadlineをservice availability SLOとは扱わない。

## Throughput and Resource Constraints

- lifecycle boundaryごとにoperationを逐次実行し、remote mutationを並列化しない。
- findは`per_page=100`と`--paginate --slurp`で全pageを取得し、N件に対しlocal marker filterをO(N)で1回だけ行う。
- 10,000 Issue／100 page／各body 4 KiB以下のfixtureを、GitHub Actions `ubuntu-latest`、pin済みBunでp95 60秒以内、親＋`gh` process tree合計peak RSS 512 MiB以下で完走する。
- 途中page failure、timeout、shape不正をempty successへ変換しない。
- Gateway内部retry、polling、background processを0件にする。

## Benchmark Protocol

同一job内でwarm-up 3回後に20 runする。durationを昇順sortしnearest-rank `ceil(0.95 × 20)`番目をp95とする。Linux `/proc/*/stat`のPPID関係でrunner親をrootとする生存process treeを50 msごとに再構築し、各PIDの`/proc/<pid>/status` `VmRSS`を同時刻合計した最大値をpeak RSSとする。終了済みPIDは次sampleから除外し、PID再利用はstarttime field不一致で別processとして扱う。fixtureはPR 10%、marker一致0／1／2件を含む。非数値、process消失以外のsampling欠損、timeoutはfail closedにする。

## Acceptance

1. deadlineを超えたprocessが残存せずtyped failureになる。
2. create／edit／close成功pathは各1 remote mutationだけを実行する。
3. 10,000件fixtureで全pageを検査し、false zeroを返さない。
4. background retry／timerは0件である。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T06:11:48Z
- **Iteration:** 1
- **Scope decision:** none

安全性とfail-closed方針は一貫しているが、failure判定に必要な観測契約、メモリ容量、責務境界に実装上の未確定事項が残る。

### Findings

- Blocker — runnerが提供する観測値はexit／stdout／stderrだけである一方、HTTP status、mutation request送信有無、未適用をstructuredに判定する方法が定義されていない。exact argvにも機械可読なerror envelopeを得る指定がなく、classificationとeffectの中核契約を開発者が推測する必要がある。
- Major — 10,000件×32 KiBはbodyだけで約312.5 MiBとなる。gh --slurp、stdout全量保持、JSON parse後DTOを併存させる設計でGateway RSS 512 MiBを満たせる根拠がなく、gh子processをRSS計測へ含めるかも未定義である。
- Major — reliability acceptanceがworkflow transition、warning解消、audit、C3／C8への投影まで要求する一方、Functional BoundaryはGatewayがstate／lifecycleを所有しないとしている。Gateway outcomeから各ownerへ渡すinterfaceと統合検証責任が定義されていない。
- Major — deadline後にprocessを残さない要件に対し、process group、子process、送信signal、grace period、強制終了、platform差の契約がない。通常のchild-process killだけでは子孫process残存を防げない。
- Major — 100並行readの要件と同期実行runnerの関係が不明で、同時実行の定義、スケジューリング方式、完了時間上限がないため、cross-talk検査だけではscalability targetにならない。
- Minor — warm-up 3回＋10 runのp95算出方式と最大RSSの計測手段・対象process範囲が未指定で、CI判定が実装ごとに変わり得る。

## Review Iteration 1 Remediation

- 全API argvへ`--include`を追加し、HTTP envelope parserとrunnerのspawn／timeout／termination観測を定義した。mutation process開始後の失敗はすべて`outcome-unknown`へ保守化した。
- large fixtureを10,000件×4 KiBへ固定し、親＋直接子のpeak RSS測定方法を定義した。
- Gateway outcomeの検証とC3／C8統合検証を分離し、受渡しDTOとownerをReliabilityへ固定した。
- shellなしdirect childのprocess-tree termination sequenceをReliabilityへ追加した。
- 同期runnerと矛盾する並行read targetを削除し、逐次100回のcross-talk／完了時間検査へ変更した。
- nearest-rank p95と50 ms RSS samplingを固定した。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T06:56:51Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1 の HTTP 観測、4 KiB fixture、責務分離、逐次負荷、benchmark 算出の是正は反映済み。ただし process termination/effect 契約、POSIX process-group 生成、permit dependency、実入力容量境界に実装者判断が残り、READY ではない。

### Findings

- Major — reliability-requirements.md の REL-GW-06 は全 read-only failure を no-effect-confirmed とする一方、Process Termination は termination failure を無条件に command + outcome-unknown とする。readiness/find/view の termination failure の effect が二値に割れ、判別 union と C6 retry 判断を一意に実装できない。operation 別に termination failure の effect を定義する必要がある。
- Major — POSIX descendant kill は child process group への SIGTERM/SIGKILL を要求するが、shell:false だけでは child 専用 process group は作られない。既存 injected runner の spawn contract に detached/setpgid 相当、group ID、失敗時の安全動作がなく、acceptance の descendant 0 を安全に満たせない。
- Major — opaque permit は Gateway が runtime で forged permit と binding を拒否する必要があるが、tech-stack dependency 図は Gateway→Types/Runner と Guard→Permit Factory しか定義せず、Gateway が非公開 brand identity/validator をどう参照するか未定義。unique symbol と type/dependency negative test だけでは type assertion/JS caller を runtime で防げない。factory/validator/type の所有moduleとimport方向を固定する必要がある。
- Major — 4 KiB は benchmark fixture の制約に留まり、untrusted remote Issue body の受入上限・超過時の typed degradation がない。全pagination＋--slurp＋全量 parse を要求しながら、実入力が4 KiB超の場合の512 MiB目標の適用範囲も定義されず、Iteration 1 の容量是正は本番境界として未完了。

## Review Iteration 2 Remediation

- termination failureのeffectをread-only=`no-effect-confirmed`、mutation=`outcome-unknown`へ固定した。
- POSIX runnerを`detached:true`の専用process groupとし、PGID生成失敗時はremote未開始でfail closedする契約を追加した。
- internal capability moduleへmodule-private WeakSet、factory、validatorを置き、C6／Gatewayのimport方向とruntime偽造拒否を固定した。
- production responseをfind 64 MiB、単一Issue 1 MiB、body 256 KiBに制限し、超過時のtyped effectとpartial success禁止を定義した。
