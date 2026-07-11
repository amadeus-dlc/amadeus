# ワークスペースレイアウトの決定(Workspace Layout Decision)

> 言語: [English](18-workspace-layout.md) | **日本語**

## コンテキスト

GitHub issue #610 は、Amadeus リポジトリのワークスペース/パッケージレイアウトを正規化するための課題です。従来は framework の source of truth を root レベルの `core/` と `harness/` に置き、setup/installer 系の作業だけを将来 `packages/setup/` に置く前提でした。

このままだと、framework source は root、setup package は `packages/` という責務軸が混在します。`packages/setup` を別 intent で進める前に、framework 側も package-owned な source boundary を持つ必要があります。

## 決定

Amadeus は framework の authored source を `packages/framework/` に移します。

- `packages/framework/core/` を harness-neutral な source of truth とします。
- `packages/framework/harness/<name>/` を harness-specific な authored source とします。
- `packages/framework/package.json` を framework package boundary として追加します。
- root `scripts/` は repository レベルの packaging/self-promotion tooling として維持します。
- root `dist/<name>/` は generated かつ committed な public install contract として維持します。
- root `.claude/`, `.codex/`, `.agents` は dogfood な self-install ターゲットとして維持します。
- root `core` と `harness` は既存の docs/tests/import 互換のための alias として残します。
- `packages/setup` は別 intent の sibling package として扱い、この framework migration の implementation target には含めません。

```text
packages/framework/core/        # framework source of truth
packages/framework/harness/     # harness-specific authored source
packages/framework/package.json # framework package boundary
core -> packages/framework/core       # compatibility alias
harness -> packages/framework/harness # compatibility alias
scripts/                       # repository-level packaging/self-promotion tooling
dist/<name>/                    # public committed distribution output
.claude/.codex/.agents          # dogfood runtime install targets
packages/setup/                 # sibling package, handled by separate intent
```

## 検討した代替案

### 説明なしの現状維持

root レベルの `core/`, `harness/`, `scripts/`, `dist/` を維持するだけで、`packages/setup` との混在を説明しない案です。

この案は変更が最小ですが、Issue #610 の目的である MECE な package-owned boundary を満たさないため採用しません。

### scripts と dist を含む完全なワークスペース正規化

framework 側を `packages/framework/{core,harness,dist,scripts}` へすべて移す案です。

この案は package-owned な境界として最も一貫しますが、`dist/` は README や install command が参照する public install source です。また `scripts/package.ts` と `scripts/promote-self.ts` は repository レベルの build/release guard として CI や contributor workflow に直接結合しています。

現時点では採用しません。`core` と `harness` の source boundary だけを package-owned に移し、`scripts` と `dist` は root contract として維持します。

### ソース alias のみ

`packages/framework/` を追加せず、root `core/` と `harness/` を残したまま docs だけを更新する案です。

この案は実装リスクが低いですが、Issue #610 が求めるワークスペースレイアウトの正規化には届かないため採用しません。

## パスへの影響

| 領域 | 新しいコントラクト | 影響 |
| --- | --- | --- |
| `scripts/package.ts` | source root は `packages/framework/core` と `packages/framework/harness`、output は root `dist` | `CORE_ROOT` / `HARNESS_ROOT` を package-owned なパスに変更する |
| `scripts/promote-self.ts` | root `dist/claude`, root `dist/codex` から root `.claude/.codex/.agents` へ同期する | 変更なし |
| `scripts/manifest-types.ts` | manifests は package-owned な harness から root `scripts` の shared contract を import する | import path を更新する |
| `dist/*` | generated かつ committed な public install source | root に維持する |
| `.claude/.codex/.agents` | repository dogfood な runtime install target | root に維持する |
| `tsconfig.json` | authored TypeScript source は `packages/framework/core` と `packages/framework/harness` を include する | include path を更新する |
| tests/docs | 既存の root `core` / `harness` 参照は alias で継続可能 | 段階的に package-owned なパス表記へ更新する |
| `.github/workflows/ci.yml` | `dist:check` と `promote:self:check` を実行する | root script contract 維持により変更不要 |

## ガードの保全

この decision は release/drift guard を弱めません。

- `bun run dist:check` は `packages/framework/core` + `packages/framework/harness` から root `dist/<harness>` が byte-identical に生成できることを検証します。
- `bun run promote:self:check` は root `.claude/.codex/.agents` が generated distributions と同期していることを検証し続けます。
- `bun run typecheck`, `bun run lint`, および関連する `tests/run-tests.sh` プロファイルは、コードやテストが変わるときの検証パスであり続けます。

`dist/` を移動しないため、既存の install commands と public distribution path は維持されます。

## 検証チェックリスト

この layout に関する変更を出すときは、変更種別に応じて次を確認します。

| 変更種別 | 必要な検証 |
| --- | --- |
| Source path または manifest import の変更 | `bun run typecheck` |
| Packaging の source/output path の変更 | `bun run dist:check` |
| Self-install、Codex/Claude runtime surface、または composed scope の挙動変更 | `bun run promote:self:check` |
| ドキュメントのパス表記の変更 | docs review と、該当する場合は docs legacy refs gate |
| harness runtime flow に触れる挙動変更 | 関連する `tests/run-tests.sh` プロファイル |

## 影響

### ポジティブ

- Framework source が `packages/framework/` にまとまり、`packages/setup` と sibling package として並びます。
- root `dist/` の public install contract を維持できます。
- root `scripts/` の build/release workflow を維持できます。
- 既存の docs/tests/imports は、移行中も root `core` と `harness` の alias 経由で継続できます。

### ネガティブ

- root `core` / `harness` の alias は移行期の互換サーフェスであり、第二の source of truth になってはなりません。
- 一部の docs/tests はまだ root `core/` と `harness/` に言及します。これは互換 alias として有効ですが、source of truth を説明する文脈では段階的に `packages/framework/` 表記へ更新します。
- `scripts/` や `dist/` の完全な relocation は、将来望む場合でも専用の migration intent を依然として必要とします。

## 将来の移行トリガー

root `scripts/` の移動は、framework packaging がリポジトリ root から独立してリリース可能になった場合にのみ再検討します。

root `dist/` の移動は、install commands と public distribution への期待を README、docs、tests、CI、self-promotion にわたって意図的に変更できる場合にのみ再検討します。

## 想定される後続スライス

### ドキュメントパスのクリーンアップ

目的: root `core/` / `harness/` の散文中の参照を、source of truth の文脈では `packages/framework/core` / `packages/framework/harness` と書くように段階的に更新する。

非目的: runtime の `.claude/.codex/.agents` や root `dist/` の説明は変えない。

ガードコマンド:

- docs review
- `bun tests/run-tests.ts --unit --filter t174-docs-legacy-refs-gate`

### alias 廃止の準備状況

目的: root `core` / `harness` の alias に依存する tests/imports/docs を棚卸しし、将来 alias を消せるかを判断する。

非目的: この issue では alias を削除しない。

ガードコマンド:

- `bun run typecheck`
- 関連する `tests/run-tests.sh` プロファイル

### Scripts パッケージ境界

目的: `scripts/` を root に残すか、将来 `packages/framework/scripts` に移すかを再評価する。

非目的: `dist/` の移動を同時に行わない。

ガードコマンド:

- `bun run dist:check`
- `bun run promote:self:check`
