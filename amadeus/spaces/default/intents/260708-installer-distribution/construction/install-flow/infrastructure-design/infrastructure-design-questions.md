# Infrastructure Design Questions — install-flow

> ステージ: infrastructure-design (3.4) / Unit: install-flow / 作成: 2026-07-08

## 質問なしの判断(Construction の質問は例外規定)

U2 は実行時の新規外部面を持たない(GitHub 通信は U1 経由、書き込みはユーザーのローカル対象ディレクトリのみ)。判断事項は E2E テストインフラの構成のみで、既存 tests/harness 流儀から導出可能。

未解決の曖昧さ: なし。

---

## レビュー経過の記録(§12a)

- イテレーション1(並行レビュー): NOT-READY — ブロッキング1件(フィクスチャ tar.gz と codeload 実アーカイブの形状不整合が未決着 — false green リスク)+軽微2件(performance-design「E2E 計測の実装位置」の出典欠落、実ネットワーク E2E の選別機序未規定)→ 全件是正: codeload ラッパー形状の再現をフィクスチャヘルパーの契約として明記(フラット tar.gz 禁止)、locate のラッパー解決契約を発生元 U1 functional-design/domain-entities.md に確定(修正起因の伝播 — 発生元含む grep 教訓の適用)、出典補完、`AMADEUS_SETUP_E2E_NETWORK=1` + `test.skipIf` ガードを規定
