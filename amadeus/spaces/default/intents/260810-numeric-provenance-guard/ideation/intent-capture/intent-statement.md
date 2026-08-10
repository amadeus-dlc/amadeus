# Intent Statement — 成果物数値の provenance ガード(第1段)

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない)。一次入力 = GitHub Issue #2815 本文とクロスレビュー2件(reviewer-1 / reviewer-2、収束 ESTABLISHED_WITH_REFINEMENTS、対象 SHA c909b6130)、intent-capture-questions.md の裁定、ユーザー起動指示。

## Problem Statement

ステージ成果物・報告に書かれる数値(件数・PASS/FAIL 数・%・実測値)が「コマンド出力からの転記」であることを機械的に担保する検査面が存在しない。規律は memory 層の prose ノルムのみで、E-PM7 L1 採用時に同日4件の違反再発が実測され、ノルム成立後(post-adoption)にも再発が続いている(reviewer-2 実測: c1-future-value-trace 2026-08-02 / provenance 併記則 2026-08-05 はいずれも numbers-from-command-output-only 成立後の追加 = ノルムを積んでも止まっていない直接証拠)。誤値は裁定・レビュー・下流成果物・公開面(Issue #1478 本文の 1.05秒/個)まで伝播する。

数値 provenance を検査するセンサーは 0 件(reviewer-1 実測: `ls -1 packages/framework/core/sensors/*.md | wc -l` = 13、`grep -h '^id:'` 全数実読 — 数値を扱う sensor は 4 件実在するが責務はいずれも「成果物自身の計量」であり出所検査ではない)。

## Target Customer

- ステージ成果物を書く conductor / builder — 違反の現行発見経路は §12a レビューイテレーションの消費
- 成果物数値を信頼して裁定する人間・レビュアー — 併記がない数値は再導出不能な「主張」に留まる
- 下流の読み手・公開面 — 誤値の伝播先(GitHub Issue 本文まで到達した実測あり)

## Success Metrics

Issue #2815 完了条件をクロスレビューの訂正で限定したもの(questions Q3 裁定):

1. **落ちる実証** — 集計コマンド併記なしの数値断定を含む fixture でセンサーが FAILED になること
2. **corpus sweep + 観測レンジ内閾値** — 既存成果物コーパスへの sweep で偽陽性率を実測し、しきい値・適用範囲(対象ステージ/成果物種別)を観測レンジの内側で確定すること(`cid:code-generation:c1-threshold-inside-observed-range` 準拠)。reviewer-1 のプロトタイプ実測により、素朴な近傍併記述語の未併記率は対象スコープ次第で 27.6%〜66.1%(2.4 倍)動くことが確定しており、対象は「成果物種別 × 数値の意味クラス」で定義しなければ findings が 3〜4 桁規模になる — sweep と閾値確定は任意ではなく成立条件
3. **適用限定の保存** — 定型 ack・軽量報告は対象外のまま(ノルム既定の適用限定を検査にも写す)

**効能範囲の明示(クロスレビュー両名の収束訂正)**: 第1段が検出できるのは provenance **不在**クラス(46件 vs 35件の ref 無記載型)のみ。算術誤り(1.05 — 式は書けるが誤答)・二重計上(列挙はあるが数え方の誤り)は併記があっても通過する — これらは derived-value-shows-formula / ledger-count-mechanical-recalc の管轄で、第1段では構造的に検出不能。「fabrication クラスの混入検出」という広い表現は採らない。

## Initiative Trigger

E-PM7 L1(2026-07-16 採用 4/4)が明文で予約した「機械ガード化は将来 Issue」の履行。Issue-first 起票(#2815)+ クロスレビュー2名成立(issue-cross-review 前提充足)+ ユーザーの明示起動指示。代替案(prose 追記 / 全数値の自動再実行照合 / レビュアー観点追加のみ)は Issue 本文で検討・非採用済み。

## Initial Scope Signal

- スコープ: `self-feature`(Amadeus 自体の新機能 — センサー層の新規 manifest + 検査ツール)
- 本 intent の範囲 = **第1段のみ**: 数値主張パターンの近傍に集計コマンド・測定 ref の併記があることを検査する **advisory センサー**(ユーザー起動指示で確定)。第2段(併記コマンドの再実行可能書式検査)は別裁定・スコープ外
- 実装先例: **nfr-budget**(成果物 md 中の数値パターン検査 + 観測レンジ内閾値 — reviewer-2 指摘の最近接先例)および **answer-evidence**(prose 規律 → 決定的検査への昇格 + enforcement cutoff 機構 — 遡及適用の既製の型)
- 規範正本: project.md「実測値には provenance を添える」(cid:nfr-design:c3-fix-induced-blocker-lssads13 末尾の追補 — 要求内容を逐語で規定した最も近いノルム)
- 設計段への委譲(questions 参照): 対象クラス定義 / enforcement cutoff 採否 / #1237 述語エンジン共通化 / 適用限定の matches への写像
