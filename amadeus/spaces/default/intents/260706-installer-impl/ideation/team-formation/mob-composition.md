# Mob Composition — インストーラの実装

> ステージ: team-formation (Ideation) / 作成: 2026-07-07
> 出典: `team-assessment.md`、Q3(Bolt 運用はデフォルト)

## 構成

物理的なモブは組まない(ソロメンテナ体制)。AI-DLC の標準構成をそのまま採用する:

| 役割 | 担当 | 関与ポイント |
|------|------|--------------|
| コンダクター | /amadeus オーケストレーター | 全ステージの進行・ゲート提示 |
| 実装 | amadeus-developer-agent(Bolt 単位の Task) | Construction 3.5 |
| 設計 | amadeus-architect-agent | 2.6〜3.4 |
| 品質 | amadeus-quality-agent | 3.6(build-and-test) |
| レビュー・承認 | メンテナ(人間) | 全承認ゲート + walking skeleton ゲート |
| 公開 | メンテナ(人間) | npm publish(P4)・リリースタグ |

## RACI(簡易)

| 作業 | 実行(R) | 説明責任(A) | 相談(C) | 報告(I) |
|------|----------|--------------|----------|----------|
| 設計・実装 | AI エージェント | メンテナ | — | メンテナ(ゲート) |
| レビュー・マージ | メンテナ | メンテナ | AI(レビュー支援) | — |
| npm 公開 | メンテナ | メンテナ | — | — |

## 運用合意

- walking skeleton(Bolt 1)は必ずゲート。以降は ladder プロンプトでその都度選択(Q3: デフォルト)
- Bolt ブランチは main へスカッシュマージ(org.md の既存慣行)
- オンボーディングは不要(既存メンテナのみ)
