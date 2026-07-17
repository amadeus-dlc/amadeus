# Team Practices — installer-new-harnesses(Issue #1048)

上流入力(consumes 全数): codekb の code-structure.md / technology-stack.md / dependencies.md / code-quality-assessment.md / architecture.md / business-overview.md(いずれも本 intent RE で全数再検証済み・区間不変の既存台帳 — c1 の同日 RE 代用)、evidence.md、discovered-rules.md(0件)。

## 本 intent に適用される既存実践(変更なし — live 温存、c2)

- installer 変更の検証プロファイル: typecheck / lint / dist:check / promote:self:check / tests --ci(project.md Mandated affirm 済み)
- 公開物実検証: npm pack 実ツール(requirements-analysis:c4 既決 — 本 intent では pack-contract 変更不要を RE 実測済み)
- CI 体制: patch gate+相対ゲート(#1060 以降)— 新規テストは in-process 被覆を設計時から
- リリース: release.yml 一本(version 面非接触)

team.md / project.md への変更提案: **なし**(promote は no-op)。

## 促進の判定

promote は no-op(変更提案なし)— c2 の live 温存により team.md / project.md の無変更セクションはそのまま維持される。
