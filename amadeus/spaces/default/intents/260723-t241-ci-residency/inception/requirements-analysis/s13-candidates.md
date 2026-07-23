# §13 学習候補 — requirements-analysis(260723-t241-ci-residency)

提出: conductor e1、2026-07-23T01:35Z 頃。採否選挙用 verbatim 正本。

## 候補1(採用提案)

**候補文**: 1問様式の questions ファイルは required-sections センサーの H2 floor(≥2)に構造的に落ちる — 質問が1問しかない場合は「## 裁定の記録」節(裁定成立後に E-code・票数・GoA・受容度・leader 承認 TS を転記する定型節)を第2 H2 として置く。0問様式の既習形(## 質問 + ## 0 件の根拠)の1問版対応。

**統合先想定**: cid:requirements-analysis:eoc1-evidence-in-questions-header への追補(様式面)。

**実測根拠**: 本ステージで questions(1問)への required-sections 発火が2回 FAILED(audit 01:14:48Z / 01:18:52Z、Findings 3)→「## 裁定の記録」節の追加後に PASSED(01:19Z 台)。前 intent(4問様式)では同センサー PASSED — 質問数依存の構造差を対照実測。

## 不採用(PM 違反実例カウントへ回付)

- **(a)** 起草時の FR-2 が上流 code-structure.md:10 の伝播候補列挙を 2/3 欠落 — cid:enumeration-completeness-review の違反実例(reviewer iteration 1 Major で捕捉、全数採用へ是正)
- **(b)** NFR-4 に非数値語「顕著な」を書いた — inception 規範(測定可能な閾値)の違反実例(+60秒/265s≈23% へ数値化是正)

0件ではなく候補1件です。選挙をお願いします。
