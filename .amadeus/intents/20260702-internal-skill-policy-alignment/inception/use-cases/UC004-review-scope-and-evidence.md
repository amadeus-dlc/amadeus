# UC004: 範囲と証拠を確認する

## 概要

Reviewer は、Issue #284 のうち今回の Intent が扱った範囲、対象外に分けた範囲、検証結果を確認する。

## アクター

- ACT003 Reviewer

## 外部システム

- EXT001 GitHub

## 事前条件

- README と設定配置の確認結果がある。
- 後続候補の分離理由が記録されている。

## 基本フロー

1. Reviewer は Issue #284 の受け入れ条件を確認する。
2. Reviewer はこの Intent の対象範囲を確認する。
3. Reviewer は `skill-forge` 監査と `SKILL.md` 英語化が対象外である理由を確認する。
4. Reviewer は Codex と Claude Code の設定確認結果を確認する。
5. Reviewer は検証結果が PR 説明または対象 Intent に記録されているか確認する。

## 代替フロー

- 対象外候補を同じ PR で扱う必要があると判断された場合は、後続 Issue ではなく人間判断として範囲変更を記録する。

## 対象要求

- R004
- R005

## 未確認事項

- 後続候補を GitHub Issue として作成するか。
