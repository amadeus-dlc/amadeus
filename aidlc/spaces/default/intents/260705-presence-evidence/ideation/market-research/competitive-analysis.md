# 比較分析 — Presence Evidence（260705-presence-evidence）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

## 類例（自動化に対する人間承認の証明方式）

| 方式 | 類例 | 本 Intent への適合 |
|---|---|---|
| 時系列相関（presence イベントとの近接） | 本エンジンの `humanActedSinceGate`（gate 承認・interview 回答の既存ガード） | 候補 1 の実体。既存 ledger の再利用で追加概念なし |
| 発行元の限定（システムだけが emit できるイベントに限る） | エンジン遷移だけが emit する `GATE_APPROVED` | 候補 2 の実体。発行元の信頼で偽装を排除するが、承認転記運用（DECISION_RECORDED）と衝突 |
| 監査 + 事後検出（防止せず追跡可能性で抑止） | 現行設計（GUARD_EXEMPTED の必須 audit + PR gate） | 候補 3 の実体。防止はしないが偽装は監査で追える |

## 含意

3 候補は「防止の強さ」と「運用の摩擦」のトレードオフ上に並ぶ。既存 ledger の再利用（候補 1）は概念追加なしで防止を強化できる位置にある。
