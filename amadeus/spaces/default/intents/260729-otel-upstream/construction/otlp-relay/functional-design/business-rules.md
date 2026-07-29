# Business Rules — U11: otlp-relay

上流入力（consumes 全数）: unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md（すべて参照済み）

## 不変条件

- BR-1: Relay は Local Signal Store のみを入力とし、audit JSONL（Journal）を Span 生成の入力にしない。Journal からの Span 再構築・時刻包含・ID 生成・timing event 合成は旧 Projector とともに削除され、復活させない（FR-RLY-1/2）
- BR-2: Relay の変換は Store record → OTLP payload の写像に限定される。record に存在しない因果・時刻・ID を推測・合成しない（FR-RLY-1/2）
- BR-3: Collector への送信は best-effort とし、Collector 停止中でも workflow 結果（状態遷移・canonical Event・audit 永続化）が変わらない。telemetry 経路の失敗は fail-open（FR-RLY-3、FR-EVT-6 と整合）
- BR-4: OTLP exporter は auth header なしのローカル Collector 前提とする。認証が必要な構成は初期スコープ外で、後続 Phase の拡張に委ねる（NFR-4、requirements.md Out of Scope）
- BR-5: shadow 比較は機械可読 report を生成し、削除ゲート FR-MIG-4(d) へ接続する。report なしに「同等」を宣言しない（VER-5）
- BR-6: canonical 経路（`emitEvent` → AuditLogExporter → audit JSONL）には Relay が介在しない。Relay の障害・停止は canonical Event の耐久性に影響しない（services.md 通信契約、NFR-2）

## 条件付き振る舞い

- BR-7: 送信成功した batch のみ cursor を前進させる。部分失敗時は失敗 batch の cursor を戻さず、次回 flush の再送対象とする（FR-RLY-1）
- BR-8: 再送は idempotency 記録に基づき、Collector 側での重複取り込みを許容する設計とする。at-least-once を exactly-once に見せかける仕組みは持たない（FR-RLY-1）
- BR-9: lock 取得に失敗した場合、flush は即時終了し diagnostics に記録するのみとする。待機・強制取得はしない（FR-RLY-1 の lock/retry 維持）
- BR-10: Collector 停止・到達不能・送信タイムアウトは失敗扱いにせず、診断へ記録して exit は成功とする（FR-RLY-3）
- BR-11: retention 除去は送信済み（cursor 通過済み）かつ期限超過の record のみを対象とする。未送信 record は retention・rotation で失わない（FR-RLY-1）
- BR-12: shadow 比較 report に未説明差分が残る間は shadow 比較ハーネスを撤収しない。同等以上の確認（U8 の削除ゲート GREEN）後にのみ撤収する（VER-5、unit-of-work.md U11）
- BR-13: `flushSignals()` は session-end trigger からのみ起動する。workflow 中の同期 flush・network flush を短命 process の終了要件にしない（services.md、NFR-2）

## 検証ルール

- BR-14: FR-MIG-4(e) の入力として「Relay が Journal から Span を生成していないこと」のテスト証明を整備する。Journal を読む経路が静的検査・テストのいずれでも検出されないことを確認する（FR-RLY-2）
- BR-15: cursor 前進・部分失敗 retry・idempotency・Collector 停止の各テストは同一コミット red-green とする（team-practices.md ## Testing Posture）
