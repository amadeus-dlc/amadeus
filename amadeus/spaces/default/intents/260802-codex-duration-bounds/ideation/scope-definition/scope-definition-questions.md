# Scope Definition 質問 — 260802-codex-duration-bounds

> E-OC1 証跡: ソロモード・選挙不要判定（根拠種別: Q1〜Q3 と follow-up Q2a はユーザー本人の HUMAN_TURN 直接回答 — Guide me 対話）。合意サマリのユーザー承認タイムスタンプ: 2026-08-02T02:41:01Z（「1」= 正しい）
> モード: Guide me（全3問）
> 選択日時: 2026-08-02T02:33:41Z
> 上流入力: `intent-statement`、`feasibility-assessment`、`constraint-register`
> 既決事項である `#1602 → #1998 → #1999 → #1919` の依存順、1 Issue = 1 Bolt、各 Bolt 後の rebase、着手 Issue だけへの `in-progress`、Codex 専用安全ゲートを作らない方針は再質問しない。
> Select "Other" on any question to discuss it before answering.

## Q1. 4 Issue の MoSCoW 優先度をどう置くか

A. **4件すべて Must（推奨）** — #1602 の計測、#1998 の停止性、#1999 の対話予算、#1919 の有界 swarm を一つの完了契約として扱う
B. #1602 と #1998 を Must、#1999 と #1919 を Should — 計測と停止性を先に完了し、残りは余力次第にする
C. #1602 だけ Must、残りは Should — ベースライン確立だけを最小価値とする
D. 4件を別 Intent に分割する — 本 Intent は #1602 だけへ縮小する
X. Other (please specify)

[Answer]: A. 4件すべて Must（推奨）（2026-08-02T02:34:40Z）

## Q2. harness 検証の完了範囲をどう定義するか

A. **影響を受ける harness の adapter conformance を blocking、全 distribution の drift check を blocking、live journey は capability 条件付き（推奨）**
B. 全 supported harness の live journey まで blocking — 実モデル実証を全 harness へ要求する
C. Codex と Claude Code だけ blocking — 他 harness は distribution drift のみ確認する
D. Codex だけ blocking — 他 harness への波及は後続 Intent にする
X. Other (please specify)

[Answer]: X. Other — 「Codexだけ謙虚だというのはあるけど、そもそもプロンプトがあいまいということであれば、Codexがきっかけだったけど、そこは広くハーネススコープを広げたほうがいいという判断になるのでしょうか？どうでしょうか？」（2026-08-02T02:36:34Z、discussion。最終選択は Q2a）

## Q2a. 観測面ではなく契約の所有範囲で harness scope を決めるか

Codex だけで長時間化が顕著でも、原因が共有 prompt／core 契約なら全 supported harness を契約スコープに含める。一方、Reverse Engineering で Codex overlay 固有と実証された部分だけは Codex adapter の責任に残す。

A. **この境界で確定（推奨）** — 共有契約は全 supported harness、影響 adapter conformance と全 distribution drift は blocking、live journey は Codex 一次＋他 harness capability 条件付き
B. 全 supported harness の live journey まで blocking にする
C. Codex だけを契約・live とも blocking にする
X. Other (please specify)

[Answer]: A. この境界で確定（推奨）（2026-08-02T02:37:12Z）

## Q3. Intent の完了境界をどう置くか

A. **各 Issue を独立 Bolt／PR として受入し、4 Bolt 後に統合 workload と fresh-session dogfood を通して完了（推奨）**
B. 各 Issue の個別受入だけで完了 — 最終統合 dogfood は行わない
C. 4 Issue を1 PRへまとめて一括受入する
D. #1602 の baseline 完了時点で再スコープし、後続完了条件を改めて決める
X. Other (please specify)

[Answer]: A. 各 Issue を独立 Bolt／PR として受入し、4 Bolt 後に統合 workload と fresh-session dogfood を通して完了（推奨）（2026-08-02T02:39:42Z）

## Q4. 回答全体の確認

次のScope決定で成果物を生成する。

1. #1602、#1998、#1999、#1919 はすべて Must。
2. 依存順は `#1602 → #1998 → #1999 → #1919`、1 Issue = 1 Bolt／PR、各着地後に後続を rebase する。
3. 共有 prompt／core 契約は全 supported harness を対象にする。影響 adapter conformance と全 distribution drift は blocking、live journey は Codex 一次＋他 harness capability 条件付きとする。
4. 各 Issue を個別受入し、4 Bolt 後に統合 workload と fresh-session dogfood を通して Intent 完了とする。
5. 具体的な時間・反復・並列上限は #1602 baseline 後の NFR で確定する。固定納期は置かない。
6. 実着手する Issue だけへ `in-progress` を付与し、現在は #1602 のみ着手中とする。

A. **正しい（推奨）**
B. 修正が必要
X. Other (please specify)

[Answer]: A. 正しい（推奨）（2026-08-02T02:41:01Z）

## Q5. 次回のために追加で残すことはあるか

A. 追加なし（推奨）
X. Other (追加内容を自由記述。内容がある場合は Interpretation／Deviation／Tradeoff／Open question の分類を続けて確認する)

[Answer]: A. 追加なし（推奨）（2026-08-02T02:44:37Z）
