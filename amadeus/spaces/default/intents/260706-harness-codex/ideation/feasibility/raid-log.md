# RAID Log — 260706-harness-codex（Issue #552）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

## Risks（リスク）

| ID | リスク | 影響 | 対応 |
|---|---|---|---|
| R-1 | openai.yaml を .agents/skills/ へ直接置くと、promote の丸ごと置換で消える | 中 | 設計論点 Q6 で配置を確定（推奨 B = source skills 側へ置き promote 経路に乗せる） |
| R-2 | 上流の skill 集合（38 件）と当方の skill 集合（41 件、amadeus 独自 skill を含む）が 1:1 でない | 中 | 写像は parity-map の skillNameMapping を正とし、上流に対応のない amadeus 独自 skill の扱い（同内容の yaml を付与するか、付与しないか）を実装時に決めて decision に記録 |
| R-3 | parity:check が新規 openai.yaml を将来検査対象にした場合の未宣言差分 | 低 | 現行実装は baseline 起点（新規ローカルファイルは fail しない = engineer1 実測 #534）。出自を PR 説明 + harness/codex の provenance に記録 |
| R-4 | engineer3 の #554（promote-skill / parity 正規化）との接触 | 低 | ファイル非接触見込み（ディスパッチ）。Q6 = B の場合は協議で接触面確認を兼ねる。#554 の変更は model overlay 系で openai.yaml と別ファイル |

## Assumptions（前提）

| ID | 前提 | 検証方法 |
|---|---|---|
| A-1 | 上流 openai.yaml は全 skill で同内容の guard である | 実装時の fresh clone で全件照合（純正性検証と兼ねる） |
| A-2 | Codex は skill を `.agents/skills/` で発見する | 上流 emit.ts 冒頭コメントで確認済み（実挙動の検証は Codex ハーネス導入時 = 将来） |

## Issues（課題）

- なし（ブロッカーなし）

## Dependencies（依存）

| ID | 依存 | 状態 |
|---|---|---|
| D-1 | 上流 awslabs/aidlc-workflows の b67798c3（dist/codex） | 取得可能（gh api で実在確認済み） |
| D-2 | 設計論点 6 問のピア協議回答 | 協議中（全メンバー同報、期限 15 分） |
| D-3 | Phase 2 の後続 Intent 起案 | 本 Intent 完了後（起案は人間と leader） |
