# Services — standing-delegation-grant

上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜8・E-SDG-RA/RA2 裁定焼き込み)、`../../ideation/feasibility/constraint-register.md`(C-1〜C-10)、codekb `code-structure.md`(delegate provenance 観測節)・`architecture.md`・`component-inventory.md`(いずれも本日 RE 現況)、`../practices-discovery/team-practices.md`(変更 0 件 — practices 制約なしの確認)

## 権限フロー(二層防衛の拡張)

従来: per-gate HUMAN_TURN(第1経路)/ DELEGATED_APPROVAL(第2経路 #671)。本 intent で **standing grant(第3経路)** を追加 — 優先順は 第1 → 第2 → 第3(グラントは最後のフォールバック。挿入位置 = ADR-7)。

| 経路 | 根拠 | 範囲 | 除外 |
|---|---|---|---|
| HUMAN_TURN | 自セッション実打鍵 | そのゲート1回 | なし |
| DELEGATED_APPROVAL | issuer 実 HUMAN_TURN(gate open 後) | 対象 intent の当該ゲート | なし |
| standing grant | issuer 実 HUMAN_TURN+ユーザー standing authorization | scope=stage-gates 全数(TTL 内) | phase-boundary(opt-in 可)/ skeleton / PR マージ |

## 障害独立

グラント検証は読み取り専用(シャード readFileSync+parse)で、失敗時は従来経路へフォールバック — グラント機構の欠陥がゲート解決を止めない(refuse 側にのみ倒れる)。
