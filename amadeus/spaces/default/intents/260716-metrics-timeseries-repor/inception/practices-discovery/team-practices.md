# Team Practices — metrics-timeseries-report(practices-discovery)

上流入力(consumes 全数): codekb `code-structure.md`・`technology-stack.md`・`dependencies.md`・`code-quality-assessment.md`・`architecture.md`・`business-overview.md`(同日 RE 更新、c1 代用)+ affirm 済み `team.md`・`project.md`

## 証跡スキャンの代用(c1)

同日(2026-07-16)の RE codekb がスキャン面(CI 構成・テスト様式・コードスタイル=兄弟 CLI idiom)を全カバーしているため、これを証跡として代用する。affirm 済み team.md / project.md との差分ギャップ質問は**なし** — 本 intent は読取専用 CLI の追加で、既存の Testing Posture(in-process seam)・Code Style(functional-domain-modeling-ts)・Way of Working(Bolt 単位 PR)がそのまま適用可能。

## 適用プラクティス(既存 live の再確認)

- 実装: `core/`/`harness/` 非接触(tests/ or scripts/ 配下の単独 CLI)— dist regen 不要の見込みは design で確定
- テスト: exported 純関数の in-process 駆動 + push 前 lcov 実測(local-lcov-pre-push)
- PR: deslop → 全検証コマンド exit code 付き報告 → per-PR ユーザーマージ伺い
