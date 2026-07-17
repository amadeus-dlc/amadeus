# Accessibility Checklist(CLI)— installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../../ideation/rough-mockups/wireframes.md`(モック1〜3)、`../../ideation/rough-mockups/user-flow.md`、`../user-stories/stories.md`(US-1.1〜3.1)、`../requirements-analysis/requirements.md`(FR-1〜6)、`../practices-discovery/team-practices.md`(既存実践)。

## CLI アクセシビリティ観点(既存契約の保存確認)

- [x] exit code 契約: 正常 0 / usage エラー 2(既存不変 — スクリーンリーダー・スクリプト双方の判定基盤)
- [x] エラーは選択肢の全列挙を含む(モック3 — 記憶に頼らせない)
- [x] stdout/stderr 分離: 既存 cli.ts の console.log/error 振り分け非接触
- [x] 色・装飾依存なし: reporter は plain text(既存 — NO_COLOR 対応不要のまま)
- [x] 非対話モード(--yes)完備: CI・自動化から利用可能(既存不変)

新規のアクセシビリティ変更なし — 全項目が既存契約の保存確認。

## 判定

新規のアクセシビリティ影響なし — 全項目が既存契約の保存確認(CLI 慣行準拠)。
