# D001: complete ideation

## 背景

Issue #278 は、phase skill 起動時に skill 供給元と実行環境の stage 前提を確認する必要性を扱う。

Issue #277 と Issue #272 の関係では、後続 Issue が前提にする内部 skill が存在しないことに後段で気づいた。
この問題は、対象 skill がどの供給元にあり、どの実行環境で利用可能かを phase skill 起動時に確認していないことと関係する。

## 判断

Ideation を完了し、Inception へ進める。

Inception では、stage 前提確認を `amadeus-decision-review`、Skill Contract、phase skill のどこへ置くかを具体化する。

## 理由

Issue #278 から、対象境界、対象外、実行スコープ、成果物深度、検証戦略を判断できる。
現時点で追加質問が必要な未確定事項は、Inception の要求化と既存コード分析で扱える。

## 影響

Inception では、source skill、昇格先成果物、host environment、stage0、stage1、stage2、stage0 採用判断の証拠を要求として分解する。
また、配布対象 skill に repo 内 Issue 番号を前提にした説明を入れない制約を受け入れ条件へ渡す。
