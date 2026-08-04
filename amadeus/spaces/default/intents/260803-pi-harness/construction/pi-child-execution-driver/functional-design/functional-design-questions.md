# pi-child-execution-driver — Functional Design Questions

## 質問判定

質問は0件である。Issue #2130、承認済み`requirements`、`unit-of-work`、`unit-of-work-story-map`、`components`、`component-methods`、`services`により、次が既決である。

- support / reviewer / constructionは共通driverを使う。
- 子processは`pi --mode rpc --no-session`で起動する。
- identityはspawn前に確定し、RPC handshake後にPi session identityを相関する。
- native acceptanceとterminal factだけをdriverが所有し、pool、dependency、retry admissionはcoreが所有する。
- timeout/cancelではbounded shutdown、kill、reapを行い、failureをsuccessへ変換しない。
- provider secret、prompt本文、home絶対pathをauditへ出さない。

ユーザーの訂正に従い、Issueに記載済みの選択を再質問しない。Pi 0.83.0の公開RPC文書とローカル型定義を確認した結果、LF区切りJSONL、`get_state.sessionId`、`prompt`受付response、`agent_settled`終端が設計に必要な公開surfaceとして存在する。未解決の矛盾・抜け漏れは0件である。

## 解決済み設計判断

| 論点 | 採用判断 |
|---|---|
| RPC client | Pi packageをruntime dependencyにせず、公開JSONL protocolに対する小さなanti-corruption layerをharness overlayへ実装 |
| Handshake | process受理後にcorrelation ID付き`get_state`を送り、成功responseの`sessionId`を記録 |
| Completion | `prompt` responseは受付のみ。`agent_settled`を受けるまで成功にしない |
| Shutdown | 正常settle後はSIGTERMで終了し、期限内にreapできなければfailure。cancel/timeoutはRPC `abort`を先行し、SIGTERM→SIGKILLへescalate |
| Semantic success | driverの`succeeded`はnative attempt完了を意味する。成果物の正しさは既存convergence checkが判定 |
| Race | terminal arbiterが最初に受理したcancel / deadline / failure / settled causeを一度だけ固定 |
| Idempotency | 公開requestへfieldを増やさず、parent/execution/child identityからversion付きdelivery keyを導出。内容差分は別のcanonical fingerprintで検出 |
| Wire profile | wire frame自体にversion fieldはない。doctor/driver共通selectorがmacOS/LinuxのPi `>=0.83.0`を`pi-rpc/0.83+` profileへ束縛 |
| Audit failure | 公開`PiChildResult`へreceiptを追加しない。successだけは内部terminal receipt必須、commit failureはuncommittedな`failed`を返す |
| Process containment | macOS/Linuxでdetached process groupを作り、PGID全体へsignal、leader reapとgroup消滅の両方を確認 |

## 上流トレーサビリティ

`unit-of-work`のdriver ownership、`unit-of-work-story-map`のSCN-005/006、`requirements`のFR-SUB-001〜005とNFR-SCL-001、`components`の`PiSubagentDriver`、`component-methods`の`spawnPiChild`契約、`services`のChild Pi RPC Process lifecycleを用いた。
