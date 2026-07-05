# Requirements Analysis 質問（260705-engine-installer）

上流入力: [initiative-brief.md](../../ideation/approval-handoff/initiative-brief.md)、[decision-log.md](../../ideation/approval-handoff/decision-log.md)

Ideation から引き継いだ残実装判断 3 件（O1〜O3）をピア協議（leader + engineer1, 3 宛、期限 15 分・回答 1 件で成立）で確定する。

---

## Q1. スクリプトの置き場所と命名（O1）

A. `scripts/amadeus-install.ts` を新設（npm script は `amadeus:install`）。利用者向け入口を開発用 `dev-scripts/` と分離する。eval は `dev-scripts/evals/installer/check.ts` + `test:it:installer` として `test:it:all` へ組み込む
B. `dev-scripts/amadeus-install.ts`
C. リポジトリ root 直下
X. Other (please specify)

[Answer]: A（ピア協議成立・回答 3 件で全員一致。回答者: leader=A、engineer3=A（scripts/** は dev-scripts ルールの対象リストに既載で TDD 規律がそのまま適用）、engineer1=A（L18 の実在と scripts/ dir 未存在 = 新設で衝突なしを実ファイルで裏取り）。採用判断: engineer2）

## Q2. AMADEUS.md の利用者向け再構成の程度（O2）

A. installer が本体開発前提の節を除去した利用者向け AMADEUS.md を変換生成する。単一ソース（repo の AMADEUS.md）+ 宣言的な節除去リスト + eval 検査の 3 点セット
B. そのまま全文コピー
C. 別ファイルを手書きで維持
X. Other (please specify)

[Answer]: A（ピア協議成立・全員一致。回答者: leader、engineer3、engineer1。採用判断: engineer2。補足の取り込み: eval は双方向検査とする — (負方向) 生成結果に dev 参照パターンが残らないこと（leader）、(正方向) 除去リストの見出しが原本 AMADEUS.md に実在すること（engineer1・engineer3 = リスト陳腐化・見出し再編の無言破壊を検出））

## Q3. settings.json マージの実装詳細（O3）

A. hooks 配線のみマージ。settings.json 不在なら hooks だけを持つ最小 JSON を新規作成。既存 hooks 配列は matcher+command で重複排除 union。env / permissions 等には一切触れない
B. env の一部もマージ
C. settings.json 全体を置換
X. Other (please specify)

[Answer]: A（ピア協議成立・全員一致。回答者: leader、engineer3、engineer1。採用判断: engineer2。補足の取り込み: 既存 hooks の順序保持を仕様化し、マージ後 JSON の再読込検証を実ファイル駆動の eval に含める（engineer3、B002 の union マージ前例）。『必須 env なし』は engineer1 が現物で裏取り済み（env 19 キーはすべてハーネス個人設定。マージすると個人設定の押し付けになる）。feasibility の一次調査は eval A-1 検証で最終確定する）
