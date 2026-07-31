# Logical Components — U11: otlp-relay

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

NFR 設計（performance/security/scalability/reliability 各 design）の決定がどの論理コンポーネントに適用されるかの対応表。旧 Projector（`tools/amadeus-otel-projector.ts`）を縮退させ `packages/framework/core/otel/relay.ts` へ責務移譲する（tech-stack-decisions.md § 配置）。

## コンポーネント目録

| コンポーネント | 責務 | 適用される NFR 設計 | 故障領域（blast radius） |
|---|---|---|---|
| `flushSignals(options)`（relay.ts の唯一の公開 Interface） | Store 読取 → OTLP 変換 → best-effort 送信 → cursor 前進 → `RelayResult` 返却 | performance-design（bounded time）、reliability-design（workflow 結果不変性） | flush 全体の失敗は diagnostics 記録のみ。workflow 結果・canonical 経路に波及しない |
| Store 読取（cursor＋batchSize） | cursor 以降の record を上限付きで読取 | scalability-design（bounded 処理）、performance-design（batch 読取） | 読取失敗は当該 flush の失敗として診断化 |
| OTLP 変換 | Store record の写像のみ（意味生成なし） | reliability-design（意味生成の排除）、security-design（送信内容の限定） | 変換不良は当該 batch の失敗に限定。Journal を読む経路なし |
| 送信（OTLP/HTTP JSON 自前組立て＋`fetch` POST） | ローカル Collector への best-effort 送信、`AbortSignal.timeout` 適用 | security-design（接続先限定・auth header なし）、performance-design（bounded time） | 送信失敗・timeout は次回 retry 対象。exit は成功 |
| cursor／idempotency 記録 | 成功 batch のみ cursor 前進、再送重複の検出・追跡 | reliability-design（送信ロスなし）、scalability-design（重複許容） | cursor 不整合は重複送信に留まり record 損失にならない（at-least-once） |
| lock/retry 機構（旧 Projector 維持） | 並行 flush の抑止 | scalability-design（並行抑止）、performance-design（lock 即時終了） | lock 取得失敗は即時終了。待機・強制取得なし |
| retention/rotation | 送信済み期限超過 record の除去・Store 分割 | scalability-design（Store 収束）、reliability-design（非消失） | cursor 未通過分を巻き込まないことを fixture で固定 |
| shadow 比較ハーネス | 新旧 Trace の機械可読 report 生成と撤収 | reliability-design（撤収条件） | report は U8 ゲートの入力。撤収後は比較基盤を残さない |

## コンポーネント境界と分離方針

- Relay は Store から Collector への転送と周辺管理のみを担い、新たな意味生成を行わない（business-logic-model.md 冒頭、FR-RLY-1）
- audit JSONL は入力に含めず、canonical 経路に介在しない（FR-RLY-2、BR-6）。これが blast radius を telemetry 転送に閉じ込める構造的根拠
- `packages/framework/core/` 変更のため FR-DST-2 を適用: manifest マッピングへ `otel/relay.ts` を登録し、`bun scripts/package.ts` で全 7 harness 生成面を再生成、`package.ts --check`／`promote:self:check` を通過する（VER-6）
- 既存 Projector の lock/retry/cursor 機構の再利用可否は A-4 仮説として Phase 1 で判定する（requirements.md Assumptions）
