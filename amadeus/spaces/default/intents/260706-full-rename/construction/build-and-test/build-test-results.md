# build-test results（260706-full-rename）

上流入力: 本ステージの instructions 5 件。

## 実行結果（2026-07-06T05:05:55Z、fresh 実行）

| コマンド | 結果 |
|---|---|
| `npm run test:all` | exit 0 |
| `npm run parity:check` | ok（39 skills、199 engine files、b67798c3。engineFileExceptions 純増ゼロ） |
| `npm run test:it:installer` | exit 0（untouchable = amadeus/ の新意味論） |
| `npm run test:it:engine-e2e` | exit 0（移設後の実 CLI 駆動） |
| `npm run test:it:rename-leftovers` | exit 0（検査 (e) 含む。旧名残存ゼロ） |
| validator（260706-full-rename 指定） | pass（不足・矛盾なし） |

## TDD 証跡

検出器 (e) は自己検査（合成旧名 1 件を報告し allow 該当行を通す）で検出力を証明済み。3 段 commit の各段で test:all green を維持（詳細は code-generation-plan.md）。

## 失敗と対処

なし（実装中の自己破壊 2 件と半改名 1 件は code-generation 内で検出・解消済み。diary 記録あり）。
