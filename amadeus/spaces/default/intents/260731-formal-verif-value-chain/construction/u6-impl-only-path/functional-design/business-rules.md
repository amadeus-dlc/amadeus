# Business Rules — u6-impl-only-path

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## BR-U6-1: TDD 必須

挙動追加のため TDD 既定(NFR-2)。P1〜P5 の各分岐へ失敗テスト先行(t380 — テスト設計 (1)〜(5))。

## BR-U6-2: 宣言なし更新の禁止

impl hash の更新は `--impl-only` 宣言フラグ経由のみ。手編集の正規化はしない(#1510 の暫定手編集は本 Unit の着地で廃止 — 案内文面が正規手順を指す)。

## BR-U6-3: モデル改訂経路との分離

model/cfg が変わる正規更新は従来の `updateModelMap`(無フラグ)のまま。`--impl-only` は直交する別分岐であり、両経路の受理条件は排他(P1 — 曖昧な中間ケースを作らない)。

## BR-U6-4: 文書同期

センサー manifest(.claude/sensors/amadeus-model-completeness.md)の記述は正本 core 側の変更と同一 PR で同期(NFR-3 の文書面 — services.md の CLI 面契約)。

## BR-U6-5: 検証コマンド集合

BR-U1-6 と同一+t380+既存 model-completeness 系テスト(unit/e2e/integration)全 green。
