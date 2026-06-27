# 複数リポジトリ実装対象の扱い

## 目的

この文書は、1つの Intent が複数の境界づけられたコンテキストや複数のシステム境界をまたぐ場合の実装対象管理方針を定める。

## 問題

1つの Intent が複数の境界づけられたコンテキストをまたぐ場合、実装境界も複数のシステムや複数の Git リポジトリに分かれることがある。

このとき、実装リポジトリを submodule として標準的に結合すると、所有境界と checkout 手段が混ざる。

submodule は、Intent の進行、各リポジトリの branch、PR、CI、commit pin を同時に扱う必要がある。

そのため、Amadeus 成果物の正本と実装リポジトリの正本が曖昧になりやすい。

各システム側が Amadeus リポジトリを submodule として持つ形も、同じ Intent の正本が複数箇所に見えるため避ける。

## 方針

Amadeus は、実装リポジトリを所有しない。

Amadeus は、Unit や Bolt から実装対象を参照する。

実装の正本は、各システムリポジトリに置く。

Amadeus の正本は、Intent、Unit、Bolt、設計判断、追跡、検証証拠である。

```text
Intent
  -> Unit
      -> primary bounded context
      -> implementation target
          -> repository
          -> path
          -> branch
          -> pull request
          -> ci check
  -> Bolt
      -> Unit
      -> implementation target
```

## Submodule の扱い

submodule は、標準構造としては扱わない。

submodule は、統合 E2E やローカル検証のために複数リポジトリを同じ workspace に checkout する手段としてだけ扱う。

submodule を使う場合でも、実装の所有権は各システムリポジトリに残す。

## 成果物への反映

Unit または Bolt には、実装対象として repository、path、branch、PR、CI を記録できるようにする。

複数リポジトリをまたぐ Intent では、Unit ごとに主な実装対象を記録する。

Bolt が複数リポジトリを変更する場合は、変更対象を分けて記録する。

## Validator 境界

validator は、実装対象欄の存在と構造を確認する。

validator は、PR URL や CI 名が記録されている場合、その形式を確認する。

validator は、対象リポジトリの実在性、branch の最新性、CI の成功可否までは判断しない。

これらは Construction の検証や PR 監視の責務で扱う。
