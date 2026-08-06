# Stage Memory — requirements-analysis

## Interpretations

- 2026-08-05T06:30:00Z — 質問6問(#2253 裁定事項3件 + スコープ追加の advisory 面 + CLI 細目 + 旧仕様ピン範囲)を起草し、ソロ選挙 E-SRA-RA1 で一括審議した。2-0 established(choice 1「6問すべて推奨どおり採用」、`GoA[E-SRA-RA1]: 2x2`)。`decide-question` により6件とも `decider: solo-election` / `reviewState: unreviewed` で記録。
- 2026-08-05T06:30:00Z — 承認済み上流(`intent-statement.md` / `scope-document.md`)がともに「無人解決4段」と書いているのに対し、本要件は RE 実測に基づき **5段**とした。無申告逸脱を避けるため requirements 冒頭に訂正申告段落を置いた(`cid:requirements-analysis:approval-lineage-citation`)。

## Deviations

- 2026-08-05T07:10:00Z — 選挙裁定 Q5=A(`--autonomy` は `semi|full` の2値)を**ユーザー裁定により 3値**(`none|semi|full`)へ改訂した。仕様変更はエスカレーション正準リスト(4)によりユーザー専権であり、選挙裁定を上書きする。趣旨(不可逆寄りの grant 取消をフラグの側面効果にしない)は `--autonomy none` の受理条件(active grant 不在時のみ受理、grant ありは loud 拒否)として保存。反映先: questions Q5 の `[Answer]`、requirements の FR-CLI-1 / FR-CLI-2 / C-3 / トレーサビリティ表、scope-document In-2 と承認系譜。

## Tradeoffs

- 2026-08-05T06:30:00Z — 選挙 CLI は1選挙1質問の様式だが、6問を個別選挙にすると投票コストが6倍になるため、各問の agent recommendation を束ねた一括審議形(choice 1 = 全採用 / 2 = 一部別案 / 3 = 質問自体に欠落)とした。投票者には各問を独立に検証するよう指示し、実際に per-question の検証結果が両票から返っている。

## Open questions

- 2026-08-05T06:45:00Z — §12a reviewer(iteration 1)が READY(BLOCKER 0)を返したが FOLLOW-UP 7 件を残した。要旨: (1) FR-LAD-1 の `:511-514` が自文書内の `:512` ピンおよび codekb の `:510-514` と自己矛盾 (2) `isFullyAutonomousIntent` の範囲 `:167-176` が codekb 実測 `:167-178` と不一致 (3) FR-DOC-2 の「on-disk ミラー 14 本」の出所が code-structure.md 現在節に存在しない (4) A-1 の「HEAD と observed で同値」の根拠が7ファイル分のみで、`amadeus-bolt.ts` ほか5ファイルの測定基礎が未記載 (5) FR-ADV-1 に無人裁定で用いる occurrence 種別の指定がない(採用された Q4 選択肢 A 本文の「question 相当の occurrence を組み」が要件化で落ちた) (6) Intent analysis 4 の plugin 非依存主張が自文書の FR-ADV-5 AC(射程注記の併記)を満たしていない (7) FR-LAD-6 / FR-ADV-5 の AC に機械判定面が未指定。**(1)〜(4) と (6) は application-design 着手前に是正、(5) は application-design の設計事項として送付、(7) は build-and-test の検査設計へ送る。**
- 2026-08-05T06:45:00Z — §13 学習候補: 選挙 CLI が1選挙1質問様式であるため、多問ステージでは束ね形の選挙定義が要る(本ステージで実践)。一般化価値の有無は §13 選挙で裁定する。
