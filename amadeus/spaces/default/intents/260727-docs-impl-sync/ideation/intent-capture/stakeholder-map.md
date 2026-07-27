# Stakeholder Map — docs-impl-sync

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない — 入力はユーザー記述と intent-capture-questions.md の回答)

## Key Stakeholders(主要ステークホルダーと関心)

| ステークホルダー | 関心 | 影響を受ける文書面 |
|---|---|---|
| リポジトリオーナー(ユーザー) | ドキュメントが実装の実態を正確に反映していること。新設 `amadeus-document` スコープの実効性確認 | 全域 |
| Amadeus 利用者(外部・将来) | README・guide の手順どおりに導入・運用できること | `README*.md`、`docs/guide/` |
| ハーネスエンジニア(fork 作者) | 移植・カスタマイズ手順の正確さ | `docs/harness-engineering/` |
| コントリビュータ | アーキテクチャ・状態機械・貢献手順の記述が現行コードと一致すること | `docs/reference/` |
| 後続 intent の conductor/agent | codekb と docs の整合(RE 差分リフレッシュの基準前進) | codekb、docs 全域 |

## Decision-Makers vs. Influencers

- **意思決定者**: ユーザー(承認ゲート、PR マージ承認、重大乖離の修正方針の裁定)
- **実行者**: conductor(ソロモード — 監査・修正・検証の実施、Issue 起票)
- **影響者**: 既存ノルム(project.md の docs 言語規則・EN/JA 同期 ALWAYS、team.md の docs 棚卸し grep 規律)— 作業の制約として作用し、本 intent では変更しない

## Communication Requirements(コミュニケーション要件)

- ステージゲートごとに成果物パスと要約を提示し、ユーザー承認を得る(通常のステージプロトコル)
- 乖離監査の結果は「乖離目録」として成果物化し、修正 PR とは独立にレビュー可能にする
- docs 作業中に発見した実装側のバグ・実装と設計の矛盾は修正せず GitHub Issue に起票して報告する(bughunt-file-only 準拠)
- PR は人間承認後にマージ(no-AI-merge 準拠)
