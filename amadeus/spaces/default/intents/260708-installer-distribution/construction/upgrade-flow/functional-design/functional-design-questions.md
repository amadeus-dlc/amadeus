# Functional Design Questions — upgrade-flow

> ステージ: functional-design (3.1) / Unit: upgrade-flow / 作成: 2026-07-08

## 質問なしの判断(Construction の質問は例外規定)

本 Unit の意思決定はすべて上流で確定済みのため質問を生成しない:

- バージョン境界5ケース(同版/旧版/最新超え/明示新版/正常) → FR-005 受け入れ基準
- 導入状態分類と保守的取り扱い(manual-or-unknown / partial) → FR-005・FR-016
- md5+退避の処遇判定 → FR-008(U1 の `manifest.dispositionFor` が所有)
- `--force` の範囲(退避は免除されない) → FR-009
- 差分レポート → FR-007(U2 の Plan/Reporter 契約を再利用)

未解決の曖昧さ: 当初「なし」としたが、レビューで LegacyLayout の入力契約(evidence の構造)が未定義と判明 — U2 Installation の evidence を構造化型(InstallationEvidence)へ拡張して解決(下記レビュー経過参照)。


---

## レビュー経過の記録(§12a)

- イテレーション1: NOT-READY — 7件(根本原因: UpgradeSource にマニフェスト導線がなく委譲が再実装化)→ 全件是正(dispositionFor/assess/nextManifest の所有、UpgradeOutcomeNonProceed、fromOutcome、LegacyLayout 規則、ClassifiedError 型合流、components 参照+置換注記)
- イテレーション2(最終): NOT-READY — 是正由来の新規ギャップ2件+軽微1件
- **ビルダー是正(イテレーション上限到達後)**: ① U2 `Installation` の evidence を構造化型 `InstallationEvidence`(paths+versionFileContent+anchors)へ拡張し、`LegacyLayout.isUnsupported` の入力契約を確定 ② エンティティ関係図を UpgradeSource 経由の導線(assess / dispositionFor / nextManifest)へ描き直し、text fallback との不整合を解消 ③ BR-U08 をモード不問の一様拒否(--force 必須)として実装と整合させ、FR-005 要件の上位集合であることを注記
