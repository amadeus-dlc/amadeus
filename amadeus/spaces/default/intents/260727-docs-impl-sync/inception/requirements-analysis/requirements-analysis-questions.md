# Requirements Analysis — 質問ファイル (260727-docs-impl-sync)

モード: Grill me(2026-07-27 ユーザー選択)。grilling-protocol.md 準拠 — 質問は提示直前に動的追記、回答は受領直後に書き戻し。

質問の導出元(上流入力の実参照): Q1・Q3 は codekb architecture.md「docs が追随できていない構造変化」節と business-overview.md の EN/JA 情報格差 blockquote が示す乖離クラスタ(hook 件数不整合・Kimi/hook の発生源2系統)から、Q2・Q5 は code-structure.md「docs ツリーと正本コードの対応関係」節の docs 197ファイル構造(非対訳 EN 3件・全域照合の母集団)から、Q4 は intent-statement.md「Success Metrics」の全域 HEAD 照合裁定(Q6=A)から導出した。

## 裁定の記録

- 全5問をユーザー本人が Grill me モードで裁定(ソロモード・選挙不要: ユーザー直接回答)。Q1=A / Q2=A / Q3=C / Q4=A / Q5=A
- 合意サマリー確認「Yes, confirmed」
- ユーザー承認: 2026-07-27T07:18:10Z

## Q1. hook 件数表記の正準化方針(EN 側の count-free 6ファイル vs 硬数値 twelve の 06-hooks-and-tools.md の不整合をどちらへ揃え、JA も同方針で同期するか)

- A. count-free を正準とする: 散文の件数語(「twelve」等)は全て「all framework hooks」型へ置換。roster 表(06-hooks-and-tools.md の一覧)だけが列挙を持つ。JA も同方針で同期
- B. 硬数値を正準とする: 全ファイルで「12」に統一(次の hook 追加で再度全ファイル更新が必要)
- C. 現状の混在を容認し、JA だけを EN の各ファイル現状に合わせる
- X. Other (please specify)

[Answer]: A. count-free 正準(2026-07-27、Grill me)

## Q2. 非対訳 EN 3件(docs/guide/team-messaging.md、docs/guide/publishing-setup.md、docs/research/upstream-sync/reports/v2.2.0-to-v2.3.0-plan.md)の扱いは?

- A. guide 2件は .ja.md を新規作成(EN/JA pairing 適用)、research 報告は凍結研究記録として対象外
- B. 3件すべて対訳を新規作成
- C. 3件すべて対象外(現状維持)
- X. Other (please specify)

[Answer]: A. guide 2件のみ対訳作成、research 報告は対象外(2026-07-27、Grill me)

## Q3. 修正 PR の分割単位は?(乖離クラスタ A=README Kimi 欠落 / B=19-plugins 件数 / C=EN/JA hook 乖離 8ファイル+既存乖離+対訳新規)

- A. クラスタ別に複数 PR(A/B/C を独立レビュー可能に分割。C が大きければさらに分割)
- B. 単一 PR(全乖離修正+対訳新規を1本にまとめる)
- C. 起因別 2 PR(Kimi 起因 = A+B / hook 起因+その他 = C)
- X. Other (please specify)

[Answer]: C. 起因別 2 PR — Kimi 起因(A+B)/ hook 起因+既存乖離+対訳新規(2026-07-27、Grill me)

## Q4. 区間外の既存乖離(例: 01-architecture{,.ja}.md の「Eleven flat agent files」— 実ファイル14)は修正対象に含めますか?

- A. 含める(intent-capture Q6=A の全域 HEAD 照合の帰結。全域監査で検出された乖離は区間内外を問わず修正)
- B. 区間内の乖離のみ修正し、区間外の既存乖離は Issue 起票に留める
- X. Other (please specify)

[Answer]: A. 含める — 全域監査で検出された乖離は区間内外を問わず修正(2026-07-27、Grill me)

## Q5. 全域照合(docs 197ファイル+README 2)の検証深度は?(RE は区間差分+重点照合まで実施済み。残り全域の照合方法)

- A. 二層方式: 機械照合(件数・パス・識別子・コマンド名の grep 突き合わせ)を全ファイルへ、精読照合は変更ホットスポット+機械照合でヒットした文書のみ
- B. 全ファイル精読照合(197ファイル全文を実装と突き合わせ — 網羅最大、コスト最大)
- C. 機械照合のみ(精読なし — 意味論の乖離を見逃すリスク)
- X. Other (please specify)

[Answer]: A. 二層方式 — 機械照合を全ファイル、精読はホットスポット+機械照合ヒット文書のみ(2026-07-27、Grill me)
