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


---

## レビュー経過の記録(§12a)

- イテレーション1: NOT-READY — 5件(単一定義メカニズム、4vs5個数、自動同梱区別、Result 形状、CON-006 タイミング)→ 全件是正
- イテレーション2(最終): NOT-READY — 是正5の伝播漏れ1件+上流反映1件+残骸1件
- **ビルダー是正(イテレーション上限到達後)**: ① domain-entities の「root 是正も本 Unit で実施」残存記述を U5 移管に整合 ② units-generation/unit-of-work.md の U4/U5 定義へ移管を反映(クロスユニット traceability)③ 空コードフェンス除去
