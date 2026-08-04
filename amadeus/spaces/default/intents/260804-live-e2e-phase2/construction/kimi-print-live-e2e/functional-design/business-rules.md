# Business Rules — kimi-print-live-e2e

## 入力と適用範囲

本規則は [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[components.md](../../../inception/application-design/components.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[services.md](../../../inception/application-design/services.md) に基づく。

対象はKimi Codeのprint transportだけである。Kiro、Codex、Claude、Piの能力を本規則から推定せず、Kimi都合で共通contractを緩和しない。

## Gate, preflight, and serialization rules

- **BR-KIMI-01:** `GITHUB_ACTIONS=true`はopt-inより優先し、canonical CI-deny SKIPを返す。
- **BR-KIMI-02:** exact opt-in keyは`AMADEUS_KIMI_PRINT_LIVE`とし、値が厳密に`1`でない場合はdisabled SKIPとする。
- **BR-KIMI-03:** gate SKIPではlease、scratch、credential access、binding、spawn、ledger writeを0回にする。
- **BR-KIMI-04:** binary、version、配布物、認証前提の不足を閉じたpreflight SKIPへ写像し、leaseとprocessを開始しない。
- **BR-KIMI-05:** preflight ready後、副作用を持たない一意なrequest IDを発行し、同じIDをqueue entryとprocess-wide `live-e2e-global` FIFO leaseのowner tokenに使う。
- **BR-KIMI-05A:** lease取得後の`KimiRunIdentity`はrequest IDを不変fieldとして引き継ぎ、同時active runを1つに制限する。
- **BR-KIMI-06:** queue待機中はallocator、credential lease、binding、spawn、journey timeout timerを開始しない。
- **BR-KIMI-07:** run-wide leaseは全attempt、cleanup、ledger処理を通じて保持し、全終了経路の`finally`で、run identityのrequest IDとowner tokenが一致するownerだけが1回解放する。
- **BR-KIMI-08:** Kimiは必須接続対象であり、probe-only、measured-only、follow-up-linkedをUnit完了状態として使わない。

## Isolation and execution rules

- **BR-KIMI-09:** attemptごとに一意な一時projectと一時`KIMI_CODE_HOME`を使い、ambient HOMEを実行homeにしない。
- **BR-KIMI-10:** credentialはコピーせず短命bindingとして利用し、source credentialを変更・削除しない。
- **BR-KIMI-11:** child environmentは宣言済みallowlistから新規構築し、ambient sensitive key、raw credential、source auth/config pathを含めない。
- **BR-KIMI-12:** 実行commandはadapter所有の`kimi -p` mechanicsに閉じ、共通kernelへKimi固有switchを追加しない。
- **BR-KIMI-13:** PASS候補にはexit成功とdeterministic bounded anchorの両方を要求し、モデル文面完全一致、exitだけ、raw outputだけではPASSにしない。
- **BR-KIMI-14:** transport captureはstreamごとに4,096 UTF-8 bytesを上限とし、code-point境界で切り詰め、`sanitizeText(..., 512)`後にdigest化する。raw prompt、raw transcript、secret、source pathを永続化しない。
- **BR-KIMI-15:** journey timeoutは`600_000 ms`、包含Bun test timeoutは`660_000 ms`以上とし、同値にしない。

## Resource lifecycle rules

- **BR-KIMI-16:** resourceは作成前に`planned`登録し、成功後だけ`created`へ遷移する。partial prepareでも全planned resourceをcleanup対象にする。
- **BR-KIMI-17:** cleanup順はprocess boundary terminate → owned descendant reap → credential binding除去 → 一時home/project除去とする。
- **BR-KIMI-18:** cleanupは冪等で、二重実行してもclosed resourceをfailureへ戻さず、共有source credentialへ作用しない。
- **BR-KIMI-19:** owned descendantが1つでも未reap、またはbinding・scratchが1つでも未closedならcleanup barrierは失敗する。

## Retry rules

- **BR-KIMI-20:** retryable reasonは`childCreated=false`かつOS error codeが厳密に`EAGAIN`の場合の内部値`kimi-startup-capacity`だけである。
- **BR-KIMI-21:** retryは最大1回で、anchor確立前かつ前attemptの全resourceがclosedの場合だけ許可する。
- **BR-KIMI-22:** child生成済み、`EAGAIN`以外のspawn error、未知code、provider応答、timeout、auth/config error、policy violation、secret exposure、anchor mismatch、anchor確立後failureはretryしない。
- **BR-KIMI-23:** retry attemptは新しいidentityとscratch namespaceを使うが、run-wide leaseは継続保持し、中間ledger行を作らない。

## Error precedence and persistence rules

- **BR-KIMI-24:** cleanup barrier成功時だけ最終execution outcomeをledgerへ1行appendできる。
- **BR-KIMI-25:** execution成功後のcleanup failureは外側`LiveRunError.kind=cleanup-barrier-failed`を返し、receiptをappendしない。
- **BR-KIMI-26:** executionとcleanupの二重失敗でも、外側のcanonical errorは常に`cleanup-barrier-failed`である。元execution outcomeは`originalOutcome`、cleanup詳細は`cleanup` payloadへ保持する。
- **BR-KIMI-27:** cleanup failureをexecution outcomeのsecondary overrideとしてledgerへ記録してはならない。cleanup未完了runにはdurable receipt自体を作らない。
- **BR-KIMI-28:** ledger write failureはcleanup済みreceiptを保持する`ledger-write-failed`とし、その後も`finally`でrun-wide leaseを解放する。
- **BR-KIMI-29:** unknown phase/code、欠落provenance、unbounded evidenceをparse時に拒否し、自由文へfallbackしない。

## Completion and migration rules

- **BR-KIMI-30:** direct completionにはKimi自身のcontract tests、adapter integration tests、local opt-in live green receiptが必要である。
- **BR-KIMI-31:** PASS receiptは1 runにつき1行で、adapter ID、CLI version、revision SHA、journey ID、timestampを必須とする。
- **BR-KIMI-32:** adapter移行後は旧Kimi live pathを正規実行面から除き、異なるgate、env、cleanupを持つ二重経路を残さない。

## Invariants and rejection examples

| Invariant | Reject example |
|---|---|
| deny before side effect | opt-inなしでcredential sourceまたはleaseへ触れる |
| one active run | 2つのKimi childが同processで同時にrunningになる |
| owner identity continuity | queue request IDと異なるIDでrun identityを作る |
| lease covers retry | attempt間でleaseを解放して別runを割り込ませる |
| lease release on all exits | cleanup failureでleaseを保持したまま返る |
| no credential copy | source credentialをscratchへ通常fileとして複製する |
| allowlist-only environment | `process.env`全体をchildへ展開する |
| cleanup dominates | 二重失敗をexecution outcomeとしてledgerへappendする |
| bounded timeout | journeyとBun testをともに600秒へ設定する |
| single canonical path | legacy driverとadapter journeyを両方残す |
