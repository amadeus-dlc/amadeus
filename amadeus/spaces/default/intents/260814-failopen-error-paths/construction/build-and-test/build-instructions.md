# ビルド手順

## 目的と入力

`code-generation-plan.md` の配送確認と `code-summary.md` の最終実装面を入力として、全ハーネスの生成、型検査、静的検査、生成物境界を検証する。対象は Issue #2988 の fail-closed 修正に限定する。

## 実行手順

リポジトリルートで次の順に実行する。

1. `bun run build`
2. `bun run typecheck`
3. `bun run lint`
4. `bun run source-only:check`

## 合格条件

- 4 コマンドすべてが exit 0 で完了する。
- build が manifest 対象の全ハーネスを生成する。
- lint の既存 warning は許容するが、新たな error は許容しない。
- source-only 検査が追跡対象への生成物混入を報告しない。
