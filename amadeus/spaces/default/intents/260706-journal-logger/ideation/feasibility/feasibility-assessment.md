# Feasibility Assessment — 260706-journal-logger（Issue #557）

## 上流入力

[intent-statement.md](../intent-capture/intent-statement.md)。

## 技術的実現可能性

| 観点 | 評価 | 根拠（実測） |
|---|---|---|
| journal 契約（置き場 + 形式） | 高 | 追記専用の前例 = audit shard / timestamp.md。space レベル成果物の前例 = memory / knowledge / codekb。ピア協議 4 問で形式確定中 |
| validator 拡張 | 高 | amadeus-validator は Amadeus 独自（parity 影響なし = ディスパッチ確認）。契約追加の前例 = #501（codekb 参照解決）、#458 系。skill 変更は promote 経由 |
| journal-logger の実体 | 中〜高 | agmsg の join / actas / spawn 機構は実在（agmsg スキルの spawn.sh）。ただし常設 spawn の運用前例がないため、初回は手順書 + 人間起動（ディスパッチ指示 2 で確定済み） |
| ack 機構 | 高 | agmsg send の双方向は本日の運用で実証済み。定型 ack は軽量モデルで実行可能な複雑度 |
| #556 移行 | 高 | 本文 + コメント 3 件の有限エントリ。形式は Q2 確定後に機械的変換 |

## 実現方式の要点

1. 契約文書（journal の規約 = 形式・追記規律・参照方向・昇格スタンプ）を新設し、validator に構造検査（Q3 確定範囲）を追加する。
2. journal-logger は「役割 prompt + worktree 準備 + spawn 手順 + 日次 PR 手順」の手順書として納品し、初回起動は人間 / leader が行う。
3. #556 の既存エントリを Q1/Q2 確定形式で journal/ へ移行し、#556 へ参照コメントを残す（クローズは人間）。

## 結論

実現可能。ブロッカーなし。設計 4 問の確定（ピア協議中）を待って scope-definition へ進む。
