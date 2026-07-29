# Scalability Requirements — U5: context-propagation

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 適用範囲と根拠

本 Unit は短命 CLI process 間の Context 受け渡しであり、スループット・同時接続数といった定常的スケーラビリティの対象外。ただし以下の「増大」に対する不変条件を定める。

## 不変条件

| 項目 | 不変条件 | 根拠 |
|---|---|---|
| 子 process 数 | hook／subagent／sensor／CLI 子 process が何個並列起動しても、各々の inject/extract は O(1)（共有キュー・中央集約なし） | BR-3、分散不要の env carrier 設計 |
| 伝播深さ | trace の深さ（親→子→孫→…）が増えても carrier は trace ID + 直近 span ID のみでサイズ一定。深さに比例する state を運ばない | W3C Trace Context の性質 |
| 永続化 Context | Intent Context の永続化は intent あたり 1 record で、stage／process 数に比例して増殖しない | FR-TRC-4、BR-1 |

## 検証

- 3 段（親→子→孫）チェーンのテストに加え、複数子 process 並列起動時に全子が同じ trace ID へ接続されることを integration テストで固定する
