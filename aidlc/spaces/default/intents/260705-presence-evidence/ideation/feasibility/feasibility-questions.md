# Feasibility 質問（260705-presence-evidence）

上流入力: [feasibility-assessment.md](feasibility-assessment.md)

回答は実測と Issue から転記し、新規のピア協議は行わない。

---

## Q1. 候補 1 は単独で成立しますか？

A. しない（mint 規律の拡張 = ディスパッチ受信時 mint とのセットが必要。かつ同秒ティアにより秒窓判定になる）
B. する
X. Other (please specify)

[Answer]: A（出典: feasibility-assessment の実測 1・2。本 Intent 自身の shard が反例）

## Q2. 技術的に実現不能な候補はありますか？

A. ない（3 候補とも実装・文書化は可能。差は意味論と運用への影響）
B. ある
X. Other (please specify)

[Answer]: A（出典: feasibility-assessment 結論）
