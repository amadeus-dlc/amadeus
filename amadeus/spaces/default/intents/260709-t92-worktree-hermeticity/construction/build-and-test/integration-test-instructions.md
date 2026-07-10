# Integration Test Instructions — t92-worktree-hermeticity

## 実行

`bash tests/run-tests.sh --ci` — 統合状態(origin/main + fix/709-t92-worktree-skip-guard)で exit 0 を確認(結果は build-test-results.md)。

## 統合境界の検証ポイント

- skip ガードの前提検査は本番センサー(amadeus-sensor-type-check.ts:182-201)の launcher 解決と同一セマンティクス — センサー側の候補集合が変わったらガードも追従が必要(lockstep コメントで明示)
- CI は ci.yml:34,70 で bun install を必ず実行するため、CI で test 44 が静かに skip される経路はない(アーキレビューで実測確認)
