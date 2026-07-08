# Security Design — install-flow

> ステージ: nfr-design (3.3) / Unit: install-flow / 作成: 2026-07-08
> 出典: `../nfr-requirements/security-requirements.md`(SEC-I01〜I04)・`tech-stack-decisions.md`(exec 不使用)、`../functional-design/business-logic-model.md`(applier 境界)

## SEC-I01(書き込み封じ込め)の実装構造

- applier は適用開始時に `targetRoot = path.resolve(target)` を固定し、各エントリの書き込み先を `resolveWithin(targetRoot, entry.path): Result<SafeTargetPath, ApplyFailure>` で検証してから I/O する(U1 の SafePath と同型の**適用側ブランド型** — 二重防御の対称構造)
- `.bk` 生成パスも同じ検証を通す(target 外への退避を型で不可能に)

## SEC-I02(入力検証)の実装構造

- `--target` の検証は cli が I/O 前に1回(存在 or 作成可能)。以降の全モジュールは検証済み絶対パスのみを受け取る
- 子プロセス起動 API(exec/spawn)を**依存として持たない**(tech-stack: 全操作 fs API — import 自体をしない)

## SEC-I03/I04 の実装構造

- 昇格の不使用: 権限エラー(EACCES/EPERM)は ApplyFailure の operation 単位で報告し、sudo を促す文言を reporter に置かない(文言レビュー項目)
- 機微情報: レポート・マニフェストにはターゲット相対パスのみを記録(絶対パスはエラー詳細のみ、ログ保存はしない)
