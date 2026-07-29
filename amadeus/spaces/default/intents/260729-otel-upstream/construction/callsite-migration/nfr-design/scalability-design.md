# Scalability Design — U7: callsite-migration

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

scalability-requirements.md の目標（約1600 site の全量処理・走査スケーリング・残存可視化）に対する設計。

## batch 処理の設計

- 約1600 call site を静的スキャンで列挙し batch に分割する。batch 数に上限を設けず、各 batch は独立に commit・rollback 可能とする（business-logic-model.md § 段階移行ワークフロー）
- 静的スキャンで列挙した site 総数と batch 割付表の一致を機械検証し、列挙漏れ・二重割付を防ぐ

## 走査の単調性設計

- guard 走査コストはリポジトリファイル数に線形で、allowlist 縮小に伴い「許容集合」は単調減少する。走査時間が移行の進行で悪化する構造を持たない
- 残存 site 数の単調減少（BR-12）を batch commit ごとに機械確認し、減少しない変更は移行 commit として認めない。判定は走査結果の数値比較のみで完結させ、外部サービスに依存しない

## 移行期の runtime コスト設計

- 移行期間中の新旧混在（未変換 site の Adapter 経由）は runtime コストを site 数に比例させない。Adapter は 1 call あたり O(1) の Map 参照のみ（BR-2）
- 残存一覧 report は site 数ゼロまで同じ形式を維持し、CI artifact として毎実行で生成する（BR-9）

## 適用外

- 水平スケーリング・同時実行数の増大は対象外。guard・変換・shadow 比較は単一 CI runner／ローカル実行の短命 process で完結し、分散実行を要求しない（technology-stack.md どおり）
