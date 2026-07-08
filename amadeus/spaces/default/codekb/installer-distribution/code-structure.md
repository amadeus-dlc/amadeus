# コード構造

## トップレベル構造

`packages/` には現在 `framework` のみが存在する。`packages/setup` はこの intent が新設する対象であり、まだ存在しない。

| パス | 役割 | 備考 |
| --- | --- | --- |
| `packages/framework/core/` | harness-neutral な AI-DLC runtime の物理 source | 唯一の参照先(root symlink は PR #644 で削除) |
| `packages/framework/harness/<name>/` | harness 固有 manifest・emitter の物理 source | 唯一の参照先(root symlink は PR #644 で削除) |
| `packages/framework/package.json` | `@amadeus-dlc/framework`, private:true, version 0.0.0 | 独自ビルドロジックなし。scripts は `../../scripts/*.ts` への委譲のみ |
| `harness/claude/` | Claude 配布物 source | manifest が coreDirs と harness files を projection |
| `harness/codex/` | Codex 配布物 source | `.codex`, `.agents/skills`, root `AGENTS.md` emit を含む |
| `harness/kiro/` | Kiro CLI 配布物 source | root `dist/kiro` install shape と結合 |
| `harness/kiro-ide/` | Kiro IDE 配布物 source | `.kiro/specs` / `.kiro/steering` shape と結合 |
| `scripts/` | packaging、promote-self、runner generation の実行可能な source of truth | `packages/framework/package.json` の各スクリプトはここへ委譲する |
| `dist/` | commit 済み生成物(`claude`, `codex`, `kiro`, `kiro-ide`) | install docs、tests、CI drift guard の anchor |
| `.claude/`, `.codex/`, `.agents/` | dogfood runtime install target | `promote-self` が preserve しながら更新 |
| `tests/` | smoke/unit/integration/e2e(計296ファイル)+ harness fixtures | `dist/claude/.claude` など root path 参照が多い |
| `docs/`, `README.md` | contributor/user guide | root `core/harness/dist` model を説明。npm/npx/bunx インストール記述はまだない |
| `.github/workflows/ci.yml` | CI(typecheck・lint・dist:check・promote:self:check・tests） | publish workflow は存在しない |
| `packages/setup`(未着手) | `@amadeus-dlc/setup` publishable CLI | install/upgrade サブコマンド、tag-archive fetch、non-destructive merge、JS ビルドを持つ想定 |

## ソース分類

`packages/framework/{core,harness}` は authored source、`dist/` は生成済みだが commit 済みの release 出力、`.claude/.codex/.agents` は repository 自身を dogfood するための promoted runtime である。root `core`/`harness` の互換シンボリックリンクは PR #644(2026-07-08)で削除された。`scripts/package.ts` の `CORE_ROOT`/`HARNESS_ROOT` をはじめ、tsconfig・biome・knip・tests の参照はすべて `packages/framework/` を直接指す。

`packages/setup` はこの分類に新しいカテゴリを1つ追加する。「authored source かつ npm publish 対象」という、現在の `packages/framework`(private:true で publish されない)にはない性質を持つ。

## パス影響の棚卸し(installer 観点)

| 領域 | 根拠 | 責務 | installer への関連 |
| --- | --- | --- | --- |
| Packager の root 定義 | `scripts/package.ts` の `FRAMEWORK_ROOT`/`CORE_ROOT`/`HARNESS_ROOT` | build input contract | installer は消費側であり、この定義には依存しない(dist 出力を消費する) |
| Dist 出力 | root `dist/<name>` | commit 済み release 出力 | tag アーカイブに同梱される想定の配布物 |
| Manifest 契約 | `scripts/manifest-types.ts` の `DirMap`/`FileMap`/`EmitContext` | source-to-dist mapping | installer は dist 済み出力のみを見るため、この契約を直接消費しない |
| Self-promotion preservation rules | `scripts/promote-self.ts` の `PRESERVE` リスト等 | dogfood install の data-loss prevention | installer の non-destructive merge 設計の直接の参考実装 |
| Version source | `packages/framework/core/tools/amadeus-version.ts` の `AMADEUS_VERSION` | framework コンテンツバージョン | installer 自身のバージョンとは独立させる必要がある |
| CI drift guard | `dist:check`、`promote:self:check` | framework 側の整合性ゲート | installer 側にも同種のパッケージ検証(`npm pack --dry-run` 等)が必要 |
| Test fixtures | `tests/harness/fixtures.ts` の `AMADEUS_SRC` | e2e install simulation の anchor | installer のテストも同様に dist コピーパターンを踏襲すべき |

## 次工程へ持ち越す設計候補

1. `packages/setup` を新規パッケージとして追加し、`packages/framework` とは独立した publish ライフサイクル(バージョン・CI・lint)を持たせる。
2. non-destructive merge の判定ロジックを `scripts/promote-self.ts` から共有モジュールとして抽出するか、`packages/setup` 側で独立実装するかを architecture decision として明示する。
3. tag アーカイブ配布の前提となる git tag 運用(現状 0 件)を、この intent または先行タスクとして整備する。

次 stage(requirements-analysis / application-design)では、この inventory を version resolution・CLI contract・force semantics・install manifest・upgrade boundary のテスト可能な要件へ変換する。
