# D007：完了済み record の現状維持

## 判断

完了済み 2 record（260703-aidlc-v2-full-compliance、260703-amadeus-skill-english-rollout-plan）は現状のまま残し、新形式へ移行しない。

## 根拠

- 完了済み成果物の書き換えは改ざんに近く、履歴は git と record 自身で追跡できる。
- 人間の指示（Q5 回答）。

## 影響

- 新 validator は旧形式 record を検査対象外または旧形式許容として扱う（恒久方針は backlog）。

## 由来

G001 の GD006。
