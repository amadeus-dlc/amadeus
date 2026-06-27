# Unit と境界づけられたコンテキストの対応方針

## 目的

この文書は、1つの Intent が複数の境界づけられたコンテキストをまたぐ場合の Unit 配置方針を定める。

## 問題

Intent が複数の境界づけられたコンテキストをまたぐ場合、`units/` と `bolts/` をフラットに置くだけでは、各 Unit がどの境界づけられたコンテキストを主担当にしているか分かりにくい。

一方で、境界づけられたコンテキストごとにディレクトリを切ると、Intent 全体に属する成果物まで分断される。

特に、`requirements/`、`use-cases/`、`user-stories/`、`decisions/` は、単一の境界づけられたコンテキストだけに閉じるとは限らない。

また、複数の境界づけられたコンテキストを協調させる Unit は、どのディレクトリに置くべきかが曖昧になる。

## 方針

Intent 配下の成果物配置はフラットに維持する。

Unit は、主担当の境界づけられたコンテキストを1つ持つ。

Unit は、協調先の境界づけられたコンテキストを0個以上持てる。

Bolt は Unit を参照することで、境界づけられたコンテキストに接続する。

```text
Intent 1 -> 1..* Unit
Unit 1 -> 1 primary bounded context
Unit 1 -> 0..* collaborating bounded context
Bolt 1 -> 1 Unit
```

## 成果物への反映

`units/<unit-id>-<slug>/unit.md` には、主担当の境界づけられたコンテキストと協調先の境界づけられたコンテキストを記録する。

`units/<unit-id>-<slug>/design.md` には、境界づけられたコンテキスト間の責務分担、契約、連携方式を記録する。

`domain/bounded-contexts.md` には、Unit 分割への入力として、Unit と境界づけられたコンテキストの対応を記録する。

## Validator 境界

validator は、Unit に主担当の境界づけられたコンテキスト欄が存在することを確認する。

validator は、主担当の境界づけられたコンテキスト ID が `domain/bounded-contexts.md` に存在することを確認する。

validator は、協調先の境界づけられたコンテキスト ID が存在する場合、同じく `domain/bounded-contexts.md` に存在することを確認する。

validator は、その Unit にその境界づけられたコンテキストを割り当てる業務的な妥当性までは判断しない。
