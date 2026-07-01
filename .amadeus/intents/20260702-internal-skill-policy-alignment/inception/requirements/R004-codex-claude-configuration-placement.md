# R004: Codex と Claude Code の設定配置確認

## 要求

Codex と Claude Code の両方で、内部 skill の暗黙起動を抑える設定配置先が確認されている。

## 根拠

- [Issue #284](https://github.com/amadeus-dlc/amadeus/issues/284)
- [scope.md](../../ideation/scope.md) の SC-IN-004
- [codebase-analysis.md](../codebase-analysis.md)

## 受け入れ状態

- Codex 向けの設定配置先が確認されている。
- Claude Code 向けに同等の設定が存在するか確認されている。
- 同等設定が見つからない場合は、非対応または後続候補にする理由が記録されている。
- 設定ファイルを追加する場合は、検証方法が記録されている。

## 対象外

- 未確認の Claude Code 設定を推測で追加すること。
- host environment の自動検出。
