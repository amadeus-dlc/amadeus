# Scalability Design — u1-runner-relocation

上流入力(consumes 全数): requirements, business-logic-model, business-rules, domain-entities

## 適用範囲の判定

CLI ツールの移設であり水平スケール・負荷分散の設計対象を持たない(nfr-design:c1 — 常駐サービス機構を持ち込まない)。

## 規模面の設計

規模面で設計すべきは**ファイル数の規模**のみ:

- 移設 24 ファイル+複製1(domain-entities.md E1)— 一括 rename は git の追跡限界内(数十ファイル規模、business-rules.md BR-U1-1)。
- dist 再生成は既存パイプライン(scripts/package.ts)の既知規模(7 ハーネス+中立)— 新規スケール要素なし(requirements NFR-3)。
