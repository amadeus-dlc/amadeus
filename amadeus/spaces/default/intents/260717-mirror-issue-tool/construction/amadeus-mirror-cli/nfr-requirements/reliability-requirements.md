# Reliability Requirements — amadeus-mirror-cli

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 要求

- R-1: fail-closed — close の AND 検査不成立・フィールド不在・gh 失敗はすべて exit 1 で停止(business-logic-model のエラー分類どおり。fail-open 偽グリーンを作らない)
- R-2: 冪等 — sync は決定的素材のみから本文を再生成(FR-3.2)。create の重複ガード(FR-2.2)で二重起票を防止
- R-3: 部分失敗の扱い — create で「Issue 起票成功 → フィールド書き込み失敗」の場合、起票済み番号を stderr に明示して exit 1(人間が手動でフィールド追記可能な情報を残す。ロールバック=Issue 自動クローズはしない — 不可逆操作の自動化を避ける P4)
- R-4: リトライ機構は持たない — 単発 CLI(technology-stack.md の実行モデル)では再実行が人間の自然な回復手段である(fault はフェイルファスト、再実行は人間判断 — error-classification 準拠)

## 検証

- integration テスト: AND 検査の falling proof(未完了 intent への close → exit 1)、重複 create → exit 1、フィールド書き込み失敗経路(fake で注入)
