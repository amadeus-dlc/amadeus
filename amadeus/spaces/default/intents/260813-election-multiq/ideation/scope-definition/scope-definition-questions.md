# Scope Definition 質問 — Election CLI 多問対応

## Settled Scope Boundary

以下の能力は、[Issue #2813](https://github.com/amadeus-dlc/amadeus/issues/2813) と [Intent Statement](../intent-capture/intent-statement.md) によりすべて in-scope と確定している。OPEN な能力がないため、最小スコープと must-have / nice-to-have の再質問は行わない。

1. 複数の問いと安定した問い識別子の表現
2. 問いごとの choice・GoA・留保の投票データ
3. 問いごとの裁定を保持する tally
4. 同一 Election 内の部分成立と部分保留
5. 保留中の問いだけを対象にした再実行
6. 既存単問データの後方読み取りと追記型履歴の維持
7. 多問を扱う Election CLI の入出力契約
8. 多問対応後の関連 bundled norm の縮約

## Q1: 能力間の依存関係をどう扱うか？

- A. 問い識別子と互換データモデルを土台にし、その上へ問い別 tally、部分成立、保留分再実行、CLI、norm 縮約を順に積む
- B. CLI の入出力を先に決め、その形式へ内部モデルを合わせる
- C. tally と再実行を先に実装し、保存形式は最後に調整する
- D. 各能力を独立に実装し、最後に統合する
- E. norm 縮約を先に行い、既存規範を減らしてから実装する
- X. その他（自由記述）

[Answer]: A（E-OC1: full autonomy 裁定 auto-decision-352858b674a772d57bb70e0644232c4e）

## Q2: 実装順序で優先する考え方は何か？

- A. 依存関係を守りつつ、互換読み取りと部分成立の高リスク箇所を早期に検証する
- B. 利用者価値を優先し、CLI の見える動作から実装する
- C. 実装量が小さい能力から順に進める
- D. norm 縮約を最初に完了させる
- E. すべてを一つの大きな変更として同時に実装する
- X. その他（自由記述）

[Answer]: A（E-OC1: full autonomy 裁定 auto-decision-74be2258d68edd09e98868901254d863）

## Q3: 特定能力に結び付くハードデッドラインはあるか？

- A. ない。Issue #2813 の全受入条件と品質ゲートの達成を完了条件とする
- B. 問い別 tally を最優先の期限付き成果とする
- C. 保留分再実行を最優先の期限付き成果とする
- D. 既存単問互換性を最優先の期限付き成果とする
- E. norm 縮約を最優先の期限付き成果とする
- X. その他（自由記述）

[Answer]: A（E-OC1: full autonomy 裁定 auto-decision-4b3da4689320afa33dfefe91f2f18b63）
