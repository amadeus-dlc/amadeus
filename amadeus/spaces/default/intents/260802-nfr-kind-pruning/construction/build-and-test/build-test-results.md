# Build and Test結果 — nfr-kind-pruning

## 入力と検証断面

`construction/nfr-kind-pruning/code-generation/code-generation-plan.md`（code-generation-plan）と `code-summary.md`（code-summary）を入力に、base HEAD `2c9013a1da2f7a139ef595f28bf68efe84d08a41` 上のworking treeを検証した。実測日時は2026-08-03、Bun 1.3.13を使用した。

## ビルド・静的検査

| コマンド | 結果 | 証拠 |
|---|---|---|
| `bun install --frozen-lockfile` | PASS | exit 0、lockfile更新なし |
| `bun run typecheck` | PASS | exit 0、TypeScript diagnostics 0 |
| `bun run lint` | PASS | exit 0、error 0。既存baselineのwarning 386件 / info 23件 |
| `bun scripts/package.ts --check` | PASS | exit 0、7 harnessの生成物が正本と一致 |
| `bun run promote:self:check` | PASS | exit 0、self-install面のドリフトなし |
| `git diff --exit-code -- package.json bun.lock` | PASS | 新規依存・lockfile変更なし |
| `git diff --check` | PASS | whitespace errorなし |

## 焦点テスト

| 種別 | コマンド対象 | 結果 |
|---|---|---|
| Unit | `t133-bolt-dag-compile.test.ts`、`t248-stage-contract.test.ts` | 53 pass / 0 fail |
| Integration | `t248-stage-contract-routing.test.ts` | 35 pass / 0 fail |
| Packaged E2E | `t416-nfr-kind-pruning.test.ts` | 1 pass / 0 fail |
| 合計 | kind必須、5-kind matrix、consume投影、legacy fallback、Codex配布面 | **89 pass / 0 fail** |

library UnitではNFR RequirementsとNFR Designの必須成果物が各5件から2件へ減り、60%削減の性能proxyを満たした。service Unitの5件契約、kindless・不正runtime graphのfull-matrix fallbackも維持した。

## Full CI

`bun run test:ci -- --verbose` は初回で **RESULT: PASS** となった。

- Test files: **754** / Failed files: **0**
- Total assertions: **10,260** / Failed assertions: **0**
- ログ: `tests/logs/2026-08-03T01-55-52Z`
- Claude substrateを必要とするlive SDKテスト23ファイルは、runner既定の明示理由付きで自己SKIPした
- 既知のheavy testを含めtimeout failureはなく、単独再実行は不要だった
- runnerが報告したwall-clock drift 5件はいずれもPASSしており、本変更の機能合否には影響しない

## Coverage・性能・セキュリティ判定

coverage率の追加計測は実施していない。固定率ではなく、FR-1〜FR-9 / NFR-1〜NFR-4に対応する契約matrix、89件の焦点テスト、full CIの10,260 assertionsで被覆を確認した。固定wall-clock SLOは置かず、成果物数の60%削減を決定的proxyとした。

新規producerのkind欠落・不正値はsensorでfail-closed、legacy runtime入力はfull matrixへfail-safeとなることを確認した。依存、認証、ネットワーク、秘密情報、永続データへの変更はない。失敗・再試行・未解決defectは0件で、**build-ready / test-ready** と判定する。
