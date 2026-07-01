# R003: 暗黙起動ポリシー対象

## 要求

内部 skill の暗黙起動ポリシー設定対象が整理されている。

## 根拠

- [Issue #284](https://github.com/amadeus-dlc/amadeus/issues/284)
- [scope.md](../../ideation/scope.md) の SC-IN-003
- [codebase-analysis.md](../codebase-analysis.md)

## 受け入れ状態

- `policy.allow_implicit_invocation = false` を設定する対象が、内部 skill 判定と一致している。
- 明示起動は維持し、暗黙起動だけを抑える目的が説明されている。
- 設定対象外の skill がある場合は、その理由を追跡できる。

## 対象外

- 公開入口 skill の暗黙起動抑制。
- skill の trigger description の全面変更。
