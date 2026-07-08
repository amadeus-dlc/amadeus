# コンポーネント棚卸し

## Framework コンポーネント(既存)

| コンポーネント | 責務 | 依存先 | installer との関係 |
| --- | --- | --- | --- |
| `packages/framework/core/` | AI-DLC engine source, tools, templates, stage 定義。root `core/` はここへのシンボリックリンク | 各種 scripts・manifest | installer は物理配置を意識しない(dist 経由で消費) |
| `packages/framework/harness/<name>/` | harness ごとの配布 source。root `harness/` はここへのシンボリックリンク | `scripts/manifest-types.ts` | 同上 |
| `packages/framework/core/tools/amadeus-version.ts` | `AMADEUS_VERSION = "1.1.0"` の source | `scripts/package.ts` が相対 import | installer 自身のバージョンとは独立させる必要がある |
| `harness/<name>/manifest.ts` | harness ごとの source projection を宣言 | `scripts/manifest-types.ts` | installer は関与しない |
| `harness/codex/emit.ts` | Codex 配布物の追加 emission | assembled dist tree | installer は関与しない |

## ビルドと配布コンポーネント(既存、installer の参考実装)

| コンポーネント | 責務 | 依存先 | installer との関係 |
| --- | --- | --- | --- |
| `scripts/package.ts` | `dist/<name>` の生成と検査(`--check`) | `packages/framework/core`, `packages/framework/harness`, root `dist/` | tag アーカイブに同梱される dist 成果物を生成する |
| `scripts/promote-self.ts` | dogfood self-install と drift check、preservation ルール | root `dist/claude`, root `dist/codex`, root runtime dirs | **non-destructive merge の設計に直接転用できる ownership 判定・diff・`--check` モードを持つ** |
| `scripts/manifest-types.ts` | manifest schema と projection semantics | source-side のみ | installer は消費しない |
| `packages/framework/package.json` | `@amadeus-dlc/framework` の薄いスクリプト委譲 | `../../scripts/*.ts` | installer の package.json 設計の対比先(private:true・0.0.0 という前例) |
| `dist/<name>/`(claude/codex/kiro/kiro-ide） | commit 済み生成配布物 | packager, docs, tests, CI | installer が fetch/展開する対象そのもの |

## Runtime と dogfood コンポーネント(既存)

| コンポーネント | 責務 | 依存先 | installer との関係 |
| --- | --- | --- | --- |
| `.claude/` | この repo の Claude runtime install target | `promote-self` | installer が第三者プロジェクトに対して行う操作の自己適用版 |
| `.codex/` | この repo の Codex runtime install target | `promote-self`, composed scope preservation | 同上 |
| `.agents/` | Codex skills/runtime install target | `dist/codex/.agents` | 同上 |
| `amadeus/spaces/default/` | local Amadeus record/artifact store(この CodeKB もここに含まれる) | 現在の intent | installer 自体は関与しない |

## 品質コンポーネント(既存)

| コンポーネント | 責務 | 依存先 | installer との関係 |
| --- | --- | --- | --- |
| `.github/workflows/ci.yml` | typecheck・lint・`dist:check`・`promote:self:check`・tests(smoke+unit+integration) | root package scripts | publish workflow が存在しないため installer には新設が必要 |
| `tests/harness/fixtures.ts` | `AMADEUS_SRC = <REPO_ROOT>/dist/claude/.claude` を anchor とする e2e fixture | root `dist/*` | installer テストも同様の dist コピーパターンを踏襲すべき |
| `tests/unit/t68-version-changelog-sync.test.ts` | `AMADEUS_VERSION` / CHANGELOG / README バッジの3者同期を検証 | `amadeus-utility.ts version` の実行結果 | installer 独自バージョンには同種のゲートがまだ存在しない |
| `tests/unit/t200-promote-self-composed-scope.test.ts` | self-promotion preservation を検証 | `scripts/promote-self.ts` | installer の non-destructive merge テストの参考パターン |
| biome(`bunx @biomejs/biome check tests/`) | lint | `tests/` のみが対象。`packages/framework` と `scripts/` は対象外 | `packages/setup` は明示的な lint wiring が必要 |

## ドキュメントコンポーネント(既存)

| コンポーネント | 責務 | 依存先 | installer との関係 |
| --- | --- | --- | --- |
| `README.md` | public install と contributor model(version badge line 11 = 1.1.0、t68 が参照） | root `core/harness/dist` | npm/npx/bunx インストール記述は現状ゼロ件 — installer 追加後に更新が必要 |
| `docs/guide/harnesses/*.md` | harness-specific install/regenerate instructions | root `dist/*` | installer 導入後の docs 更新対象 |
| `docs/reference/11-contributing.md` | maintainer workflow | `packages/framework/`, `dist/` | installer 追加時に「Adding a Utility Handler」等と同種のチェックリスト整備が必要になり得る |

## 新設コンポーネント(この intent が作る、未着手)

| コンポーネント | 責務(想定） | 依存先(想定） | 既知の未確定事項 |
| --- | --- | --- | --- |
| `packages/setup/` | `@amadeus-dlc/setup` publishable CLI の source | GitHub tag archive, `dist/<harness>/` 相当の内容 | ディレクトリ自体が未作成 |
| `packages/setup/package.json` | npm publish メタデータ(正しい license/repository を持つ） | — | 独自バージョンライフサイクルの設計が必要 |
| setup CLI の install/upgrade ロジック | GitHub tag 取得、非破壊マージ、diff report | `scripts/promote-self.ts` の考え方を再利用可能 | 現状 git tag が0件で、tag 発行フローも未整備 |
| setup 用ビルド出力(JS for npx/bunx） | npm 経由実行を可能にするビルド成果物 | TypeScript source | このリポジトリで初めての「ビルドして publish する」パッケージ |
