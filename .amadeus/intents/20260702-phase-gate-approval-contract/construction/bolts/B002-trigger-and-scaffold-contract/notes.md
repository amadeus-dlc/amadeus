# B002 実行メモ

## 実行方針

トリガーの判定規則の定義は `amadeus-decision-review` に 1 箇所だけ置き（GD001）、3 つの phase skill からは参照だけを置く。
scaffold-only の許可条件は BR006 の確定判断の記録 3 種に合わせる。

文言は Functional Design の BR003 から BR006 に合わせ、肯定形の行動を先に書く。

## 対象タスク

- T001: amadeus-decision-review にトリガーの判定規則と記録規約を定義する。
- T002: 3 つの phase skill の Decision Review 節へ規則参照を追加する。
- T003: ideation の auto 判定の scaffold-only 条件を限定する。
- T004: 4 つの skill の昇格先を promote で同期する。

## 作業順序

1. B001 の契約文言を確定させてから着手する（Bolt 依存: B001）。
2. T001 で判定規則の定義元を作る。
3. T002 で 3 つの phase skill から参照する。
4. T003 で ideation の auto 判定を変更する。
5. T004 で promote 同期と確認を行う。

## 実装判断

- トリガーの定義は `amadeus-decision-review` の Outcome 節の直後に「決定論的 grilling トリガー」節として置いた（T001）。判定規則、調査による解消の例外、記録規約を同じ節にまとめた。
- 3 つの phase skill の Decision Review 節には、outcome 分類の行の直後に同一文面の参照記述を追加し、判定規則の定義は重複させなかった（T002）。
- ideation の auto 判定表は scaffold-only の 2 行の条件を「確定判断の記録への参照が入力に存在して Ideation の判断項目を導ける」に置き換え、`scaffold-only` 節に確定判断の記録 3 種の定義、参照がない場合は guided とする行動、選択理由の提示を追加した（T003）。
- promote は 4 skill を `--replace` で同期し、`npm run test:it:promote-skill` の pass を確認した（T004）。

## 未確認事項

- 変更 PR の説明は、レビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）に従う。
