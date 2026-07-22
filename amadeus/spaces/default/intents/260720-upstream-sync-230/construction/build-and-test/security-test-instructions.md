# Security Test Instructions — upstream-sync-230

> 上流入力(consumes 全数): 全12ユニットの `code-generation-plan.md`、`code-summary.md`

NFR-8(供給網・secret/credential/network 面の非新設)への trace に基づく選定(build-and-test:c3 — 攻撃面・依存の実測明記がある場合のみ比例選定)。

## 選定

- **依存・供給網**: 本 intent の全ユニットは新 runtime dependency を追加しない(各 `code-summary.md` の変更ファイル一覧に依存追加 0 を確認、`package.json` diff なし)。C-1(Bun-only)維持は dist:check/promote:self:check が構造的に検査。
- **入力検証(fail-closed)**: 信頼境界外入力の拒否経路を各ユニットのテストが固定 — U01 未知 kind/不正型(t248)、U06 unsafe submodule path・.gitmodules parse 失敗(t249)、U10 malformed manifest/unknown seam/clobber(t252/t253)。
- **path 安全**: U06 `isSafeSubmodulePath`(絶対 path・`..` 拒否)、U10 drop の record 所有 path 限定(user-authored path を削除しない)を対象テストで検証。
- **secret/credential**: 新設面 0(grep 棚卸しは各ユニット code-summary の変更一覧で確認)。ハードコード credential の検査は既存 lint/review 運用に従う。

## 非選定の根拠

- ペネトレーション・DAST 等: network 到達面が存在しないため N/A(要求済み検査の省略ではない)。
