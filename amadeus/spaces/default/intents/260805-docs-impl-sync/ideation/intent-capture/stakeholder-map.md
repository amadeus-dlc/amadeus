# Stakeholder Map — docs-impl-sync (260805)

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない — 入力はユーザー記述と intent-capture-questions.md の回答)

## Key Stakeholders(主要ステークホルダーと関心事)

| ステークホルダー | 関心事 | 主に読む文書面 |
|---|---|---|
| Amadeus 利用者(開発チーム) | 導入手順・スコープ選択・CLI 契約が実際に動くこと | `README.md` / `README.ja.md`、`docs/guide/` |
| ハーネスエンジニア | 新ハーネス移植・fork 手順・投影境界が現行実装と一致すること | `docs/harness-engineering/` |
| コントリビュータ | アーキテクチャ・状態機械・貢献手順・テスト契約の正確さ | `docs/reference/` |
| メンテナ(リポジトリオーナー) | 文書がサポート負荷を生まないこと、契約変更時の同期漏れがないこと | 全域 |
| 本 intent の後続作業 | 監査結果が再利用可能な目録として残ること | record 成果物 |

## Decision-makers vs. Influencers(意思決定者と影響者)

- **意思決定者**: リポジトリオーナー(ユーザー)。スコープ変更・PR マージ・不可逆操作の承認権を持つ(team.md エスカレーション正準リスト)
- **本 intent の執行権**: conductor。2026-08-05T07:12:02Z のユーザー明示指示により、ステージゲート承認と既決裁定の踏襲を自律執行する
- **影響者**: 既存 docs の著者(git 履歴)、docs を消費する CI ガード(参照整合・件数契約)、前回 intent 260727-docs-impl-sync の確定契約

## Communication Requirements(コミュニケーション要件)

- **言語**: `docs/` と `README*.md` は英語を正本とし、`README.ja.md` 等の対訳は同一変更で同期する(project.md ALWAYS)。`amadeus/**/*.md`(record 成果物)は日本語で書く
- **報告**: 各ステージ完了時に conductor が要点を報告する。自律モードのため承認待ちで停止しないが、以下はユーザーへ必ずエスカレーションする —
  - PR マージ判断(team.md no-AI-merge)
  - 仕様変更に当たる docs 改稿(既存のユーザー可視契約を文書側から変更する場合)
  - 実装バグの発見(修正は本 intent の対象外。Issue 起票の可否を諮る)
- **記録**: 監査で検出した乖離は目録として record に残し、対象外領域(`amadeus/`・`.claude/` 配下)の乖離は Issue 候補として列挙する
