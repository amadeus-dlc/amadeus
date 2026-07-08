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


---

## レビュー経過の記録(§12a)

- イテレーション1: NOT-READY — 8件 → 全件是正(ApplyResult/ApplyFailure 定義、失敗分岐の明示、md5/required のプラン時計算、Reporter API 正式化+ClassifiedError、NextSteps.of、InstallInputs への置換+wizard-abort 分岐、FileClass インポート、BR-I06 根拠)
- イテレーション2(最終): NOT-READY — 展開漏れ2件+参考1件
- **ビルダー是正(イテレーション上限到達後)**: ① frontend-components.md の WizardAnswers 残存を InstallInputs へ置換 ② `InstallMeta.of` 参照をプレーンリテラル構築へ変更(U1 の shape-only 補助型方針と整合、レビュアー推奨案 a) ③(参考指摘)Applier/Verifier のファクトリ+ポート注入契約を明記し component-methods のベア関数スケッチへの置換を宣言
