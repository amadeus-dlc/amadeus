# D004: 後続候補分離

## 背景

Issue #284 には、`skill-forge` による確認と `SKILL.md` 英語化が含まれている。

しかし、現行ルールでは `.amadeus/**/*.md`、`skills/**/*.md`、`.agents/skills/**/*.md` を日本語で書くことが求められている。

また、`skill-forge` による全 `amadeus-*` skill の内容監査は、README 一覧と暗黙起動設定の整合より範囲が広い。

## 判断

`skill-forge` 監査と `SKILL.md` 英語化は、この Intent の Construction では扱わず後続候補として分離する。

Discovery の Intent 候補に安定した候補 ID がない問題も、現在 Intent の成功条件には含めず後続 Issue 候補として扱う。

## 理由

今回の目的は、内部 skill の対象範囲と暗黙起動ポリシー設定対象を揃えることである。

言語方針変更や全 skill 監査を同時に扱うと、PR の受け入れ条件と検証観点が広がりすぎる。

## 影響

Construction では、後続候補を PR 説明または Construction 成果物に記録する。

GitHub Issue の作成は人間の承認後に行う。
