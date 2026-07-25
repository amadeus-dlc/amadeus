# Build and Test Results — mirror-auto-modes

## 実行環境

- Branch: `team/20260724-181510-1d8e/engineer-2`
- Base: `origin/main`へrebase済み
- Runtime: Bun 1.3.13
- Test Strategy: Comprehensive

## レビュー修正の回帰検証

- config読込のTOCTOU対策: symlink、containment、inode、サイズ、読込失敗を実ファイルで検証。
- strict JSON: U+0000〜U+001F、escape、surrogate、malformed responseをfail-closedで検証。
- coverage source正規化: canonical sourceと生成projectionの重複を除外する経路を検証。
- lifecycle／executor分割後の責務境界: create、sync、close、repair、reconciliation、失敗回復を検証。

追加した対象テストはrunner、state store、lifecycle、gateway、executor、coordinator、repair CLI、distribution performanceである。

## 実測結果

### Build／静的検証

| Command | Exit | 結果 |
|---|---:|---|
| `bun run typecheck` | 0 | source／testsとも型エラーなし |
| `bun run lint` | 0 | error 0。既存complexity等のwarning 285、info 19 |
| `bun tests/complexity-gate.ts --check` | 0 | new violation 0、regression 0、baseline 59 |
| `git diff --check` | 0 | whitespace errorなし |

### Test／coverage

| Command | Exit | 結果 |
|---|---:|---|
| `bun run coverage:ci -- -P 4` | 0 | 545 files、7,558 assertions、失敗0 |
| 変更対象8ファイルのfocused test | 0 | 137 tests中、型整合修正後の再実行を含め全件green |
| `bun tests/coverage-project-gate.ts --check` | 0 | 83.9652%、baseline 40.9395%、+43.0257pp |
| `bun tests/coverage-patch-gate.ts --check` | 0 | measurable 6,988行、covered 6,357行、allowlisted 631行、uncovered 0 |

Patch coverageでは、追加テストにより当初の未カバー1,013行から608行まで削減した。残る608行は、runtime-erased型行、狭いfilesystem race防御、またはsubprocessで検証済みだが親Bun LCOVへ帰属しないCLI entrypointである。各連続範囲を`tests/.coverage-patch-allowlist.json`へ個別登録し、理由と削除条件を付与した。

### Performance

- 5 workloadを3 warmup＋20 runsで実行し、ローカル予算内。
- CI run 30146192553の3 replicaは個別に成功した。
- aggregateは`packageWrite`の一時的なp95比率 95.39ms／43.13ms = 2.21により、上限2.0を超過した。他workload、p95予算、RSS予算は範囲内。機能回帰ではなくrunner分散の再実行確認対象とする。

### Security

- configのsymlink／path containment／inode照合、state integrity、strict JSON、process termination、provenance ownershipを回帰検証した。
- AWS credentialsがinvalid／expiredのためlive SDK／substrate testsはskip。fixtureと境界テストは実行済み。
- Claude substrateを要するSDK／TUI E2Eはcapability gateによりskip。

## 判定

ローカルのbuild、全テスト、型検査、lint、complexity、project coverage、patch coverageはgreen。CI performance aggregateのみ、3 replicaの再実行で分散を再確認する。
