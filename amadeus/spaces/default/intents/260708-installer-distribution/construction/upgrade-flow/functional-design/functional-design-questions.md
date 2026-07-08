# Functional Design Questions — upgrade-flow

> ステージ: functional-design (3.1) / Unit: upgrade-flow / 作成: 2026-07-08

## 質問なしの判断(Construction の質問は例外規定)

本 Unit の意思決定はすべて上流で確定済みのため質問を生成しない:

- バージョン境界5ケース(同版/旧版/最新超え/明示新版/正常) → FR-005 受け入れ基準
- 導入状態分類と保守的取り扱い(manual-or-unknown / partial) → FR-005・FR-016
- md5+退避の処遇判定 → FR-008(U1 の `manifest.dispositionFor` が所有)
- `--force` の範囲(退避は免除されない) → FR-009
- 差分レポート → FR-007(U2 の Plan/Reporter 契約を再利用)

未解決の曖昧さ: なし。
