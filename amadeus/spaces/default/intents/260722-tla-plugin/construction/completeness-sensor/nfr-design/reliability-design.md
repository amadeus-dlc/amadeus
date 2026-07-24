# Reliability Design — U5 completeness-sensor

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Verdict

- PASSEDはmap parse、全entry読込、全hash一致、deadline内完了のAND条件とする。
- map不在・不正、file不在・読取不能、timeoutは固定code付きFAILEDとし、同一入力のfinding順を固定する。

## 更新と回復

- `updateModelMap`は対象mapと同じdirectoryに排他的なtemp fileを作成し、mode 0644でcanonical recordを書いてfile fsync、同一filesystem rename、親directory fsyncの順にpublishする。
- rename前の失敗はtempをcleanupして旧recordを保持する。rename後・directory fsync前の失敗は次回起動時にrecord全体を再検証し、破損時はGit上の旧世代へ戻して再実行する。
- model/cfg identity不変で実装hashだけ変わる更新は`MODEL_UNCHANGED`で拒否し、自動修復しない。
