# Reliability Design — amadeus-mirror-cli

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 機構写像(reliability-requirements R-1〜R-4 → 実装機構)

| 要求 | 機構 |
|---|---|
| R-1 fail-closed | 全 handler は判別ユニオンの error 経路で早期 return(exit 1)。検査値は parse してから比較(verification-numeric-parse — 文字列比較は正規化後) |
| R-2 冪等 | renderBody は MirrorSnapshot の純関数(時刻は state の Last Updated を使い、生成時刻を混ぜない — 素材不変→出力不変) |
| R-3 部分失敗の情報保全 | handleCreate は gh 成功後のフィールド書き込みを try し、失敗時は起票済み番号を stderr へ明示して exit 1(自動クローズしない) |
| R-4 リトライなし | spawnGh は1回実行のみ。回復は人間の再実行 |

## 検証設計

- 分岐の網羅元は business-logic-model.md の決定木、実行前提は tech-stack-decisions.md(Bun 単発 CLI)。performance-requirements.md / security-requirements.md / scalability-requirements.md とは独立の信頼性面のみを扱う
- integration: close の AND 検査 falling proof(未完了 intent → exit 1)、重複 create → exit 1、R-3 経路(書き込み失敗 fake)
