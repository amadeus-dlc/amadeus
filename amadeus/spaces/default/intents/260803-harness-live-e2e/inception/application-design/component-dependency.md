# Component Dependency — ハーネス横断 live E2E

入力参照: `requirements`、`architecture`、`component-inventory`、`team-practices`。`stories`は未生成であり、依存関係はFR-1〜FR-11と`components` C1〜C9から導出する。

## Dependency Matrix

`→`は行componentが列componentへ依存することを示す。

| From / To | C1 Contract | C2 Policy | C3 Adapter Port | C4 Lifecycle | C5 Adapters | C6 Journeys | C7 Registry | C8 Ledger | C9 Projector |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C1 Contract | — |  |  |  |  |  |  |  |  |
| C2 Policy | → | — |  |  |  |  |  |  |  |
| C3 Adapter Port | → |  | — |  |  |  |  |  |  |
| C4 Lifecycle | → | → | → | — |  |  | → | → |  |
| C5 Adapters | → |  | → |  | — |  |  |  |  |
| C6 Journeys | → |  | → | → | → | — |  |  |  |
| C7 Registry | → |  |  |  |  |  | — |  |  |
| C8 Ledger | → |  |  |  |  |  | → | — |  |
| C9 Projector | → |  |  |  |  |  | → | → | — |

循環はない。C1はleaf、C4がruntime orchestrationの中心、C9がread-only projectionの終端である。C5 adapterはC2 Policyへ依存せず、共通gateを再実装できない構造にする。

## Data Flow

### Runtime flow

1. C6がadapter ID、prompt、anchor、timeoutをC4へ渡す。
2. C4がC7からcapabilityを解決し、C2でGHA/opt-inを判定する。
3. 許可時だけC4がC5をC3 port経由で呼ぶ。
4. C5が外部substrate結果を`AdapterExecution`へ正規化する。
5. C6がscratch削除前にanchor assertionを完了し、C4がprimary execution/assertion outcomeを保持する。
6. C4がreap、scan-before-delete、scratch削除、post-delete不存在、credential destroy、matcher zeroizeを順に完了してcleanup barrierを閉じる。失敗時はC8を呼ばずhard errorにする。
7. barrier成功後にC1 `LiveOutcome`とsanitized receiptを確定してC8へ追記し、append成功または同一receiptのalready-present後だけclosure committedとしてPASS、supported更新、materialization、C9投影を解放する。

### Projection flow

1. C9がC7の静的capabilityとC8のappend-only run factを読む。
2. adapterごとの最新successを選び、SHA/date/versionをmatrixへ投影する。
3. current generated blockと一致しなければdrift checkを赤にする。

## Shared Resources

| Resource | Writer | Reader | Rule |
|---|---|---|---|
| TypeScript capability registry | developer via reviewed code change | C2/C4/C8/C9/tests | 単一正本、runtime mutationなし |
| JSONL run ledger | C4/C8の明示record command | C9/tests | append-only、live直列、既存行rewrite禁止、owner-stamped lock |
| ledger lock dir / owner stamp | C8 | C8 recovery/tests | ledger専用identity、owner一致release、dead/unstampedだけCAS回収、live/unknownはfail-closed |
| generated Markdown block | C9だけ | developer/docs/CI | 手編集禁止、drift check |
| scratch project/home | C4 creates、C5 uses、C4/C5 cleanup | active journeyだけ | source tree外、credential強制削除 |
| external credential | C5 reads/injects | external harnessだけ | C8/C9/evidenceへ非流出 |

## Blast Radius and Failure Containment

| Failure | Containment | Downstream effect |
|---|---|---|
| policy bug | C2 contract tests | 全adapter起動安全へ影響するためPhase 1最優先 |
| adapter bug | 対象C5 adapter | 他adapterのpolicy/lifecycleは不変 |
| external timeout | 1 journeyのAbortSignal | 他journeyを自動retryしない |
| cleanup/leak failure | scan-before-delete後に対象scratchとcredentialを除去 | C8未記録の`cleanup-barrier-failed`、PASS/supported/materialize禁止 |
| malformed ledger | C8 parser fail-closed | 追記とmatrix更新を停止、既存docsをsilent更新しない |
| ledger append途中失敗 | lock + sibling temp + fsync + atomic rename | final pathへ部分行を出さず、runnerへtyped error。同一receipt IDで冪等回復 |
| ledger writer process kill | owner stamp + exit net + stale reaper | dead PID/old unstampedだけreap mutex下でCAS回収。live/unknown/token不一致は明示回復まで停止 |
| projector drift | C9 check | deterministic CIだけ赤、live processは起動しない |

## Implementation Order

1. C1 Contractをclosed typesとcontract testsで固定する。
2. C1だけへ依存するC2 Policy、C3 Adapter Port、C7 Registryを、それぞれnegative testから独立に実装する。
3. C1/C7へ依存するC8 Ledgerを、malformed input、部分write、応答喪失、同一ID retry、通常throw、process exit、owner SIGKILL、stamp前SIGKILL、PID再利用、二重reaper、manual token mismatchのRed→Greenで実装する。
4. C1/C2/C3/C7/C8へ依存するC4 Lifecycleをfake C5 adapterで実装し、prepare途中・execute/assert throw・timeout・abort時のcleanup/leakとledger failureを検証する。
5. C1/C3へ依存する実C5 `codex-exec` adapterを接続する。
6. C1/C3/C4/C5へ依存するC6 Codex journeyを接続し、既存挙動をcharacterize/維持する。
7. C1/C7/C8へ依存するC9 Projectorを実装し、Markdown drift checkをgreenにする。
8. 残るC5 adapterと対応するC6 journeyをClaude headless→Claude SDK/TUI→Kimi→Kiroの順で縦スライス実装し、各sliceをRed→Greenにする。Cursor/OpenCodeはcapability spike成立時だけ同じC5+C6 sliceを追加し、不成立なら実測付き後続Issueで閉じる。

この順序は依存行列の全C1〜C9を一度ずつ含むトポロジカル順序である。同一段の独立componentは並行可能だが、各縦スライス内ではTDD Red→GreenとPhase 1→2→3の安全境界を維持する。
