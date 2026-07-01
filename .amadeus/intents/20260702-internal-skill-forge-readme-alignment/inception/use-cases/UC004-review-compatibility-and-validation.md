# UC004: 互換性と検証条件をレビューする

## 概要

Maintainer は、README 分類、互換性維持対象、検証条件が Amadeus の自己開発方針と合っているかを確認する。

## アクター

- ACT001 Maintainer

## 外部システム

- EXT001 GitHub

## 事前条件

- UC001、UC002、UC003 が完了している。
- PR または差分レビューで確認できる状態である。

## 基本フロー

1. Maintainer は README の skill 分類方針を確認する。
2. Maintainer は互換性維持対象の追加が必要かを確認する。
3. Maintainer は README だけでなく、skill 契約、昇格先成果物、validator、example への影響が整理されているかを確認する。
4. Maintainer は PR で検証結果を確認する。

## 代替フロー

- 互換性維持対象を追加する必要がある場合は、実装前に `docs/backward-compatibility.md` へ記録する作業へ戻す。

## 対象要求

- R001
- R004
- R005

## 未確認事項

- GitHub Issue が必要な後続課題を分けるかは Construction で判断する。
