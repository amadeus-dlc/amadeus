# Security Test Instructions — Doctor in-process seam

## 上流成果物

- `construction/doctor-inprocess-seam/code-generation/code-generation-plan.md`
- `construction/doctor-inprocess-seam/code-generation/code-summary.md`

認証・network・IaC の変更はない。実在する攻撃面は filesystem path、symlink/TOCTOU、
audit write、child process cleanup、依存 package に限定する。

## 依存関係 scan

```bash
bun audit --audit-level=high
```

High/Critical advisory 0件を成功条件とする。network または registry 障害は PASS に
丸めず、環境エラーとして `build-test-results.md` に記録する。

## 実装境界の security regression

```bash
bun test \
  tests/integration/t226-migration-doctor-heartbeats.test.ts \
  tests/integration/t257-doctor-inprocess-seam.test.ts \
  tests/unit/t83-doctor-orphan-worktree.test.ts
```

次を確認する。

- symlink/TOCTOU swap が安全側へ失敗する
- migration mode と `CODEX_HOME` が context 解決後に ambient 再読されない
- fatal watcher の child process が timeout 時も必ず kill/reap される
- audit cold path が新規 shard を作らず、active path の fatal を握りつぶさない

## 非適用

DAST、auth test、container/IaC scan、secret rotation は対象 component がないため N/A。
既存 CI の secret scanning や repository policy を省略する根拠にはしない。
