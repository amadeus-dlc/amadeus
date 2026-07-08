# Security Design — upgrade-flow

> ステージ: nfr-design (3.3) / Unit: upgrade-flow / 作成: 2026-07-08
> 出典: `../nfr-requirements/security-requirements.md`(SEC-U01〜U03)・`tech-stack-decisions.md`、U2 nfr-design/security-design.md(SafeTargetPath 継承)

## SEC-U01(退避不可侵)の実装構造

- applier の backup-then-copy 実装は、rename 先(`.bk` パス)について **`fs.rename` 前に `fs.access` で存在チェック**し、存在すれば当該エントリを ApplyFailure(operation: "backup")で即中断(fail-fast — U2 設計の停止規則に合流)
- `.bk` パス自体も `resolveWithin(targetRoot, ...)` の SafeTargetPath 検証を通す(U2 SEC-I01 の継承 — 検証の抜け道を作らない)

## SEC-U02/U03 の実装構造

- 共有実装(applier/cli)のため追加構造なし。upgrade 入口の integration テスト1本(nfr-requirements の検証行)はテスト側の追加であり本番構造に影響しない
- 保守的判定(SEC-U03)は `UpgradeSource.dispositionFor` の manual-or-unknown 分岐に実装が閉じる(nfr-design レベルの追加なし — functional-design の構造で充足)
