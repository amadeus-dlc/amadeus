# D001 Inception の所有境界

## 状態

accepted

## 文脈

Issue #278 は、phase skill 起動時に skill 供給元と実行環境の stage 前提を確認することを求めている。

Inception では、実装や Task ではなく、要求、ユースケース、既存コード分析、Unit、Bolt、追跡、判断を確定する。

## 判断

この Intent の Inception は、要求、受け入れ状態、ユースケース、既存コード分析、Unit、Unit Design Brief、Bolt、追跡、判断までを所有する。

Task、Functional Design、実装、CI は Construction へ渡す。

## 影響

Construction は、B001 から B003 までを対象 Bolt として Task Generation へ進める。

Inception では、実装ファイルやテストファイルを変更しない。
