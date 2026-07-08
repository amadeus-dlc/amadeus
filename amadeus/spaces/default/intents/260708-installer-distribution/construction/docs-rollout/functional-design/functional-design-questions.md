# Functional Design Questions — docs-rollout

> ステージ: functional-design (3.1) / Unit: docs-rollout / 作成: 2026-07-08

## 質問なしの判断(Construction の質問は例外規定)

本 Unit の意思決定はすべて上流で確定済みのため質問を生成しない:

- README 刷新の内容(ワンライナー主経路化、`cp -r` の削除+docs/guide 移設) → FR-014、成功指標2
- バンプ/CHANGELOG/バッジ同期 → CON-006、t68、project.md Mandated
- root package.json I1/I2 是正の同乗 → U4 レビューでの移管決定(unit-of-work.md 反映済み)

未解決の曖昧さ: なし。


---

## レビュー経過の記録(§12a)

- イテレーション1: NOT-READY — 4件(ハーネス選択欠落、cp -r 矛盾、バンプ根拠、upstream 適用外宣言)→ 全件是正
- イテレーション2(最終): **READY** — 非ブロッキング2点(「降格」語の残骸、BR-D01 の弱い表現)を併せて反映済み
