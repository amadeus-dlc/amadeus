# D001: complete ideation

## 背景

入力テーマは、`amadeus-*` skill を `skill-forge` で確認することである。

README は公開入口 skill、補助 skill、内部 skill を説明している。
一方で、repo には `skills/amadeus-*` と `.agents/skills/amadeus-*` に多数の内部 skill が存在する。
この差が意図した分類なのか、README の不足なのか、skill 契約のずれなのかを後続 phase で確認する必要がある。

指定された Discovery Brief `discoveries/20260702-internal-skill-forge-readme-alignment.md` は、target workspace 内では確認できなかった。
そのため、現時点ではユーザー入力を Discovery Brief 相当の入力テーマとして扱う。

## 判断

Ideation を完了し、Inception へ進める。

Inception では、README の skill 分類、`skill-forge` の確認観点、source skill と昇格先成果物の差分、互換性維持対象の扱いを具体化する。

## 理由

入力テーマと既存の README、steering policy、stage 前提確認成果物から、対象境界、対象外、実行スコープ、成果物深度、検証戦略を判断できる。

未確定事項は残っているが、README に内部 skill をどこまで載せるか、eval workflow まで実行するか、Codex metadata をどこまで検証するかは Inception の要求化と既存コード分析で扱える。

## 影響

Inception では、公開入口 skill、補助 skill、内部 skill の分類基準を要求として分解する。
また、互換性維持対象が明示されていない場合に旧入口、旧名、alias、互換層を追加しない制約を受け入れ条件へ渡す。

README を更新する場合は、skill 契約、validator、example、昇格先成果物とのずれが残らない検証を Construction へ渡す。
