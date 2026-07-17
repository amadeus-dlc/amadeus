# Personas — eoc1-gate-check

## 上流入力(consumes 全数)

`../requirements-analysis/requirements.md`(FR-1〜5)、`../../ideation/intent-capture/intent-statement.md`、`../../ideation/rough-mockups/user-flow.md`(3フロー)、codekb `business-overview.md` / `component-inventory.md`(エンジン tool 内部のみの feature と非交差 — 参照非該当、code-structure 当該節を正とする)。

## ペルソナ表

| ペルソナ | 特徴 |
|---------|------|
| conductor(メンバー LLM) | ステージを進める当事者 — gate-start の直接利用者。偽陽性停止は作業ブロッカー、先記入検出は自己規律の補助輪 |
| leader | E-OC1 承認証跡の発行者 — 検査が証跡様式を機械可読契約に格上げする受益者 |
| 将来の #922 実装者 | 共有述語の再利用者 |
