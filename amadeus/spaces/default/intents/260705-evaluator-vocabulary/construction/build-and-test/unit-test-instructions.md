# Unit Test Instructions

Unit: evaluator-vocabulary（Test Strategy: Minimal — 要件 1 件につき検証 1 件以上）

## 要件と検証の対応

| 要件 | 検証 | コマンド |
|---|---|---|
| R001（team.md 読み替え） | 文言の逐語確認（reviewer 実施済み）＋ PR レビュー | `git diff` |
| R002（SKILL 読み替え＋promote 同期） | templates eval と promote eval | `npm run test:it:amadeus-templates`、`npm run test:it:promote-skill` |
| R003 / N001（残存なし） | 3 分類判定表（code-summary）と grep 突合（reviewer 実施済み） | `grep -rni evaluator` |
| N002 / N003 | 標準検証と構造検証 | `npm run test:all`、`AmadeusValidator . 260705-evaluator-vocabulary` |

## 実行方法

一括実行は `npm run test:all`。RED→GREEN 証跡（fixture 追随）は code-summary.md に記録済み。
