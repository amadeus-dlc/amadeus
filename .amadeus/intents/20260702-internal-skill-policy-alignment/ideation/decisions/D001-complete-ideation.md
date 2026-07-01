# D001: Ideation 完了判断

## 背景

Issue #284 は、`amadeus-*` skill の `skill-forge` 確認、問題修正、`SKILL.md` 英語化、`README*.md` の Internal Skills 更新、内部 skill の暗黙起動ポリシー設定を求めている。

Discovery では、この入力を複数 Intent に分け、最初に「内部 skill の対象範囲と暗黙起動ポリシーを揃える」候補を進めると判断した。

## 判断

Ideation を完了し、Inception へ進める。

Inception では、Internal Skills 一覧、内部 skill 判定、暗黙起動ポリシー、Codex と Claude Code の設定配置を要求として具体化する。

`skill-forge` による全 skill の内容監査と `SKILL.md` 英語化は、この Intent の対象外にする。

## 理由

Issue #284 と Discovery Brief から、対象境界、対象外、実行スコープ、成果物深度、検証戦略を判断できる。

README 一覧と暗黙起動ポリシーの対象範囲を先に揃えると、後続の `skill-forge` 監査と英語化で確認対象を固定しやすくなる。

`SKILL.md` 英語化は現行ルールと衝突するため、この Intent で同時に扱うと判断が混ざる。

## 影響

Inception では、`README*.md`、`skills/amadeus-*`、`.agents/skills/amadeus-*`、Codex と Claude Code の設定配置を確認する。

PR 準備時には、対象 Intent の validator、README 差分確認、設定構造確認、必要なテスト結果を記録する。

Discovery の Intent 候補に安定した候補 ID がない問題は、後続 Issue 候補として報告する。
