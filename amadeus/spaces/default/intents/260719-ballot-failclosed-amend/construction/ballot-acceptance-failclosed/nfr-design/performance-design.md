# Performance Design — U1 ballot-acceptance-failclosed

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計(P-1/P-2 の実現)

- **P-1(定数時間検証)**: SUBMITTED_AT_RE は module スコープの const(1回コンパイル)。二段目 Date 検証は `Number.isNaN(new Date(s).getTime())` の単一呼び出し — 分岐は Ballot.parse の分類ラダー内1箇所(business-logic-model.md の関数配置どおり)。追加のキャッシュ・メモ化は導入しない(入力1件の CLI ワンショットに不要)。
- **P-2(resolveBallots O(n))**: Map<voter, Ballot> の単一走査(挿入時に submittedAt 比較・同時刻は amend 優先で置換)→ values() 返却。ソート不要(O(n log n) を回避)。tech-stack-decisions.md T-1 どおり依存ゼロの標準構造のみ。

## 検証(性能面)

専用ベンチなし(performance-requirements.md の N/A 判定を継承)— --ci スイート実行時間の逸脱有無のみ観察。
