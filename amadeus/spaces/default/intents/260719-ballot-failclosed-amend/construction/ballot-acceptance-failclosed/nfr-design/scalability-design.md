# Scalability Design — U1 ballot-acceptance-failclosed

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計(SC-1/SC-2 の実現)

- **SC-1**: resolveBallots・unknown-ref 照合とも accepted 配列(ballots+late)の線形走査 — インデックス構造を新設しない(scalability-requirements.md の実測規模: 全34選挙 voters 最大3、上限制約なしの型)。
- **SC-2(sweep の件数追従)**: FR-2 sweep は `elections/*/ledger.json` の glob 列挙で実装時点の全数へ自動追従 — 固定件数・固定名の列挙をコードにもテストにも書かない(RA レビュー是正の設計面固定)。

## 非該当

分散・キュー・キャッシュ基盤なし(CLI ワンショット)— scalability-requirements.md の N/A を継承。
