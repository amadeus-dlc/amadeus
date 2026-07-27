# Security Test Instructions — 260726-mirror-state-split

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-mirror-state-split/code-generation/ — 検証対象の Steps・FR 対応・実測 exit code の導出元)。

## 対象変更のセキュリティ回帰(target-scoped)

- provenance ガード(fail-closed)は無変更 — code-summary.md FR 対応表のとおり write 側 lifecycle スタック不変。重複 create ガードは lifecycle **到達前**の拒否であり、認可バイパスを追加しない(t300 の「does not touch GitHub」assert で GitHub 副作用ゼロを実測)
- 削除は不到達デッドコードのみ(code-generation-plan.md Step 5)— 攻撃面は縮小方向

## リポジトリ全体の依存 audit

別判定(対象 tests green と独立)。本変更は依存追加ゼロのため新規 advisory なし。既存 advisory の棚卸しは本 intent スコープ外。
