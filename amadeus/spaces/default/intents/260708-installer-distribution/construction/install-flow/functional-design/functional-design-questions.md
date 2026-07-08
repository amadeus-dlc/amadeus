# Functional Design Questions — install-flow

> ステージ: functional-design (3.1) / Unit: install-flow / 作成: 2026-07-08

## 質問なしの判断(Construction の質問は例外規定)

本 Unit の意思決定はすべて上流で確定済みのため質問を生成しない:

- CLI 文法(両サブコマンド明示・なしはヘルプ) → scope-definition Q4/Q4-f、requirements CLI Contract
- 導入済み検出時の挙動(中断+upgrade 案内、--force で強制) → requirements Q2 / FR-004
- 衝突時挙動(対話=確認継続/非対話=中断) → FR-010
- 非対話必須引数(--harness/--target) → FR-011
- 成功検証の下限(ファイル存在+doctor 相当) → FR-013
- ウィザードの対象(ハーネス選択・確認) → FR-003、US-A2
- ドメインモデリングスタイル → project.md Code Style(ユーザー確認済み Rev.3 の役割分担)

未解決の曖昧さ: なし。
