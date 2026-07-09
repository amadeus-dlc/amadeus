# コンポーネント棚卸し

## Framework コンポーネント(既存、安定)

| コンポーネント | 責務 | 依存先 | 本 intent との関係 |
| --- | --- | --- | --- |
| `packages/framework/core/` | AI-DLC engine source, tools, templates, stage 定義 | 各種 scripts・manifest | #657 の正本を含む |
| `packages/framework/harness/<name>/` | harness ごとの配布 source | `scripts/manifest-types.ts` | 直接の修理対象なし |
| `scripts/package.ts` | `dist/<name>` の生成と検査 | `packages/framework/core`, `packages/framework/harness` | #657 修理の伝播経路(必須) |
| `scripts/promote-self.ts` | self-install と drift check | root `dist/claude`, `dist/codex` | #657 修理の伝播経路(必須) |

## `@amadeus-dlc/setup` コンポーネント(前回 intent で新設、完成済み)

| コンポーネント | 責務 | 依存先 | バグとの関係 |
| --- | --- | --- | --- |
| `packages/setup/src/domain/installation.ts` | `Installation` 判別ユニオンと `detect()` | `manifest-io.ts`(`ManifestIo`)、`engine-layout.ts` | **#656 の直接対象** |
| `packages/setup/src/domain/upgrade.ts` | `LegacyLayout` 等アップグレード判定 | `installation.ts` の evidence 型 | **#656 の直接対象**(条件(b)未到達) |
| `packages/setup/src/modules/manifest-io.ts` | manifest ファイルの読み書き | `domain/manifest.ts` | `Installation.detect` の協力者 |
| `packages/setup/src/modules/{applier,fetcher,resolver,reporter,verifier,wizard}.ts` | install/upgrade フロー各段 | domain 層 | 直接の修理対象外(#656 波及確認が必要) |
| `packages/setup/tests/setup-*.test.ts`(11ファイル) | ユニットテスト(manifest/plan/reporter/resolved-version/resolver/semver/timestamps/upgrade/verifier/version-spec/wizard) | 各モジュール | #656 のリグレッションテストをここに追加 |

## センサー/hooks コンポーネント(既存、#657・#641 の対象)

| コンポーネント | 責務 | 依存先 | バグとの関係 |
| --- | --- | --- | --- |
| `packages/framework/core/tools/amadeus-sensor-type-check.ts` | typecheck センサー(PostToolUse hook から起動) | `bunx`/`node_modules/.bin/tsc` | **#657 の直接対象**(正本) |
| `.claude/tools/amadeus-sensor-type-check.ts`(self-install コピー) | 同上 | 正本 + `promote:self` | #657 の伝播先 |
| `dist/*/tools/amadeus-sensor-type-check.ts`(生成配布物) | 同上 | 正本 + `scripts/package.ts` | #657 の伝播先 |
| `.claude/tools/amadeus-lib.ts` | hooks 共通ライブラリ、`resolveProjectDirFromHook()` | env/cwd/hook path | **#641 の直接対象** |
| `.claude/hooks/*.ts`(11 hooks) | state 同期・監査ログ・subagent tracking 等 | `amadeus-lib.ts` | #641 の間接的影響範囲(worktree セッションで gate 誤拒否) |

## ドキュメント/knowledge コンポーネント(#661 の対象)

| コンポーネント | 責務 | 依存先 | バグとの関係 |
| --- | --- | --- | --- |
| `.claude/amadeus-common/stages/inception/delivery-planning.md` | delivery-planning stage 定義(+ core/dist/.codex 複製) | — | **#661 の直接対象**(誤記述の発生源) |
| `.claude/knowledge/amadeus-delivery-agent/workflow-planning-guide.md` | delivery-agent 向け知識 | delivery-planning.md の記述を継承 | #661 の伝播先 |
| `.claude/amadeus-common/protocols/stage-protocol.md` | Glossary(canonical 定義) | — | #661 の正しい参照元 |
| `docs/reference/04-stages/inception.md`(EN) | ユーザー向け stage リファレンス | delivery-planning.md 相当の記述 | #661 の伝播先(誤記述を転記済み) |
| `docs/reference/04-stages/inception.ja.md`、`docs/guide/glossary.md`/`glossary.ja.md` | 日本語版・glossary | 未精査 | #661 の要確認範囲 |

## 品質コンポーネント(既存)

| コンポーネント | 責務 | 依存先 | 本 intent との関係 |
| --- | --- | --- | --- |
| `tests/integration/t92.test.ts`(Group N test 44) | センサー exit code 契約の検証 | `amadeus-sensor-type-check.ts` | #657 のリグレッションテストの既存アンカー |
| `.github/workflows/ci.yml` | typecheck・lint・dist:check・promote:self:check・tests | root package scripts | #657 修理後もグリーンを維持する必要がある |
| root `package.json` の `lint` scope | `tests/ packages/setup/` に拡大済み | Biome | `packages/setup/` は既に lint 対象(前回 intent で配線済み) |
