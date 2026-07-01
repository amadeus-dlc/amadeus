# D001: Ideation 完了判断

## 背景

- [Issue #248](https://github.com/amadeus-dlc/amadeus/issues/248) は、amadeus-* skill 実行中に見つかった問題や懸念の報告先が skill ごとに明確でないことを扱う。
- 現在の自己開発 cycle では、個別 Intent の目的と異なる改善要望を後続 Issue として切り出す運用が必要になっている。
- Ideation では、報告先、報告対象、後続 Issue 化の判断基準、最低項目を Inception へ渡せる粒度で整理すれば十分である。

## 判断

- 対象境界、実行スコープ、成果物深度、検証戦略を採用する。
- Ideation を完了し、Inception へ進める。

## 理由

- Issue #248 の本文から、対象、対象外、検討案、判断したいことを読み取れる。
- 実装方式は複数案があるため、Ideation では要求や Unit へ進めず、Inception で比較できる入力にする。
- 初期確認モックにより、skill 実行中に懸念を見つけたときの判断フローを確認できる。

## 影響

- Inception では、内部 skill、共通契約、validator または evaluator 後段のどれで扱うかを比較する。
- Inception では、報告内容の最低項目と、現在の Intent に含めるか後続 Issue にするかの判断基準を Requirements と Acceptance にする。
- `state.json` には、実行スコープ、成果物深度、検証戦略を保存しない。
- Inception 以降に `scope.md` を変更する場合は、影響を受ける Requirement、Story、Use Case、Unit、Bolt を確認する。
