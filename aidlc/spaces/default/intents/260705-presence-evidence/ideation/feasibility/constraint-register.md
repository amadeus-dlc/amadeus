# 制約台帳 — Presence Evidence（260705-presence-evidence）

上流入力: [feasibility-assessment.md](feasibility-assessment.md)

| ID | 制約 | 出典 |
|---|---|---|
| CON-1 | presence 意味論（HUMAN_TURN の mint 規律）の変更は契約級であり、人間の個別確認を要する | #497 確定判断 8、ディスパッチ auto 例外 |
| CON-2 | 解決手段は既存資産の内側（ledger 再利用または文書化）に限定する | market-research gate 承認 |
| CON-3 | 候補 1 の採用は mint 規律の拡張（ディスパッチ受信時 mint）とのセットでのみ成立する | feasibility 実測 1 |
| CON-4 | 相関の時系列判定は同秒ティアを許容する形（秒窓）にする必要がある | feasibility 実測 2 |
| CON-5 | amadeus-state.ts への変更は並行 Intent（#428、#507）との接触確認後に着手する | ディスパッチ指示 5 |
| CON-6 | 採用時は eval 先行（TDD）。不採用時は設計境界の文書化 | Issue #506 受け入れ条件 |
| CON-7 | merge は人間が行う | Git Branching Policy |
