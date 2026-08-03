# ワークスペースレイアウトの決定(Workspace Layout Decision)

> 言語: [English](18-workspace-layout.md) | **日本語**

> **状態更新(2026-08-03):** 本書で決定したpackage-ownedなソース境界は現在も有効です。後続のsource-only配布決定により、本書の当初の「コミット済み `dist/`」境界は置き換えられました。root `dist/` とself-install投影は未追跡のローカル出力であり、バージョン付きGitHub Release Assetが公開インストール契約です。

## コンテキスト

GitHub issue #610 は、Amadeus リポジトリのワークスペース/パッケージレイアウトを正規化するための課題です。従来は framework の source of truth を root レベルの `core/` と `harness/` に置き、setup/installer 系の作業だけを将来 `packages/setup/` に置く前提でした。

このままだと、framework source は root、setup package は `packages/` という責務軸が混在します。`packages/setup` を別 intent で進める前に、framework 側も package-owned な source boundary を持つ必要があります。

## 決定

Amadeus は framework の authored source を `packages/framework/` に移します。

- `packages/framework/core/` を harness-neutral な source of truth とします。
- `packages/framework/harness/<name>/` を harness-specific な authored source とします。
- `packages/framework/package.json` を framework package boundary として追加します。
- root `scripts/` は repository レベルの packaging/self-promotion tooling として維持します。
- root `dist/<name>/` は未追跡のローカル出力として生成し、release CIもクリーンcheckoutから生成します。
- root `.claude/`, `.codex/`, `.agents` はdogfoodなself-installターゲットとして維持し、追跡するbootstrap/configuration allowlist以外の生成物はignoreします。
- リポジトリ root には `core` / `harness` を置きません。docs/tests/imports は `packages/framework/core`・`packages/framework/harness` を直接参照します。
- `packages/setup` は別 intent の sibling package として扱い、この framework migration の implementation target には含めません。

```text
packages/framework/core/        # framework source of truth
packages/framework/harness/     # harness-specific authored source
packages/framework/package.json # framework package boundary
scripts/                       # repository-level packaging/self-promotion tooling
dist/<name>/                    # ignored local distribution output
.claude/.codex/.agents          # generated dogfood runtime surfaces + tracked allowlist
packages/setup/                 # sibling package, handled by separate intent
```

## 検討した代替案

### 説明なしの現状維持

root レベルの `core/`, `harness/`, `scripts/`, `dist/` を維持するだけで、`packages/setup` との混在を説明しない案です。

この案は変更が最小ですが、Issue #610 の目的である MECE な package-owned boundary を満たさないため採用しません。

### scripts と dist を含む完全なワークスペース正規化

framework 側を `packages/framework/{core,harness,dist,scripts}` へすべて移す案です。

この案はpackage-ownedな境界として最も一貫します。後続のsource-only移行はroot `scripts/` とローカル出力パスを移動せず、公開インストール契約だけを追跡済み `dist/` からRelease Assetへ移しました。

path ownershipとしては採用しません。`core` と `harness` のsource boundaryだけをpackage-ownedに移し、`scripts` と未追跡のローカル `dist` 出力パスはrootに維持します。

### ソース alias のみ

`packages/framework/` を追加せず、root `core/` と `harness/` を残したまま docs だけを更新する案です。

この案は実装リスクが低いですが、Issue #610 が求めるワークスペースレイアウトの正規化には届かないため採用しません。

## パスへの影響

| 領域 | 新しいコントラクト | 影響 |
| --- | --- | --- |
| `scripts/package.ts` | source root は `packages/framework/core` と `packages/framework/harness`、output は root `dist` | `CORE_ROOT` / `HARNESS_ROOT` を package-owned なパスに変更する |
| `scripts/promote-self.ts` | root `dist/claude`, root `dist/codex` から root `.claude/.codex/.agents` へ同期する | 変更なし |
| `scripts/manifest-types.ts` | manifests は package-owned な harness から root `scripts` の shared contract を import する | import path を更新する |
| `dist/*` | 未追跡のローカル出力。release CIがクリーンbuildをasset化する | rootに維持する |
| `.claude/.codex/.agents` | 生成されるdogfood runtimeと追跡bootstrap/configuration allowlist | rootに維持する |
| `tsconfig.json` | authored TypeScript source は `packages/framework/core` と `packages/framework/harness` を include する | include path を更新する |
| tests/docs | `packages/framework/core` / `packages/framework/harness` を直接参照する | — |
| `.github/workflows/ci.yml` | テスト前build、隔離2回build比較、source-only境界検査を実行する | root script contractは維持 |

## ガードの保全

現在のsource-only境界は、コミット済みコピーとのparityではなく生成器の性質を検証します。

- CIは隔離した2回のbuildをbyte単位で比較して再現性を検証します。
- `bun run source-only:check` はallowlist外の生成物が追跡・stageされた場合に拒否します。
- graph compileは生成成功と構造的不変量を検証します。
- `bun run typecheck`, `bun run lint`, および関連する `tests/run-tests.sh` プロファイルは、コードやテストが変わるときの検証パスであり続けます。

release CIはクリーンcheckoutから配布物を生成し、checksum・manifestとともに単一のバージョン付きassetを公開します。これにより、代替の手編集ガードを追加せず、ローカル `dist/` 編集からreleaseへの経路を閉じます。

## 検証チェックリスト

この layout に関する変更を出すときは、変更種別に応じて次を確認します。

| 変更種別 | 必要な検証 |
| --- | --- |
| Source path または manifest import の変更 | `bun run typecheck` |
| Packaging のsource/output path変更 | `bun run build`、reproducible-build CI、`bun run source-only:check` |
| Self-install、Codex/Claude runtime surface、またはcomposed scope挙動変更 | `bun run build`、関連テスト、`bun run source-only:check` |
| ドキュメントのパス表記の変更 | docs review と、該当する場合は docs legacy refs gate |
| harness runtime flow に触れる挙動変更 | 関連する `tests/run-tests.sh` プロファイル |

## 影響

### ポジティブ

- Framework source が `packages/framework/` にまとまり、`packages/setup` と sibling package として並びます。
- root `dist/` をreviewやcommitへ混ぜず、便利なローカル出力パスとして維持できます。
- root `scripts/` の build/release workflow を維持できます。

### ネガティブ

- `scripts/` やローカル `dist/` 出力パスの完全なrelocationは、将来望む場合でも専用のmigration intentを必要とします。

## 将来の移行トリガー

root `scripts/` の移動は、framework packaging がリポジトリ root から独立してリリース可能になった場合にのみ再検討します。

root `dist/` の移動は、ローカルbuild pathをREADME、docs、tests、CI、self-promotion、Release Asset、installerにわたって意図的に変更できる場合にのみ再検討します。
