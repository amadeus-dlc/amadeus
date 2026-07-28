# Security Requirements — u3-lifecycle-integration

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

## 同意境界(requirements FR-10a)

- Project 同期は create/sync 操作の bounded な一部 — `auto-mirror: auto` の standing consent がそのまま適用され、prompt モードでは**既存の操作単位 ask に内包**する。新しい ask 種別・同意種別を作らない(business-rules BR-U3-6)。
- ask 文言に含める Project 面要約は「同期対象 Project 数と適用予定 Status」のみ(business-logic-model の FR-10a 節)— token・API 応答・秘匿情報を含めない(requirements NFR-4)。
- PR merge / release / publish / deploy / 無関係な外部操作への consent 拡張は引き続き禁止(requirements FR-10a — affirmed Forbidden 不変)。gateway argv に PR/release/deploy 系経路が存在しないことの negative assert は維持。

## 認可・操作境界

- boundary 種別を新設しない — 既存 eligible boundary / manual invocation のチェーンのみに配線する(business-rules BR-U3-7、requirements 受入条件14)。新しい実行契機(タイマー・外部トリガー)を作らないことが攻撃面の不拡大を構造的に保証する。
- close 実行は completionProjectGate ready の場合のみ(business-rules BR-U3-4)— close の誤発火(未同期のまま Issue を閉じる)をゲートで防ぐ。gate 評価は台帳のみ入力のオフライン決定(BR-U3-8)で、外部応答の細工による gate バイパス経路が存在しない。

## 秘匿(requirements NFR-4)

- close 保留時に台帳・警告へ可視化する blocking の内訳(business-logic-model 手順2 — 「blocking の内訳(safety-blocked の Project 列)は警告と台帳で可視化」)は Project 識別子と状態ラベルのみで構成し、生の GraphQL 応答・token を転記しない(requirements NFR-4 — U2 の redact 流儀を継承。technology-stack 断面: 新規依存・新出力経路ゼロ)。
