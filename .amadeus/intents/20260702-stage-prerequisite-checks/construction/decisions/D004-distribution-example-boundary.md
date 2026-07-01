# D004 distribution example boundary

## 状態

accepted

## 背景

Issue #277 と Issue #272 の関係は、このリポジトリ内では前提不成立の代表例として有効である。

ただし、配布対象 skill の利用者はこのリポジトリの Issue 番号を参照できるとは限らない。

## 判断

repo 内代表例は `.amadeus/` 成果物に残す。

配布対象 skill では、source skill、昇格先成果物、host environment、stage 前提の一般説明に置き換える。

## 理由

配布対象 skill がユーザー環境で参照できない Issue 番号を前提にすると、前提確認の説明自体が不成立になる。

## 影響

`dev-scripts/evals/amadeus-templates/check.ts` に、`amadeus-decision-review` から `Issue #277` と `Issue #272` を除外する確認を追加した。
