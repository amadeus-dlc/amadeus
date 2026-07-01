# D001: Inception 境界

## 背景

Issue #284 は、`amadeus-*` skill の `skill-forge` 確認、問題修正、`SKILL.md` 英語化、README の Internal Skills 更新、内部 skill の暗黙起動ポリシー設定を求めている。

Discovery と Ideation では、このうち最初に「内部 skill の対象範囲と暗黙起動ポリシーを揃える」候補を進めると判断した。

## 判断

Inception の対象境界を、README の Internal Skills 一覧、内部 skill 判定、暗黙起動ポリシー設定対象、Codex と Claude Code の設定配置確認に固定する。

## 理由

README 一覧と暗黙起動ポリシーの対象範囲を先に揃えると、後続の `skill-forge` 監査と `SKILL.md` 英語化で確認対象を固定しやすくなる。

Issue #284 の全項目を単一 Construction slice に混ぜると、言語方針変更と設定変更の判断が混ざる。

## 影響

Construction では、README、source skill、昇格先成果物、設定配置候補を確認する。

`skill-forge` 監査と `SKILL.md` 英語化は後続候補として扱う。
