# Scalability Design — U5: context-propagation

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

scalability-requirements.md の不変条件（子 process 数・伝播深さ・永続化 Context の増大に対する O(1) 性）を満たす設計。分散機構の新設は行わず、env carrier の性質で不変条件を満たす。

## 並列子 process に対する設計

- inject/extract は各 process の env に閉じた O(1) 操作とし、共有キュー・中央集約レジストリ・process 間共有ファイルを carrier 経路に置かない（scalability-requirements.md § 不変条件）
- 複数子 process の並列起動時、各子は同一の `traceparent` を親の env から受け取るだけで、子同士の調整・順序付けを行わない

## 伝播深さに対する設計

- carrier は trace ID＋直近 span ID のみを運び、祖先チェーン・深さカウンタを保持しない。深さに比例する state を carrier・永続化 record の双方に持たない（W3C Trace Context の性質に依存）
- 深さ方向の状態が必要な場合も Span 側の parent 参照で表現し、carrier を肥大化させない

## 永続化 Context の設計

- Intent Context の永続化は intent あたり 1 record とし、stage／process 起動ごとの追記・増殖を行わない（FR-TRC-4、BR-1）
- anchor Context は birth／resume 経路でのみ生成・永続化し、以後の短命 process は read のみ（business-logic-model.md § Intent Context の確立と永続化）

## 検証設計

- 3 段チェーンに加え、複数子 process 並列起動で全子が同一 trace ID に接続される integration テストを `--ci` 層に配置する（scalability-requirements.md § 検証）
