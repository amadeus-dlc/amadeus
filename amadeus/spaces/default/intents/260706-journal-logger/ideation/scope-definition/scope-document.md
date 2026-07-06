# Scope Document — 260706-journal-logger（Issue #557）

## 上流入力

[intent-statement.md](../intent-capture/intent-statement.md)、[feasibility-assessment.md](../feasibility/feasibility-assessment.md)、[constraint-register.md](../feasibility/constraint-register.md)（C-1〜C-7）。

## スコープ内（本 Intent の PR 納品物 5 点）

1. **journal 契約 doc**: `amadeus/spaces/default/journal/` の規約（日次ファイル、定型 4 フィールド、種別語彙 + 拡張手順 1 行、追記専用、参照方向、昇格スタンプ）。配置は journal/README.md（契約は置き場と同居させ、利用者が журнал を開けば規約に到達できる形）。
2. **validator 拡張**: journal の最小 3 条件検査（skills/amadeus-validator → promote 昇格）。
3. **journal-logger 手順書 + 役割 prompt**: worktree 準備、agmsg join / spawn 手順、役割 prompt（受信 → 整形追記 → ack、仕分け提案、日次 PR、不達時 fallback）、軽量モデル指定。
4. **#556 移行**: 既存エントリ（本文 + コメント 3 件）を確定形式で journal/ へ移行 + #556 への参照コメント文面（投稿は人間 / leader）。
5. **運用検証チェックリスト**: 受け入れ条件 2〜3 の合否基準（追記 + ack の実働、仕分け 1 件の定着経路接続）。

## スコープ外

| 項目 | 行き先 |
|---|---|
| logger の実 spawn と常設運用 | 人間 / leader の初回起動（手順書に従う。C-1） |
| 受け入れ条件 2〜3 の実働実績の記録 | 初回起動後の運用検証（チェックリストへ） |
| #556 のクローズ操作 | 実働確認後の人間操作（C-6） |
| 仕分け種別の追加（語彙行き / surface 系） | 実例観測後に拡張手順で後追い（feasibility Q2 付帯） |
| journal の lint 化・自動棚卸しツール | 将来（#530 系譜。まず運用実績） |

## 最小実行可能スコープ

納品物 5 点 + 検証 pass。これで「置き場と書き込み機構の欠如」（Issue 背景）が契約・手順として解消し、初回起動の前提が揃う。

## 優先順位（MoSCoW）

- Must: 納品物 1〜4、検証 pass。
- Should: 納品物 5（チェックリスト）。
- Won't（本 Intent）: スコープ外表のすべて。
