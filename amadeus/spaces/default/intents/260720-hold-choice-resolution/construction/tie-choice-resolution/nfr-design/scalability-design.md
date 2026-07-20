# Scalability Design — U1 tie-choice-resolution

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md — SC 要求の設計反映は「規模依存の構造を導入しない」ことの確認であり、business-logic-model.md の単発 CLI フロー・tech-stack-decisions.md の daemon 非追加を根拠に、performance-design の O(choices) 実装形(P-2)を上限なしで採用する。

## 設計

| NFR | 実装形 |
| --- | --- |
| SC-1 | hold-resolved は選挙1件のみ load/append — store 本数(実測 ref 51/62)へのアクセスなし(business-logic-model.md フロー: Store.load(electionId) 単発) |
| SC-2 | choices 数へ上限コード・打切りを設けない(some/map の自然線形。security-design S-4 の列挙も同様) |
| SC-3 | SLO 機構は追加しない(N/A 確定済み — 単発 CLI。reliability-requirements.md R-4 の回復可能性区分で足りる) |

## 規模検証

sweep(NFR-3 / R-3)は build-and-test で実装時点の glob 全数実測 — 設計としては「規模依存構造の不在」を本書で確定し、数値検証は sweep へ委譲する。
