# Business Logic Model — U11: otlp-relay

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

本 Unit は旧 Projector（`tools/amadeus-otel-projector.ts`）を縮退させ、`otel/relay.ts` へ責務移譲する。唯一の公開 Interface は `flushSignals(options: { since?: Cursor; batchSize?: number }): Promise<RelayResult>`（component-methods.md § relay.ts）。新たな意味生成は行わず、Store から Collector への転送と周辺管理のみを担う。

## flush 処理シーケンス（FR-RLY-1/2/3）

1. session-end trigger（services.md の Relay flush 実行単位）から CLI エントリ経由で `flushSignals()` を起動する。workflow 本体の状態遷移には介在しない
2. 送信対象の Local Signal Store（Span／Metric／Log）を確定し、Store ごとに cursor 以降の record を `batchSize` 上限で読み取る。audit JSONL は入力に含めない（FR-RLY-2）
3. 読み取った record を OTLP payload へ変換する。変換は Store record の写像のみで、Span の推測・合成・時刻包含・ID 生成・timing event 合成は一切行わない（FR-RLY-1）
4. ローカル Collector（auth header なし、NFR-4）へ best-effort 送信する。送信失敗は例外で伝播させず、diagnostics へ記録して次処理へ進む
5. 送信成功した batch のみ cursor を前進させ、idempotency 記録を更新する。失敗 batch は cursor を戻さず次回 retry 対象とする
6. `RelayResult`（sent・skipped・cursorAdvanced・diagnostics（domain-entities.md の RelayResult 定義と同一形状））を返して終了する

## 失敗・retry 振る舞い（FR-RLY-3）

1. Collector 停止・到達不能は失敗扱いにしない。`RelayResult` の診断に残し、exit は成功として workflow 結果を変えない
2. 部分的な送信失敗は batch 単位で分離し、成功分のみ cursor を進める。未送信分は次回 flush で再送され、idempotency 記録により Collector 側の重複を許容設計とする
3. lock は旧 Projector 由来の lock/retry 機構を維持し、並行 flush を防ぐ。lock 取得失敗時は即時終了（diagnostics 記録のみ）

## retention／rotation フロー（FR-RLY-1）

1. 送信済み record の retention 期限を判定し、期限超過分を Store から除去する
2. rotation は Store ファイルのサイズ・期間条件で行い、未送信 record を巻き込まない（cursor 未通過分は保持）

## shadow 比較の生成と撤収（VER-5）

1. 移行期間中、新旧 Trace を shadow 比較し、機械可読 report（event count・linkage・status・許可属性の比較結果と差分の説明）を生成する
2. report は削除ゲート FR-MIG-4(d) の入力として U8 のゲート評価へ接続する。未説明差分がある間は撤収しない
3. U7 の移行期間に実施し、同等以上が確認された後に shadow 比較ハーネスを撤収する（unit-of-work.md U11 責務）。撤収後は比較基盤を残さない

## 検証フロー

1. Collector 停止時に flush が成功 exit で終わり workflow 結果が変わらないことをテストで固定する（VER-3 の Collector 停止検証と整合）
2. Relay が Journal から Span を生成していないことのテスト証明を用意する（FR-MIG-4(e) の入力。FR-RLY-2）
3. cursor 前進・部分失敗 retry・idempotency を fixture 差替えで検証し、同一コミット red-green とする

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T08:42:16Z
- **Iteration:** 1
- **Scope decision:** none

NOT-READY: coverage/API/contracts/topology pass; three MINOR cross-reference/shape mismatches.

### Findings

- MINOR domain-entities.md Cursor.position cites (BR-5) but cursor-advance rule is BR-7 — change to (BR-7)
- MINOR domain-entities.md IdempotencyRecord cites (BR-7) and says duplicates eliminated; BR-8 tolerates duplicates — cite (BR-8) and reword to duplicate detection/tracking without elimination guarantee
- MINOR business-logic-model.md flush step 6 describes RelayResult with final cursor; entity defines cursorAdvanced boolean — align the two

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T08:48:03Z
- **Iteration:** 2
- **Scope decision:** none

READY: all three iteration-1 findings verified fixed (Cursor.position→BR-7; IdempotencyRecord→BR-8 detection/tracking wording; RelayResult shape aligned); passing criteria hold.

### Findings

- None
