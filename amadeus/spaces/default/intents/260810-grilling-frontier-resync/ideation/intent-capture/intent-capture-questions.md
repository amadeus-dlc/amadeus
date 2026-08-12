# Intent Capture — 明確化質問

**Intent**: 260810-grilling-frontier-resync / **Stage**: intent-capture (1.1) / **Depth**: Standard

> 前提: 本 intent は #2785(クロスレビュー済み 2-0・REFRAME 反映済み)と #2785 内の採用方針(上流骨格 `1495d014` 逐語+Amadeus overlay、depth = 枝刈り閾値、Free = standalone 既定、回路遮断器)を既決の前提知識とする。既決事項は再質問しない(cid:intent-capture:c1)。#2785 完了条件8 の設計裁定 (a)(b)(c) は要件段で扱うため本票にも含めない。以下は intent 粒度で真に未決の3点のみ。

## Q1. #2683(depth 制御の全体アーキテクチャ、OPEN)との調停

本 intent が変えるのは #2683 の制御点マップ L2(質問上限 4/8/12)の面そのもの。親裁定が未決のまま単独で再定義する構図をどう扱うか。

- **A. 本 intent 単独で進め、着地後に #2683 へ L2 変更を反映報告する(推奨)** — #2683 は「局所最適の防止」を目的とする調整 Issue であり、本件は grilling という単一消費者の終了意味論の是正。L2 の数値上限自体は workflow の他モード(Guide me 等)には残る
- B. #2683 側の親裁定(L2 の扱い)を先に仰いでから本 intent を進める
- C. 本 intent に #2683 L2 行の改訂まで同梱する
- D. その他(X)

[Answer]: A — 本 intent 単独で進め、着地後に #2683 へ L2 変更(grilling の終了意味論変更)を反映報告する。ユーザー承認: 2026-08-10T03:43:30Z(Guide me 構造化質問への直接回答)

## Q2. 受け入れ実証(dogfood)の扱い

#2785 完了確認は「複数領域の設計議論を1セッションで全分岐訪問済みまで完走」の実走を要求する。この実走に、本 intent の発端である Rust ナレッジ設計議論(10領域)を使うか。

- **A. Rust ナレッジ議論を standalone Free モードの受け入れ dogfood として使う(推奨)** — 動機となった実利用シナリオそのものが受け入れ実証になり、次の作業(Rust ナレッジ執筆)への接続も最短
- B. 受け入れ実証は任意の題材でよい(#2785 完了確認の文言のまま)
- C. その他(X)

[Answer]: A — 受け入れ実走 = Rust ナレッジ設計議論(10領域)を standalone Free モードで全分岐訪問済みまで完走する dogfood。ユーザー承認: 2026-08-10T03:43:30Z(Guide me 構造化質問への直接回答)

## Q3. 既存 drift 3箇所の同梱可否

クロスレビューが検出した #2063 の伝播漏れ(`stage-protocol.md:349` の "hybrid termination" 残存、`docs/reference/04-stage-protocol.md:320` / `.ja.md:264` の旧記述)。reviewer は「別起票が妥当」と所見、ただし本 intent の書き直し対象ファイルと重なる。

- **A. 書き直しで自然に消える面のみ同梱し、独立の修正作業としては扱わない(推奨)** — `:349` と docs の当該節は本 intent の改訂対象そのもの。別 Issue を立てても同一ファイル・同一節の変更が衝突する
- B. 3箇所とも別 Issue(documentation)として起票し、本 intent では触れない
- C. その他(X)

[Answer]: A — 書き直しで自然に消える面(stage-protocol.md:349・docs 2箇所の当該節)のみ同梱。独立修正としては扱わず別 Issue も立てない。ユーザー承認: 2026-08-10T03:43:30Z(Guide me 構造化質問への直接回答)
