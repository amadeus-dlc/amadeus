# Constraint Register — 260706-journal-logger（Issue #557）

## 上流入力

[intent-statement.md](../intent-capture/intent-statement.md)。

## 制約一覧

| ID | 制約 | 種別 | 出典 |
|---|---|---|---|
| C-1 | 実 spawn は人間 / leader の操作（手順書に切り出す。初回は手動起動 + 運用検証） | 段取り | ディスパッチ指示 2 |
| C-2 | logger は定着決定権を持たない（memory / knowledge への昇格は §13 human gate と steering 反映 Intent） | 設計 | Issue 構成 3 |
| C-3 | journal は追記専用（audit と同じ規律）。記録済みエントリを書き換えない | 品質 | Issue 構成 1、org.md |
| C-4 | 網羅相互リンク禁止（journal 側は昇格スタンプのみ） | 設計 | Issue 構成 4 |
| C-5 | validator 拡張は promote 経由で昇格。parity 影響なし | 実装 | ディスパッチ指示 3 |
| C-6 | #556 のクローズは人間（本 Intent は移行 + 参照コメントまで） | 運用 | Issue 受け入れ条件 4、merge は人間の原則 |
| C-7 | gate は auto 委任、draft PR ルール、4 イベント報告、PR 前に validator + test:all | 運用 | ディスパッチ指示 5 |
