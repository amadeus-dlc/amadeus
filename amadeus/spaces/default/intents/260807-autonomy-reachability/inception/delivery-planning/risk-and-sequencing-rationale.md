# Risk and Sequencing Rationale — autonomy-reachability(#2378)

上流入力(consumes 全数): unit-of-work-dependency.md(DAG)、unit-of-work.md(規模・境界)、unit-of-work-story-map.md(ジャーニー合成)、requirements.md(FR-5e・Assumptions)、components.md(リスク R1〜R3 の対象面 = C1〜C5 の患部定義元)、scope-document.md(D2 dependency-first)。

## 順序の根拠(リスク制御としての明示)

1. **u1 を walking skeleton に置く理由**: 認可・state・audit の中枢再配置は本 intent 最大の技術リスク。先頭で end-to-end に通し人間ゲートで確認しない限り、後続 Bolt(u2 の e2e、u5 の計測)の受け入れ基準が偽グリーン化する窓が開く(cid:intent-capture:reenablement-regression-risk の封じ込め = 順序)
2. **u2 を u1 の後に直列化する理由**: FR-1d の e2e は u1 の canonical 書込が前提。逆順は「birth 同時宣言が成立したのに state に見えない」— 本 intent が是正しようとしている欠陥そのものを新経路で再生産する
3. **u4 を u2 の後に置く理由(FR-5e)**: 導線が先行着地すると「書いてあるのに birth 時に動かない」導線を作る(RE 仮説 H1 の採用)
4. **u5 を最終に置く理由**: 適用後計測は全観測面(u1/u2/u3)の着地が前提。早期実行はベースライン比較が不成立
5. **u3・u6 の並行挿入**: ファイル非交差実測済みで依存なし — リソース効率(バッチ委任)を優先

## RAID(リスク・前提・課題・依存)

- **R1(リスク)**: base 前進で patch surface が動く — 対策: 各 Bolt の再接地定型(base-advance-regrounding)。現時点の差分区間は無交差実測済み(RE finding 11)
- **R2(リスク)**: t450×2 の契約改訂が他ピン(provenance 要求)を巻き込む — 対策: FR-1c の対角実測(改訂後×修正前)を Bolt 2 の必須記録に
- **R3(リスク)**: coverage 並行実行の相互破壊 — 対策: coverage:ci は branch ごと単独所有(c1-coverage-single-owner)。並行 Bolt では builder に coverage 実行を禁じ conductor が直列実行
- **A1(前提)**: 検収バッチ化は Out of scope(別 Issue 起票) — 節目検収は 1 turn = 1 件の現行制約下で行う(本 phase 境界で実演済み)
- **D1(依存)**: 外部依存なし(GitHub API は PR 運用のみ)

## 走行単位の主張の限定

semi の走行保証は「質問で止まらない」まで — phase 完走の保証ではない(#2253 既決)。バッチ末尾ゲート(gated 投影)と walking skeleton・phase 境界の人間裁定は維持される。
