# Build and Test Results — mirror-auto-modes

## 実行環境

- Branch: `team/20260724-181510-1d8e/engineer-2`
- Base: 最新`origin/main`へrebase済み
- Runtime: Bun 1.3.13
- 上流: 5 Unitの`code-generation-plan.md`と`code-summary.md`

## 結果

### Build／静的検証

| Command | Exit | 結果 |
|---|---:|---|
| `bun run typecheck` | 0 | TypeScript project／testsともgreen |
| `bun run lint` | 0 | error 0、warning 283、info 18 |
| `bun tests/complexity-gate.ts --check` | 0 | new violation 0、regression 0、baseline 59 |
| `git diff --check` | 0 | whitespace errorなし |

### Test／coverage

| Command | Exit | 結果 |
|---|---:|---|
| rebase直後のMirror対象15ファイル | 0 | 89 pass、0 fail、498 expect |
| `bun run test:all` | 1 | 622 files、7713 assertions、1 failed file／assertion |
| `bun test tests/integration/t-codex-hooks-migration.test.ts` | 0 | 48 pass、1 skip、0 fail、1665 expect、30.40秒 |
| `bun tests/run-tests.ts --all --coverage --coverage-dir coverage -P 4` | 1 | 622 files、7713 assertions。LCOV生成済み、失敗は同じwall-clock driftのみ |
| `bun tests/coverage-project-gate.ts --check` | 0 | 53.9171%、baseline 40.9395%、+12.9776pp |
| `bun tests/coverage-patch-gate.ts --check` | 1 | 生成済みharness projectionを含むadded-line 8574行のうち5561行を未計測扱い |
| `bun tests/gen-coverage-registry.ts --check` | 0 | fresh、guards green、ratchet held |

全体スイートの唯一のfailは機能assertionではなく、`tests/integration/t-codex-hooks-migration.test.ts`の宣言済み`medium`に対するwall-clock driftである。全体実行では33.29〜34.83秒、単独では30.40秒で全assertionが通った。rebaseで移動した`tests/.coverage-patch-allowlist.json`のMirror／plugin行番号は、現在の意味上の対象行へ同期した。

coverageの`--ci`モードはGit未追跡の新規Mirrorテストを列挙しないため、未コミット状態での評価には`--all --coverage`を使用した。project coverage gateはgreen。patch gateはcanonical sourceに加えて未実行の`.cursor`等の生成projectionをadded lineとして数えるためredであり、コミット後のCI評価またはprojection除外方針の確定が必要である。

### Distribution／documentation

| Command | Exit | 結果 |
|---|---:|---|
| `bun run distribution:check` | 0 | 195 payloads、registry `a2911dcc31a8`、4 documents／32 topics、199 public projection files |
| `bun run dist:check` | 0 | claude／codex／cursor／kiro／kiro-ide／opencodeすべて同期 |
| `bun run promote:self:check` | 0 | claude／codex／cursor／opencode self install同期 |

### Performance

| 対象 | 結果 |
|---|---|
| t269／t292 | 7 pass、0 fail、173 expect |
| packageWrite | p95 7.665 ms、RSS 49,381,376 bytes、予算内 |
| packageCheck | p95 38.313 ms、RSS 105,775,104 bytes、予算内 |
| promote | p95 6.384 ms、RSS 111,525,888 bytes、予算内 |
| docsParity | p95 1.300 ms、RSS 113,442,816 bytes、予算内 |
| digestMatrix | p95 35.866 ms、RSS 116,883,456 bytes、予算内 |

各workloadは3 warmup＋20 runs。ローカル予算はすべてgreen。3つの同一CI image replicaを集約する固定CI performance gateは未実行のためpendingである。

### Security

- MirrorのSTRIDE fixture、process termination、symlink／path containment、state integrity、public projection scannerはテストおよびdistribution checkでgreen。
- `eval(...)`と`shell: true`はMirror canonical実装に存在しない。`setTimeout`は`amadeus-mirror-runner.ts`のdeadline／termination graceを実装する注入可能なbounded timerのみ。
- `bun audit`はexit 1。`@anthropic-ai/claude-agent-sdk`からの間接依存に12件（high 3、moderate 8、low 1）を検出した。対象は`fast-uri`、`hono`、`@hono/node-server`、`body-parser`であり、依存更新または受容判断が必要。
- DAST、IaC scan、container scanは、この変更がネットワークサービス、IaC、container imageを追加しないため非該当。

### 環境制約

- AWS credentialsがinvalid／expiredのためlive SDK／substrate testsはskip。ローカルfixture／境界テストは実行済み。
- Claude substrateを要するSDK／TUI E2Eはharness capability gateによりskip。
- 退避用stash `codex-pre-rebase-mirror-auto-modes-20260725`はrebase後も安全バックアップとして保持している。
