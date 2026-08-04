# Security Design — kiro-acp-live-e2e

## 設計根拠と適用範囲

本設計は [Functional Design](../functional-design/business-logic-model.md#L7) の責務分離、[実行順序](../functional-design/business-logic-model.md#L11)、[raw frame の非永続化](../functional-design/business-logic-model.md#L42)、[strong process containment](../functional-design/business-logic-model.md#L62) を具体化する。NFR Requirements と tech-stack-decisions は active scope で意図的に SKIP されているため再作成しない。

新しい network service、AWS resource、cloud secret store は追加しない。保護対象はローカル credential/config、ACP の JSON-RPC frame、scratch、child process、durable receipt である。

## 信頼境界と脅威

| 境界 | 信頼する入力 | 拒否する状態 | 制御 |
|---|---|---|---|
| Parent process → policy gate | capability registry と exact opt-in | GitHub Actions、暗黙 opt-in | GHA deny を最初に評価し、deny 時は副作用 0 |
| Source auth/config → run binding | source の存在と限定された binding 計画 | source path/secret の出力、source 所有権の移動 | source は opaque・non-owned、run-private binding のみ cleanup 対象 |
| Parent env → ACP child | allowlist 宣言済み値 | ambient `process.env` 展開 | scratch home/project と allowlisted env を新規構築 |
| ACP stdio → validated message | incremental decoder が生成した JSON-RPC message | malformed JSON、unknown method、ID mismatch、duplicate terminal response | parse-don't-validate、request namespace と terminal 一意性 |
| Structured message → assertion | 相関済み tool result schema | モデル自然文、別 request の result | tool ID・request ID・schema verdict を積として検証 |
| ACP process → host OS | strong containment boundary の member | PID 単独、detached process group、離脱 descendant | pre-exec attachment、non-escapable membership、stable identity |
| Run memory → durable ledger | cleanup closed 後の canonical receipt | raw prompt/response、credential、source path、cleanup failure receipt | digest と bounded diagnostic のみを1行 append |

## 実行前のセキュリティ制御

1. `LivePolicyGate` は exact opt-in より前に GitHub Actions deny を評価する。deny の場合、probe、scratch、binding、spawn、ledger を一度も呼ばない。
2. `AcpPreflight` は binary/version、entrypoint、safe binding、JSON-RPC readiness と `ProcessContainmentPort` capability を秘密値なしで判定する。
3. direct eligibility は「safe binding」「request correlation」「structured anchor」「strong containment」の全証拠が揃う場合だけ成立する。不明・未測定・Darwin の通常 process group は follow-up に倒す。
4. resource は作成前に planned 登録し、成功後だけ created に遷移する。部分作成でも cleanup barrier が必ず所有できる。

## JSON-RPC と証拠の完全性

- decoder は frame size と message shape を bounded に検査し、parse 成功後の型だけを correlator へ渡す。
- `RequestCorrelator` は run/attempt ごとの namespace、一意 request ID、method、terminal response を所有する。response ID mismatch と二重 terminal は protocol failure であり retry しない。
- `StructuredAnchorVerifier` は相関済み tool name、tool result schema、exit/status を検証する。自然文一致や別 transport の receipt は証拠にしない。
- durable receipt は request ID digest、method/tool ID、schema verdict、exit、bounded sanitised diagnostic のみを保持する。raw JSON-RPC transcript は保存しない。
- bounded diagnostic は credential、source config path、prompt、raw response を redact した後に長さ制限を適用する。

## 強い process containment と cleanup

`ProcessContainmentPort.establish(runId, attemptId)` は ACP code の実行前に境界を確立し、その境界経由でのみ root process を起動する。closure は次の2証明の積である。

1. `BoundaryEmptyProof`: OS primitive 自身が member 0 を示す。
2. `DirectChildReapReceipt`: runner が所有する直接子と adopted waitable child の終了 status を stable identity 付きで全件回収する。

cancel acknowledgement は closure 証明ではない。timeout/abort 時は ACP cancel、短い grace、境界全体 TERM/KILL、empty 確認、owned-child wait、session/binding/scratch close の順で進める。いずれかが不明・失敗・期限超過なら外側 Result を `cleanup-barrier-failed` に固定し、`originalOutcome` を error payload に保持して ledger へ append しない。

| Platform | direct 条件 | 安全な不成立時 |
|---|---|---|
| Linux | pre-exec cgroup v2 加入、非離脱、boundary-wide kill、member 0、owned wait 完了を failure injection で実測 | follow-up |
| Windows | suspended create→Job Object assign→resume、kill-on-close、active count 0、owned wait 完了を実測 | follow-up |
| Darwin/macOS | 上記と同等の強い supervisor port を実装・実測 | 通常 process group は非適格として follow-up |
| Unknown | direct 不可 | follow-up |

## Failure projection と検証

| Failure | Retry | Durable projection |
|---|---:|---|
| anchor 前の明示 transient、attempt 1、cleanup closed | 1 | 新 identity の attempt 2 |
| protocol/schema/ID violation | 0 | non-PASS receipt |
| timeout/abort、cleanup closed | 0 | timeout/abort receipt |
| execution 成否を問わず cleanup failure | 0 | `cleanup-barrier-failed`、ledger なし |
| strong containment 非対応 | 0 | sanitized follow-up evidence |

必須テストは、GHA deny の副作用 0、ambient env 漏洩拒否、malformed/unknown/ID mismatch/duplicate terminal、raw frame 非永続化、離脱 descendant、PID 再利用、boundary empty 後 zombie 残存、cancel failure、cleanup 二重失敗、Darwin 非適格判定を含む。PASS は adapter contract、ACP integration、failure injection、opt-in local live の全 green と ACP 自身の receipt が揃う場合だけ許可する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T14:20:59Z
- **Iteration:** 1
- **Scope decision:** none

ACP ライブ E2E の境界、事前条件、JSON-RPC 相関、証拠化、強いプロセス封じ込め、子プロセス回収、クリーンアップ障害時の台帳非生成まで一貫して定義されている。論理コンポーネントの責務と失敗時の伝播も Functional Design と整合し、実装者が追加の設計判断を要する未解決事項はない。

### Findings

- None
