# Requirements — OTel Upstream 統合

上流入力（consumes 全数）: `intent-statement.md`、`scope-document.md`、`team-practices.md`、`business-overview.md`、`architecture.md`、`code-structure.md`（すべて参照済み）

設計の正本は GitHub Issue #1672（採用方針・失敗契約・移行設計・完了条件、レビュー済み）と Phase 別 sub-issue（#1673-#1678）。本書はそれらを検証可能な要件へ分解したもので、設計判断の重複記述は避け参照で済ませる。ID 体系は Q4-A（FR-<群>-<番号>／NFR-<番号>／VER-<番号>）。

## FR-EVT: Event Registry と失敗契約

| ID | 要件 | 対応（#1672） |
|---|---|---|
| FR-EVT-1 | 既存78 event 語彙（#1672「Event Registryとdrift guard」節のカウントに由来）を型付き Event Registry へ移し、state machine 参照集合・canonical Registry・AuditLogExporter 受理集合・Journal reader 理解集合の4集合を一致させる | Event Registry と drift guard |
| FR-EVT-2 | canonical Event は OTel EventRecord／Logs API から emit し、Amadeus Logger Provider が同期 `AuditLogExporter` へ即時 dispatch する。Span 終了を待たない | Signal の使い分け |
| FR-EVT-3 | canonical Event の書き込み失敗は同期例外として呼び出し側へ返し、同時に process-local fatal health latch を set する | 失敗契約 1-2 |
| FR-EVT-4 | すべての canonical state mutation entrypoint は処理前に latch を確認し、set 済みなら拒否する。中間層が例外を catch しても latch は解除しない。process 内で latch 解除しない | 失敗契約 3-4 |
| FR-EVT-5 | 新 process は Journal health 検証後にのみ mutation を許可する。検証方式は Phase 1 ADR で確定し、canonical Journal を汚す probe は禁止する | 失敗契約 5-6 |
| FR-EVT-6 | diagnostic Log／Span／Metric の失敗は fail-open（fatal latch を set しない、workflow を止めない） | 失敗契約・LocalSpanExporter |
| FR-EVT-7 | `recordException()` の exception Span Event は telemetry 扱い。canonical failure は別途 `amadeus.operation.failed` EventRecord を emit する | drift guard 節 |

## FR-JRN: Journal v2 と互換

| ID | 要件 | 対応 |
|---|---|---|
| FR-JRN-1 | Journal schema v2（schema version・event ID・clone-local sequence・timestamp・OTel event name・typed attributes・intent/space/clone identity・trace/span IDs・idempotency key・canonical marker）を定義する | AuditLogExporter 節 |
| FR-JRN-2 | reader は v1/v2 両 schema を読め、mixed-version shard を clone/worktree 横断で merge できる（reader-first: v2 writer より先に導入） | 移行方針 |
| FR-JRN-3 | Event emit 完了時に reader から当該 record を観測できる（同一 process 内同期 append、batch timer・OTLP flush なし） | AuditLogExporter 節 |
| FR-JRN-4 | doctor／recovery／presence／grant／merge／runtime graph／learnings が共通 reader 経由で v1/v2 Journal を読み、v1 reader 削除後も v2-only で動作する | Module 処置表・完了条件 |
| FR-JRN-5 | human-readable audit は v2 Journal から生成する View／pretty-print として提供する | Module 処置表 |

## FR-EXP: Provider と Local Exporters

| ID | 要件 | 対応 |
|---|---|---|
| FR-EXP-1 | `@opentelemetry/api` ファミリーの公開 Interface を使い、global へ Amadeus Provider（Tracer／Logger／Meter）を登録する | 採用方針 |
| FR-EXP-2 | AuditLogExporter は同一 process 内の同期 append を行うローカル Exporter で、ネットワーク通信・Collector 依存を持たない | AuditLogExporter 節 |
| FR-EXP-3 | LocalSpanExporter は Span 終了時に完成済み Span（IDs・name/kind・timestamps・status・attributes・events・links・resource・instrumentation scope）を machine-local JSONL へ同期保存する。保存失敗は fail-open | LocalSpanExporter 節 |
| FR-EXP-4 | LocalLogExporter は非 canonical diagnostic Log を diagnostic Log Store へ出力し、AuditLogExporter へ混入させない | Event Registry 節 |
| FR-EXP-5 | LocalMetricExporter は Counter／Histogram の限定 subset をローカル出力する（Observable callback・任意 aggregation は初期スコープ外） | Metrics API 節 |
| FR-EXP-6 | 標準 NodeSDK／BatchSpanProcessor／標準 OTLP Exporter を各短命 process へ導入しない | 採用方針・非目標 |

## FR-TRC: Trace と Context

| ID | 要件 | 対応 |
|---|---|---|
| FR-TRC-1 | 継続時間と親子関係を持つ operation（session/process・phase/stage・agent/tool/sensor・subprocess・gate wait）のみを Span にする | Trace API 節 |
| FR-TRC-2 | `startActiveSpan()` の callback は自動終了しないため、呼び出し側が `finally { span.end(); }` する契約をサンプル・実装で統一する | Trace API 節 |
| FR-TRC-3 | async／Promise 並行実行（await・Promise.all・timer・callback・例外境界）で Context が維持・分離される | 完了条件・必須検証 |
| FR-TRC-4 | Intent Trace Context を永続化／復元し、短命 process を remote parent へ接続する（長命 root Span を process memory に保持しない） | 目標 Trace 構造 |
| FR-TRC-5 | W3C Trace Context を子 process／subagent／hook へ伝播し、CLI・hook・subagent・sensor・子 process が同じ Trace へ接続される | Phase 3・完了条件 |
| FR-TRC-6 | Span 親子関係・Status・Exception・Event が実行時に確定する（事後推測を排する） | 背景・完了条件 |

## FR-MLM: Metrics と diagnostic Logs

| ID | 要件 | 対応 |
|---|---|---|
| FR-MLM-1 | Counter／Histogram subset の Metrics を Trace Context と相関させて出力する | Phase 5 |
| FR-MLM-2 | diagnostic Logs が LocalLogExporter へ保存され、Trace Context で相関できる | 完了条件 |

## FR-RLY: OTLP Relay

| ID | 要件 | 対応 |
|---|---|---|
| FR-RLY-1 | 旧 Projector から意味生成（Journal からの Span 再構築・時刻包含・ID 生成・timing event 合成）を削除し、Local Signal Store の読取・OTLP 変換/batch・cursor/idempotency・lock/retry/diagnostics・retention/rotation のみを維持する | OTLP Relay 節 |
| FR-RLY-2 | audit JSONL を Relay の Span 生成入力にしない。Relay が Span を推測・生成しない | OTLP Relay 節 |
| FR-RLY-3 | Collector への送信は best-effort で、Collector 停止中でも workflow 結果が変わらない | 耐性の維持 |

## FR-MIG: 移行と削除ゲート

| ID | 要件 | 対応 |
|---|---|---|
| FR-MIG-1 | 移行互換 Adapter（旧 `appendAuditEntry()` 呼出しを Event API へ委譲）は移行期間限定とし、恒久 dual-write/dual-read を行わない | 移行方針 |
| FR-MIG-2 | 約1600 call site を段階移行し、直接 call site ゼロ後に旧 writer を削除する。rollback は git revert と変換前 backup | 移行方針・実装順序 |
| FR-MIG-3 | audit CLI append verbs は互換 Adapter として一時維持し、公開互換方針を Phase 4 ADR で決定する | Module 処置表 |
| FR-MIG-4 | 削除ゲート: (a) v1/v2 mixed Journal で doctor/recovery/merge が通る、(b) 全 canonical event が registry 登録済み、(c) 直接 call site ゼロ、(d) **移行同等性証拠 — `[migration-equivalence]` マーカー付きテスト群(各移行 site の移行前後フィールド集合一致)+ registry スイープ検証を機械消費し、全 green かつ証拠ファイル数が下限以上**、(e) Relay が Journal から Span 生成していないことのテスト証明、(f) 全 harness の distribution drift guards 通過 — をすべて満たすまで旧実装を削除しない。〔改訂 2026-07-31 ユーザー裁定: (d) の旧定義「新旧 shadow 比較(store 件数突き合わせ)」は BR-1(dual-write 禁止)と構造的に両立不能((c) 充足で旧 store の書き手が消滅し恒久 UNKNOWN)と実測確定したため、移行同等性証拠へ再定義。承認系譜: scout 実測 → conductor 提案 → ユーザー承認「OK。そういう懸念がなければ推奨で」〕 | 削除ゲート |
| FR-MIG-5 | 旧 reader は既存 Intent の retention 条件達成後に削除する。〔適用範囲の確定 2026-07-31 ユーザー裁定: 「retention 条件 = 削除ゲート全条件 GREEN」(2026-07-31 裁定)は**旧 writer 削除のみに適用**。v1 reader は既存データ(実測 v1 行 90,567)保持期間中維持し、退役は v1→v2 一括変換器を前提とする別 intent(Issue #1819)へ委譲 — 今削除するとゲート条件 (a) 自体が FAIL に転じる自己矛盾を実測確認済み〕 | 移行方針 |

## FR-DST: 配布と redaction

| ID | 要件 | 対応 |
|---|---|---|
| FR-DST-1 | Bun-only 単一 bundle を維持し、依存（`@opentelemetry/api` 等）は bundle へ取り込む。追加理由を ADR に文書化する | TC-2・feasibility F-3 |
| FR-DST-2 | 正本（`packages/framework/core/`）変更後は package/promote で全 harness 生成面を再生成し、distribution drift guards を通す | TC-3 |
| FR-DST-3 | redaction policy を write-time と export 境界の二層で適用し、機微情報（prompt・argv・credential・無許可パス）を Signal Stores へ流さない | 新 Mandated（export-boundary-redaction）・完了条件 |
| FR-DST-4 | `command` 属性の safe-key 扱いを見直し、argv 由来値にトークン等が混入しないポリシーを定める | devsecops ギャップ (a) |
| FR-DST-5 | `redactionOptIn` は値スクラブ付きの限定キー許可とする | devsecops ギャップ (b) |

## NFR: 非機能要件

| ID | 要件 | 対応 |
|---|---|---|
| NFR-1 | canonical Event の sync append は現行 `appendAuditEntry` 同等を上回る回帰を持たない。数値予算（cold/warm）は Phase 1 実測後に ADR で確定し本書を更新する | feasibility F-4・Q2-A |
| NFR-2 | 短命 process が network flush を必要とせず即時終了しても audit Event・完成 Span が残る | 必須検証 |
| NFR-3 | Bun-only 単一 bundle が成立し、API singleton が bundle 内で一意 | #1678 合格条件 |
| NFR-4 | Relay の OTLP exporter は初期スコープでは auth header なしのローカル Collector 前提とし、認証が必要な場合は後続 Phase で拡張する | devsecops ギャップ (d)・Q3-A |

## VER: 検証要件（drift guard・テスト）

| ID | 要件 | 対応 |
|---|---|---|
| VER-1 | drift guard が全78語彙（#1672 由来のカウント、FR-EVT-1 と同一集合）を検証し、canonical Event の registry 未登録・telemetry 誤分類・required attributes 不足・writer-only/reader-only event・schema migration なしの version 変更を compile-time／unit test／sensor で拒否する | drift guard 節 |
| VER-2 | telemetry 成果物（audit JSONL・Span/Metric/Log Stores）が credential-free であることを検査するゲートを配線する | devsecops ギャップ (c) |
| VER-3 | 失敗契約のテスト先行（同期例外＋latch、例外を握りつぶす中間層、health probe の非破壊性、telemetry 失敗の fail-open、Collector 停止を別々に検証） | #1678 テスト先行順序・テスト移行表 |
| VER-4 | call-site guard が `appendAuditEntry()` 直接呼出しと旧 observe 利用を CI で拒否し、残存 call site を可視化する | テスト移行表 |
| VER-5 | ~~新旧 Trace の shadow 比較が機械可読 report を生成し、削除ゲート FR-MIG-4(d) へ接続する~~ **移行同等性証拠(`[migration-equivalence]` マーカー付きテスト群)が削除ゲート FR-MIG-4(d) へ機械接続される**〔改訂 2026-07-31 ユーザー裁定 — FR-MIG-4(d) の再定義に追随。shadow-compare 機構は診断用として存置可だがゲート非接続〕 | 段階状態 C・削除ゲート |
| VER-6 | 全 harness 生成面に Provider／Exporter／Relay が同期されることを distribution tests で検証する | テスト移行表 |

## Intent Analysis

ユーザーが達成しようとしていること: `intent-statement.md` のトリガーどおり「本来の意味での可観測性の獲得」。現行方式（#1628）が達成した耐久性・隔離を維持したまま、実行時に確定する因果・Context を獲得し、監査と可観測性の基盤を OTel API ファミリーに一本化すること。機能追加ではなく基盤の置換であり、成功指標は因果の正確性・基盤の単一化・耐性の維持の3点（＋Phase 1 実証）である。

## Constraints

- **hard gate（撤回条件）**: 本 initiative の go は「Phase 1 までの go」（approval-handoff AH-4）。Phase 1（#1678）が不合格 — Provider／Logs API／Bun Context／同期 I/O／bundle のいずれかが許容不能 — なら本番正本へ変更を波及させず撤回し #1628 方式へ戻す。恒久 dual upstream へ妥協しない
- 技術制約 TC-1〜TC-6（Bun-only・bundle 文書化・正本/生成面・後方互換・失敗契約・機微情報）、組織制約 OC-1〜OC-4（solo 決定者・期間制約なし・競合なし・1 Intent 方針）— `constraint-register.md` を正本とする

## Assumptions

- **仮説 A-1**: `@opentelemetry/context-async-hooks` が Bun で動作する（不成立時は Amadeus Adapter 実装へ切替、撤回条件ではない）
- **仮説 A-2**: OTel Logs API 採否はどちらの案でも walking skeleton で実装可能（両案とも許容不能なら撤回）
- **仮説 A-3**: bundle への依存取り込みで単一 bundle・API singleton が成立する
- **仮説 A-4**: 既製 Projector の縮退で Relay 機能（cursor・idempotency・retry）が再利用できる
（いずれも `raid-log.md` の Assumptions と同一。無効化条件は Phase 1 の検証で判定）

## Out of Scope

#1672 の非目標6件（scope-definition S-1 で確定）: Collector を状態機械の正本にすること／audit 出力をネットワークへ依存させること／Audit API と OTel API の恒久 dual-write／Node auto-instrumentation の初期導入／全関数の無差別 Span 化／初期段階での Metrics API 全機能（Observable callback・任意 aggregation）の自前実装。加えて NFR-4 どおり、OTLP exporter の認証（auth header）は初期スコープ外。

## Open Questions

- NFR-1 の数値予算（cold/warm レイテンシ、bundle size）— Phase 1 実測後に ADR で確定し本書を更新（Q2-A）
- FR-EVT-5 の Journal health 検証 protocol 具体方式 — Phase 1 ADR で確定（#1672 失敗契約 点6）
- FR-MIG-3 の audit CLI append verbs 公開互換方針 — Phase 4 ADR で決定
- FR-EXP-1 の Logs API 採否（`@opentelemetry/api-logs` 利用か最小 EventRecord Interface か）と version pin 方針 — Phase 1 ADR で確定

## トレーサビリティ

- 要件 → 設計: 各行の「対応」列が #1672 セクション・sub-issue・feasibility/decision を指す
- 要件 → Unit: units-generation で FR 群 → Unit（intent-backlog B-01〜B-11）へ写像
- 要件 → テスト: build-and-test で VER 群と FR の検証可能性を確認

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-29T07:04:17Z
- **Iteration:** 1
- **Scope decision:** none

NOT-READY: Step 10 mandatory sections missing (MAJOR); hard-gate withdrawal has no owning requirement; FR-RLY-2 shorthand '同'; '78 event' count unsourced (3 MINOR).

### Findings

- MAJOR requirements.md: stage-mandated sections missing (Intent analysis / Constraints / Assumptions / Out of scope / Open questions per Step 10) — add trailing sections restating the 6 non-goals and collecting deferred decisions
- MINOR requirements.md: success metric 'Phase 1 hard gate (withdrawal)' has no owning requirement — record the withdrawal gate in Constraints
- MINOR requirements.md FR-RLY-2: 対応 column uses positional shorthand '同' — write 'OTLP Relay 節' explicitly
- MINOR requirements.md FR-EVT-1/VER-1: '78 event 語彙' unverifiable against passed inputs — cite #1672 as the source of the count

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-29T07:08:40Z
- **Iteration:** 2
- **Scope decision:** none

READY: all 4 iteration-1 findings verified fixed; Step 10 sections present, withdrawal gate in Constraints, FR-RLY-2 reference explicit, 78-count sourced; iteration-1 passing criteria re-verified.

### Findings

- None
