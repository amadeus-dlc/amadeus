# Business Rules — agmsg-trial-docs

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## ルール

| ID | ルール | 出典 |
|---|---|---|
| BR-1 | 成果物は Intent record の Construction 成果物としてだけ置く。docs/amadeus/ 新設と team.md 直接更新はしない（正は Issue #497 に一本化） | FR-4.1、C-2、ピア協議 Q1 |
| BR-2 | 定型文の実例は received-messages.md の保全原文だけを出典とする | C-6 |
| BR-3 | 適用条件節を文書の先頭に置き、team.md への統合は「後続 Intent の起票」を引き継ぎ先として明記する | FR-3.1、FR-3.2、ピア協議 Q4 |
| BR-4 | 実装コードとテストコードを変更しない（docs 系 refactor） | C-1 |
| BR-5 | codekb/amadeus/ を変更しない | C-4 |
| BR-6 | 日本語で書き、japanese-tech-writing の規範に従う。機械可読ラベルは英語のまま使う | NFR-1 |
| BR-7 | 事実は出典（Issue、audit イベント、agmsg 受信時刻）を明示し、未確認の値は `未確認` と書く | NFR-3 |
| BR-8 | 各成果物文書は H2 見出し 2 個以上を持つ（required-sections sensor） | NFR-2 |
| BR-9 | 中継承認定型文の必須項目に HUMAN_TURN mint 指示を含める（gate の人間承認で確定した項目追加） | FR-1.2、A-3 |
| BR-10 | 成果物の節 1 に、team.md 統合（後続 Intent 起票）と #497 コメント転記（merge 後に leader 実施）の 2 つの引き継ぎを併記する | FR-3.2、FR-4.2 |
| BR-11 | code-generation はコードを生成せず、成果物文書を record dir へ直接執筆する（business-logic-model.md の「code-generation 向け実行方針」に従う） | FR-4.1、C-1、C-2 |

## 検証の分担

- BR-1 / BR-4 / BR-5 は diff レビューと `npm run test:all` で担保する。
- BR-2 / BR-3 / BR-9 は reviewer（amadeus-architecture-reviewer-agent）と gate の人間承認で担保する。
- BR-6 / BR-7 は reviewer と PR レビューで担保する。
- BR-8 は required-sections sensor が gate 時に検査する。
