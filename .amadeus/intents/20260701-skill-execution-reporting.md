# amadeus-* skill 実行上の問題報告標準化

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | Amadeus の skill 実行時に見つかった問題や懸念を、成果物契約と混ぜずに扱う技術目標である。 |
| scope | refactor | 既存の lifecycle phase を増やさず、amadeus-* skill の報告契約を整理する Intent である。 |
| labels | skill, reporting, self-development, governance | skill 実行上の問題報告、自己開発、運用統制を表す。 |

## 目的

amadeus-* skill が、実行上の問題や運用上の懸念を共通の形で報告できるようにする。

この Intent は [Issue #248](https://github.com/amadeus-dlc/amadeus/issues/248) を根拠にする。

## 成功条件

- 実行上の問題や運用上の懸念の報告先を判断できる。
- 現在の Intent に含めるか、後続 Issue にするかの判断基準を定義できる。
- 報告内容の最低項目を定義できる。
- amadeus-* 公開 skill または内部 skill から報告契約を参照できる。
- 対象 Intent の validator が pass する。

## 範囲

含めるもの:

- amadeus-* skill 実行中に見つかる問題や懸念の報告方針。
- 現在の Intent に含める対象と、後続 Issue へ切り出す対象の判断基準。
- 報告内容の最低項目。
- 内部 skill、共通契約、validator または evaluator 後段のどれで扱うかの方針整理。
- 代表 skill で試す範囲の整理。

含めないもの:

- すべての軽い感想を成果物化すること。
- 人間の判断なしに GitHub Issue を大量作成すること。
- validator の `pass` を内容承認として扱うこと。
- Inception の前に要求、ユースケース、Unit、Bolt、Task を作ること。
- 実装や CI の変更。
