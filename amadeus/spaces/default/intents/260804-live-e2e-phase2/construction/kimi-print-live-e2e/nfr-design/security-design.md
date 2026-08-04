# Security Design — kimi-print-live-e2e

## 設計根拠と適用範囲

本設計は [Functional Design の責務分離](../functional-design/business-logic-model.md#L7)、[phase algorithm](../functional-design/business-logic-model.md#L33)、[error/ledger projection](../functional-design/business-logic-model.md#L49)、[serial lease contract](../functional-design/business-logic-model.md#L60) を具体化する。NFR Requirements と tech-stack-decisions は active scope で意図的に SKIP されているため再作成しない。

新しい AWS resource、network service、database は追加しない。保護対象は source credential/config、scratch home/project、child environment、Kimi process、bounded evidence、durable receipt である。

## 信頼境界と制御

| 境界 | Control | Fail-closed 条件 |
|---|---|---|
| CI/parent env → gate | `GITHUB_ACTIONS=true` を最優先 deny、次に `AMADEUS_KIMI_PRINT_LIVE=1` を厳密比較 | deny 時に lease、source access、scratch、binding、spawn、ledger が0回でない |
| Source credential → run binding | source は opaque・non-owned、scratch 内の短命 symlink/binding のみ作成 | copy、source path/secret の child・diagnostic・ledger 出力 |
| Parent env → Kimi child | capability allowlist から新規 env を構築 | ambient sensitive key や raw credential の継承 |
| Scheduler → run | preflight 後に副作用なし `LiveRunRequestIdentity` を発行し、queue/owner/runへ同一IDを継承 | non-owner/double release、active lease 複数 |
| Kimi stdout/stderr → evidence | 各4,096 UTF-8 bytesでcode-point境界truncate後、`sanitizeText(..., 512)` | raw prompt/output、secret、source path の永続化 |
| Process → cleanup | childと全owned descendantのterminate/reap、binding/home/project逆順close | closure不明、期限超過、resource残存 |
| Cleanup → ledger | `ClosedCleanup` の最終attemptだけ1行append | cleanup failure のPASS/non-PASS receipt化 |

## 実行と resource ownership

preflight は binary、version、distribution、credential source の存在だけを副作用なしで確認する。ready 後、`LiveRunRequestIdentity` を FIFO queue の owner token として登録し、exclusive lease 取得後に同じ request ID を持つ `KimiRunIdentity` を構築する。scratch project、`KIMI_CODE_HOME`、credential binding、child process は作成前に planned、成功後に created として resource registry に登録する。

child には scratch cwd、`kimi -p`、allowlisted env、AbortSignal だけを渡す。journey timeout は600,000ms、包含 Bun test timeout は cleanup 余裕を含む660,000ms以上とし、queue待機中は journey timer を開始しない。

## 証拠・secret・cleanup

- stdout/stderr は transport port 内で各4,096 UTF-8 bytesに制限し、文字境界を壊さず切り詰めてから512文字の共通 sanitizer を通す。
- receipt は redacted diagnostic の SHA-256 digest、exit、deterministic anchor、run/attempt identity だけを持つ。raw prompt/output、credential、source path は保持しない。
- credential source は変更・削除せず、短命 binding だけを cleanup barrier の所有対象にする。
- cleanup は process boundary termination、全owned descendant reap、binding、home、project の逆順・冪等 close を行う。
- cleanup failure は execution の成否より優先して外側 `cleanup-barrier-failed` とし、`originalOutcome` と cleanup receipt を error payload に保持する。ledger と green projection は0件にする。

## Retry と直列化

retry は `childCreated=false` かつ OS error code が厳密に `EAGAIN` の `kimi-startup-capacity`、attempt 1、anchor 前、全attempt resource closed の積でのみ1回許可する。retry 間は同じ run-wide lease を保持し、新 attempt identity を発行する。中間attemptはledgerへ書かない。

lease は `finally` で1回だけ解放する。owner request ID の一致を要求し、非owner release、二重release、自動stealを拒否する。ledger failure、cleanup failure、例外を含む全終了経路で次のFIFO waiterを進行可能にする。

## 検証

contract/failure-injection test は、gate denyの副作用0、source credential非コピー、ambient env漏洩拒否、UTF-8境界truncateとsanitize、2 runのFIFO/active lease最大1、非owner/double release拒否、retry中の割込み0、`EAGAIN`以外のretry 0、timeout、partial prepare、descendant残存、execution+cleanup二重失敗、ledger failure後のlease解放、600,000ms/660,000msの非衝突を固定する。production codeにfixture専用分岐は置かず、fake scheduler/spawn/resource portはテスト側だけに置く。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T14:21:54Z
- **Iteration:** 1
- **Scope decision:** none

Kimi Print の NFR 設計は実装可能な粒度に達しています。明示的 opt-in、資格情報を所有しない symlink 境界、環境変数 allowlist、FIFO lease と request ID の連続性、出力上限とサニタイズ、プロセス終端確認、cleanup barrier、cleanup 失敗時に証跡台帳を生成しない規則が、論理コンポーネントと失敗時の責務分離に一貫して反映されています。提示された成果物内に循環依存、解決不能な相互参照、またはセキュリティ・データ安全性を損なう具体的な欠陥は確認されませんでした。

### Findings

- None
