# R002: skill-forge 確認範囲

## 要求

`skill-forge` で確認する観点を、trigger description、skill 本文、eval、Codex metadata、昇格先成果物に分けて判断できる。

## 背景

`skill-forge` は skill の作成、改善、検証、eval、metadata、packaging を扱う。
今回の Intent では `amadeus-*` skill の確認が目的であり、全観点を一度に実行するとは限らない。

そのため、Construction でどの観点を実行するかを分けて判断できる必要がある。

## 受け入れ状態

- 静的な `SKILL.md` review の対象を説明できる。
- trigger description の確認対象を説明できる。
- eval workflow を実行するかどうかを判断できる。
- Codex metadata が存在する場合の確認方法を説明できる。
- 昇格先成果物を確認対象に含めるかを判断できる。

## 対象境界

- SC-IN-003

## 未確認事項

- Codex metadata が存在しない場合に、この Intent で metadata を新規生成するかは Construction で判断する。
- eval workflow まで実行するかは Construction で判断する。
