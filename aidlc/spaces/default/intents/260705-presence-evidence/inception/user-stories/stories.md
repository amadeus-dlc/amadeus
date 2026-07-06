# User Stories — Presence Evidence（260705-presence-evidence）

上流入力: [requirements.md](../requirements-analysis/requirements.md)、[personas.md](personas.md)

## ストーリー

| ID | ストーリー | 対応 FR | MoSCoW | 受け入れ条件 |
|---|---|---|---|---|
| US-1 | P1 として、evidence 検証がどこまでを保証しどこからを保証しないかを audit-format.md で読みたい | FR-1.1、FR-1.5 | Must | 検証範囲（形式 + 実在照合）と対象外（人間由来性の機械証明）が明文であり、既存の見出し・語彙・スタイルに一致し、新設見出しを追加した場合は冒頭の自己参照カウント（`N events, M categories`）が更新されている |
| US-2 | P2 として、機械証明の不在が「見落とし」ではなく「防衛線の設計判断」であることを根拠付きで確認したい | FR-1.2、FR-1.3 | Must | 防衛線 3 点と不採用 2 案の理由（実測参照付き）が記載されている |
| US-3 | P3 として、宣言手順と mint 規律が変わらないことを確認したい | FR-1.4 | Must | mint 規律不変（#497 判断 8）の明記がある |
| US-4 | P1 として、文書が現行実装と一致していることを信頼したい | FR-2.3 | Must | 実装ファイル・関数名の明示参照があり、執筆時に実装再読了した記録が code-summary にある |
| US-5 | （Won't）候補 1 / 候補 2 の実装 | — | Won't | 実装が存在しないこと（不採用理由は FR-1.3 の文書化で開示） |

## 依存関係と INVEST 適合

- US-1 → US-2 → US-3 は同一文書内の節構成で満たす（依存は執筆順のみ）。US-4 は執筆プロセスの検証。
- 各ストーリーは文書の該当節の存在と内容で独立に検証可能（INVEST 適合）。

## ストーリー外

- US-5（表内の Won't 行）は不採用確定（人間個別承認、DECISION_RECORDED requirements-analysis）による。実装しないこと自体が確定事項であり、理由は FR-1.3 の文書化で読者に開示される。
