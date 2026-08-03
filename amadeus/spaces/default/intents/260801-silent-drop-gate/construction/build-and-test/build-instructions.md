# Build Instructions — silent-drop-gate

## 上流成果物と前提

本書は4 Unitの `code-generation-plan.md` と `code-summary.md` を入力とする。対象実装revisionは `d77e0a8fe96fb847d0999c43edf765990ccafbb0`、証跡commitは `4b63c300156e81dd9c42c2979ab88bc2032dfee3` とする。

- Runtime: Bun 1.3.13、TypeScript strict／ESM
- Repository: Bun-only monorepo。常駐service、database、外部queue、環境変数、credentialは不要
- Dependency: `bun.lock` を正本とし、必要な初回setupは `bun install --frozen-lockfile`
- Generated tree: `dist/` とpromoted harnessは直接編集せず、canonical sourceから生成する

## Build手順

作業rootで次を順に実行する。

```bash
bun run typecheck
bun run lint
bun run distribution:check
bun scripts/package.ts --check
bun run promote:self:check
git diff --check
```

`bun run lint` の既存baseline（380 warnings／23 infos）はexit 0なら合格とし、新規errorまたはexit非0を不合格とする。package／promotion checkは生成投影のbyte driftが0件であることを証明する。

## Build合格条件

- TypeScript本体とtest設定がともに型検査exit 0
- Biome、distribution check、package check、promotion check、whitespace checkがexit 0
- read-only build検証の前後でtreeが変化せず、必要なpackage／promotion再生成後にdrift guardが成功する
- `mirror-persistence-propagation`、`static-gate-engine`、`text-mutation-loud-failure`、`repository-adoption` の各 `code-summary.md` に記録された公開互換性と生成投影を維持

## トラブルシュート

- `bun` が見つからない場合はmiseで信頼済みのtoolchainを確認し、Bun 1.3.13を使用する。
- package／promotion drift時は生成物を手修正せず、canonical sourceの差分を特定する。本工程では無断再生成せず、実装欠陥として扱う。
- constrained VMで重いtestが既定timeoutを超える場合は、実装済みの `--test-timeout-ms 120000` とnamed isolated commandを同じ対象へ適用する。timeoutを成功扱いにしない。
- 失敗修正は最大2回までとし、未解消なら `build-test-results.md` にfailure、試行、残存riskを記録する。
