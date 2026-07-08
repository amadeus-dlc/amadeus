# Functional Design Questions — publish-readiness

> ステージ: functional-design (3.1) / Unit: publish-readiness / 作成: 2026-07-08

## 質問なしの判断(Construction の質問は例外規定)

本 Unit の意思決定はすべて上流で確定済みのため質問を生成しない:

- pack 検証の方式(npm pack --dry-run のファイルリスト契約テスト、CI 常時実行、失敗注入の実証) → requirements Q4 / FR-018
- publish 手順書の範囲(手動 publish、CI 自動化なし、プレリリース運用) → FR-015、requirements Q3
- setup 独立 semver(0.1.0〜、タグなし) → FR-017
- メタデータ是正(license / repository) → FR-001、feasibility I1/I2
- 同梱物の契約(dist/cli.js + README + LICENSE 2種) → ADR-002、BR-F19

未解決の曖昧さ: なし。
