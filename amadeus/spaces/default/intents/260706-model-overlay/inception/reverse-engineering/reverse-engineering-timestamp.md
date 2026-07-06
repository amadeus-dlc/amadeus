# reverse-engineering-timestamp — 260706-model-overlay

## 実施記録

- 実施時刻: 2026-07-06T05:35:00Z（据え置き採用 + 対象 seam の直接調査。再解析なし）
- 調査基準: origin/main（04560e08 以降）と branch eng1/issue-526-rename（read-only。順序制約により分析は rename 後の姿で記述）
- 正本: [codekb/amadeus/](../../../../codekb/amadeus/)（更新履歴の正は timestamp.md）

## 対象 seam の直接調査結果（rename 後の姿）

1. agent 定義: `.agents/amadeus/agents/amadeus-*.md`（rename 後も同 path）。frontmatter の `modelOverride:` が使用モデルを決める（例: amadeus-architect-agent.md:11 = `modelOverride: opus`）。この tree は上流同期・インストーラ更新で全置換される側であり、直接編集は消える（Issue の前提を実測で確認）。
2. promote-skill.ts（rename 後も dev-scripts/ 配下）: 対象は skills/ → .agents/skills/ の複製で、`alwaysAllowedDirs` に `agents` を含むが、engine の `.agents/amadeus/agents/` を書く経路は存在しない。したがって Issue の「promote/生成の最終段」に加え、上流同期後の engine agents に対して単独実行できる適用スクリプトが必要（設計含意。requirements へ引き継ぐ）。
3. parity 機構: dev-scripts/data/{parity-map.json, parity-baseline.json}（rename 後も同 path）。parity-check はディスク上のファイル hash を baseline と比較するため、overlay がディスクの agent 定義を書き換えると hash 不一致になる。整合設計（比較前の overlay 正規化 or 行除外 or engineFileExceptions）が Issue の主要論点であることを機構レベルで確認。

## 判断

churn 中の codekb 再生成は行わず据え置き採用。本 Intent の分析・設計は上記 seam 調査を一次情報とする。
