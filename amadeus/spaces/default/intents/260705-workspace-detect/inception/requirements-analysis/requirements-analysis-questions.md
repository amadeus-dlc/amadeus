# Requirements Analysis 質問（260705-workspace-detect）

対象 Issue: [#459](https://github.com/amadeus-dlc/amadeus/issues/459)

Maintainer の包括委任（sub 割り当て）に基づき、推奨案で自己回答する。

---

## Q1. 検出の広げ方は？

A. 言語カウントの再帰対象を「定型 source dir（src/app/lib/pages/components/tests）のみ」から「SCAN_EXCLUDE とドット始まりを除く全トップレベルディレクトリ」へ広げる（深さ上限は既存の 6 を維持）。brownfield 判定は既存の hasSourceFiles 経由で自動的に正しくなる
B. git 履歴や aidlc record の有無を新しい brownfield シグナルとして追加する
X. Other (please specify)

[Answer]: A（根本原因に直接対応する最小修正。本リポジトリの実コードは dev-scripts/ skills/ lints/ にあり、定型 dir 前提が観測された誤判定の原因そのもの。B は「コードは無いが git 履歴はある」ワークスペースを brownfield に倒す新しい誤判定を生みうるため、必要が観測されてから検討する）

## Q2. ドット始まりディレクトリ（.agents 等）の扱いは？

A. 再帰対象から除外する（ドット dir は設定・ハーネス領域という一般慣行。SCAN_EXCLUDE の明示列挙も維持）
X. Other (please specify)

[Answer]: A（.agents のエンジン TS を数えなくても、dev-scripts/ 等の可視コードで判定は成立する。ドット dir を数えると「ハーネスだけ入れた空プロジェクト」を brownfield に誤倒しする）
