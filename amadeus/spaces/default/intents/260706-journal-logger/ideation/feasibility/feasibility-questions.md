# Feasibility Questions — 260706-journal-logger（journal 契約の設計論点）

## 上流入力

[intent-statement.md](../intent-capture/intent-statement.md)（4 点構成と受け入れ条件）。前提実測: #556 は Issue 本文 + コメント 3 件の日次見出し形式（体制の変遷・調停等の小見出し）。audit は `<record>/audit/` の shard 追記型。

Issue が確定済みの構成（置き場 path、追記専用、ack 必須、仕分け 3 分類、参照方向）は再質問しない。ファイル・運用の細部 4 問を全メンバー同報ピア協議で確定する（journal は全メンバーが書き込みを依頼する共有契約のため）。

## Q1. journal のファイル分割単位

- A. 日次ファイル `amadeus/spaces/<space>/journal/<YYMMDD>.md`（追記は常に当日ファイル末尾。日次 PR の単位と一致し、conflict 面が日単位で閉じる）
- B. 単一ファイル `journal.md` へ永続追記（肥大化する）
- C. 発信者別ファイル
- D. その他
- X. Other (please specify)

[Answer]: A（日次ファイル journal/<YYMMDD>.md）。ピア協議 5/5 一致。補強: audit shard の conflict 面分割と同型（engineer2）、本日の intents.json union 頻発（当方 4 回 / engineer1 も #566 で 2 回）の再生産を B は招く。#556 の日次見出し運用とも一致（leader）。

## Q2. エントリの必須フィールドと形式

- A. 見出し 1 行 + 定型 4 行: `## HH:MM:SSZ <種別> — <要約>` + `- 発信者:` / `- 種別:`（調停 / 委任 / 体制 / 観察）/ `- 本文:`（整形済み）/ `- 昇格:`（未昇格 = `-`、昇格時に cid / PR # を logger が追記）
- B. JSON Lines（機械可読優先。人間の読み書きが重い）
- C. 自由形式（validator 検査が難しい）
- D. その他
- X. Other (please specify)

[Answer]: A（見出し 1 行 + 定型 4 フィールド）。5/5 一致。付帯採用: ①種別語彙（調停 / 委任 / 体制 / 観察）は閉集合固定にせず、「語彙の追加は journal 契約 doc の更新とセット」の拡張手順 1 行を契約に置く（engineer1）②昇格スタンプ欄は §13 persist 見送り運用（人間不在時の surface 候補）の受け皿と位置づける（engineer5 / engineer1）。engineer3/5 の仕分け種別追加案（語彙行き・surface 候補系）は、Issue 構成 3 の確定 3 分類を維持しつつ、実運用で実例が出たら拡張手順で追加する後追い方式とする（Right-Sizing。steering 候補の注記で当面表現可能）。

## Q3. validator の journal 構造検査の範囲

- A. 最小 3 条件: journal/ 直下は `<YYMMDD>.md` のみ / 各エントリに必須 4 フィールド（発信者・種別・本文・昇格）が揃う / 種別が定義済み語彙（調停・委任・体制・観察）である
- B. A + 時系列順序の検証（同日内の見出し時刻昇順）
- C. 存在確認のみ
- D. その他
- X. Other (please specify)

[Answer]: A（最小 3 条件）。5/5 一致。時刻昇順（B）は追記専用規律の帰結のため検査しない。将来ずれの実例が観測されたら B へ後追い拡張（engineer3）。validator pass の意味論（実行時参照に必要な最低限の構造）と一致（engineer1/2/3）。

## Q4. journal-logger の agmsg ack と仕分けの返し形式

- A. ack は 1 メッセージ固定形式「【journal 追記】<日付ファイル>#<見出し> に記録（種別: X）。仕分け: 生ログ / learnings 候補（→ 該当 Intent の §13 へ）/ steering 候補（→ 反映 Intent バックログへ）」。仕分けが候補の場合は同じ ack に提案を含める（往復 1 回で完結）
- B. ack と仕分け提案を別メッセージにする
- C. ack のみ（仕分けは日次 PR 時にまとめて）
- D. その他
- X. Other (please specify)

[Answer]: A（ack 1 メッセージ固定形式 + 仕分け提案同梱）。5/5 一致。付帯採用: ack に追記先ファイルと見出しアンカーを含める（leader = 監査性）。
