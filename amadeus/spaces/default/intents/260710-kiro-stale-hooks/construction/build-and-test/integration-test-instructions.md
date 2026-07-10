# Integration Test Instructions — 260710-kiro-stale-hooks

Test strategy: minimal(bugfix)のため新規統合テストは作成しない(stage-protocol §8)。

既存の統合層は `bash tests/run-tests.sh --ci` に含まれ、本修正後も green(実測: 277 files / 4026+ assertions / RESULT: PASS)。#719 の変更は出荷内容に影響しない(dist 生成差分ゼロ)ため、統合面の追加検証は dist:check / promote:self:check(build-instructions 参照)で充足する。
