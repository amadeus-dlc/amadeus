# pi-lifecycle-gate-adapter — Functional Design Questions

## 質問判定

質問は0件である。Issue #2130と承認済み`requirements`、`unit-of-work`、`unit-of-work-story-map`、`components`、`component-methods`、`services`により、次が既決である。

- human presenceは`input.source = interactive`だけからmintし、`rpc`と`extension`は除外する。
- `agent_end`は観測だけに使い、continuationは`agent_settled`後だけ高々1回要求する。
- session、tool、compaction eventを既存core hook/state/audit契約へ写像する。
- 必須能力の欠落・bridge失敗はworkflow-changing operationをfail-closedにし、status/doctorはread-onlyで残す。
- Pi固有event型はharness overlayに閉じ、private APIへ依存しない。

ユーザーの訂正に従い、Issueに記載済みの選択を再質問しない。Pi 0.83.0の公開型で`session_start` / `session_shutdown`、`input.source`、`agent_end` / `agent_settled`、tool execution、manual/threshold/overflow compaction、read-only session ID/leaf IDが確認できた。矛盾・抜け漏れは0件である。

## 解決済み設計判断

| 論点 | 採用判断 |
|---|---|
| Input idempotency | Pi session ID、受理前leaf ID、source、streaming behavior、本文/image digestからdelivery keyを導出。生本文は永続化しない |
| Run identity | 最初の`agent_start`でdurable cycleを開き、retry/compaction中の複数`agent_end`でも`agent_settled`まで同じcycleを維持 |
| Continuation | coreで一度だけprepareしたoutboxをPi custom messageとして配送し、delivery tokenをsession entryと照合してcrash境界を回復 |
| Tool bridge | `tool_call`をpre-use guard、`tool_execution_start/end`を実行事実として扱い、`tool_result`との二重dispatchを避ける |
| Compaction | before eventでcheckpointを永続化できなければcancel。after eventではsummaryを信頼せずactive intent/stateからmissionを再構築 |
| Failure containment | write-ahead bridge journalとdurable health latchを使い、mandatory failure後は新しいinput/tool/continuationをblock。read-only commandは別port |
| Registration | 全handlerは閉じたregistration gateの背後へ登録し、全登録成功後だけ一括open。partial registrationはmutation不能 |

## 上流トレーサビリティ

`unit-of-work`のextension ownership、`unit-of-work-story-map`のSCN-003/004、`requirements`のFR-LIF-001〜006・FR-GAT-001〜004、`components`の`PiLifecycleExtension` / `PiPresenceContinuationBridge`、`component-methods`の登録・input・settled契約、`services`の短命Extension Runtimeを用いた。
