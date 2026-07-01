# D003: Follow-up scope separation

## 状態

active

## 文脈

Issue #284 は `skill-forge` 監査、見つかった問題の修正、`SKILL.md` 英語化、README 更新、暗黙起動設定を含む。
現在の Intent は README と内部 skill ポリシー整合を進める Construction slice であり、全 `amadeus-*` skill 本文の監査と英語化は変更量と検証観点が異なる。

## 判断

`skill-forge` 監査、既存 `SKILL.md` 本文の英語化、Discovery 候補 ID の改善は後続候補として分離する。

## 根拠

- [B003 tasks](../bolts/B003-follow-up-and-verification/tasks.md)
- [business-rules.md](../U001-internal-skill-policy-alignment/functional-design/business-rules.md)
- [ideation/ideation.md](../../ideation/ideation.md)

## 影響

- 現在の Construction は README、metadata、昇格、検証証拠に集中する。
- 後続候補を GitHub Issue 化するかは人間判断に委ねる。
