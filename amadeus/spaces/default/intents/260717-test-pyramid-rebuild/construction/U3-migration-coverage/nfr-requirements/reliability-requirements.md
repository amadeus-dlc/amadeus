上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

本 NFR は codekb `technology-stack.md` の TypeScript/ESM・Bun と既存の決定的分類器を前提とし、`business-logic-model.md`・`business-rules.md`・`requirements.md` の計画を再現性、故障時挙動、状態の意味論として具体化する。

# 信頼性要件 — U3 移設選定台帳と層別カバレッジ整合計画

## REL-1: 同一入力から同一台帳を再現する

同一 measurement ref の同一 `SizeLedger` と同一 versioned `CandidateEvidence` に対し、ホスト、時刻、列挙順、LLM 判断に依存せず、同じ排他的バケット、final state、queue、rank、`ledgerKeys[]` を返すことを要求する。エビデンス収集者の判断そのものを決定的と主張せず、記録済み disposition から final state への写像だけを純粋な決定表にする。

`CandidateEvidence` は各 emitted signal をちょうど1件の `SignalEvidence` で覆う。disposition は `seam-removable | behavior-essential | lexical-false-positive | unknown` に閉じ、根拠 locator は同じ observed ref の repository 相対位置を指す。欠落・重複・ref 不一致は入力 failure、unknown/lexical false positive は `classification-review` とする。

現行 measurement ref `3917a283a953165866170d235d3dc25ad2fd3643` では次の不変条件を満たす。

- `tests/` 全域再帰 = 442件。
- unit 非 small = 163件。
- 排他的バケット = filesystem のみ 62 + filesystem/timer 1 + spawn のみ 9 + filesystem/spawn 90 + network のみ 1 = 163。
- signal 出現数 FS 153 / spawn 99 / network 1 / timer 1 は重複集計であり、母数と等しいことを要求しない。
- 1つの候補 file は final state をちょうど1つだけ持つ。
- `reviewQueue` は file 昇順、`migrationQueue` は `(rank, file)` 昇順で、rank は seam=0 / retier=1 だけを許す。

## REL-2: 入力不正と未判定を fail-closed にする

- 欠落 file、重複 file、未知 `TestSize`、未知 signal、壊れた measurement ref、参照不能な根拠がある場合、完全な計画として成功させない。
- filesystem + spawn など複数 signal の候補は signal 優先順位だけで分類しない。
- 根拠を確認しても一意に閉じない候補、`unknown`、lexical false positive は `classification-review` とし、移設可能な確定候補へ数えない。
- `seam-to-small` は全 non-small signal を seam 化で除去できる根拠、`retier-to-integration` は本質的 spawn/timer、`retier-to-e2e` は真の network の根拠を必須とする。
- 後続で実移設・classifier/source 修正を行った場合は `classifyTestSize` を再実行し、期待した size/tier になった実測が得られるまで閉包扱いにしない。

一部候補の失敗を空配列や zero-candidate の成功へ縮退させない。既存 declared-vs-measured gate や coverage gate を迂回する fallback も追加しない。

## REL-3: coverage 状態を相互代用しない

coverage 経路は path 存在状態と CI 参加状態を直交する2軸として分離する。

| 対象 | path 存在状態 | CI 参加状態 | 根拠 |
| --- | --- | --- | --- |
| combined coverage 観測 | EXISTING (`coverage/lcov.info`) | EXECUTED | `coverage:ci` が smoke・unit・integration を結合 |
| unit binding | PENDING | EXECUTED | per-tier path は未実装、`--ci` は unit を実行 |
| integration binding | PENDING | EXECUTED | per-tier path は未実装、`--ci` は integration を実行 |
| smoke binding | PENDING | EXECUTED | per-tier path は未実装、`--ci` は smoke を実行 |
| e2e binding | PENDING | NOT EXECUTED | per-tier path は未実装、`--ci` は e2e を選択しない |
| harness/lib 補助 tier 観測 | N/A | N/A | 台帳では可視だが binding も標準 runner 契約もない |

PENDING を既存 path、N/A、PASS のいずれにも読み替えない。閉鎖済み Issue #683 の完了範囲も変更しない。follow-up の起票自体は本パイロット外である。

## REL-4: 最小の観測・監査情報を保持する

再実行差分を追跡するため、measurement ref、総行数、unit 非 small 数、排他的バケット件数、候補ごとの versioned evidence・final state・queue/rank、`ledgerKeys[]`、path 存在状態、CI 参加状態を保持する。ソース全文、絶対パス、シークレットは保持しない。

本 unit は常駐サービスも本番 request path も持たないため、常時 monitoring、alerting、分散 tracing は N/A とする。logging は既存の markdown/audit による決定・再測定記録へ限定し、新しい監視基盤、ログ転送、通知経路を追加しない。

常駐サービス、利用者 request、永続データが存在しないため、可用性 SLA/SLO、RTO、RPO、バックアップ、multi-AZ、retry、circuit breaker は N/A である。単発処理の成功や timeout を service availability の達成実績へ昇格させない。
