# コード構造

## トップレベル構造

`packages/` は `framework` と `setup` の2パッケージ構成になった(前回 codekb 時点では `setup` は未着手だった)。

| パス | 役割 | 備考 |
| --- | --- | --- |
| `packages/framework/core/` | harness-neutral な AI-DLC runtime の物理 source | #657 の正本 `amadeus-sensor-type-check.ts` はここにある |
| `packages/framework/harness/<name>/` | harness 固有 manifest・emitter の物理 source | 変更なし |
| `packages/setup/` | `@amadeus-dlc/setup` publishable CLI(完成済み) | 前回 codekb では未着手。#656 の対象 `installation.ts` を含む |
| `.claude/tools/` | dogfood self-install された framework tools のコピー | #641 の対象 `amadeus-lib.ts` を含む(core 正本のコピー) |
| `.claude/amadeus-common/stages/inception/delivery-planning.md` | inception 段の Bolt/Unit 定義記述 | #661 の対象。core/dist/.codex に複製あり |
| `dist/` | commit 済み生成物(`claude`, `codex`, `kiro`, `kiro-ide`) | #657 の複製先の一つ |
| `docs/reference/04-stages/inception.md` | Bolt/Unit 用語の英語版参照ドキュメント | #661 対象。`inception.ja.md`・`docs/guide/glossary.md`/`glossary.ja.md` は未精査 |

## `packages/setup/src/` の内部構成(functional-domain-modeling-ts スタイル)

前回 intent が確立したパッケージ内部構成。type + companion namespace, frozen literal factory のスタイルで統一されている。

| ディレクトリ | 責務 | #656 との関係 |
| --- | --- | --- |
| `domain/` | ドメイン型(installation, upgrade, manifest, plan, semver, version-spec 等) | `installation.ts`(Installation 判別ユニオン・detect)、`upgrade.ts`(LegacyLayout)が対象 |
| `internal/` | *-factory 実装詳細 + tar-archive-extractor | — |
| `modules/` | applier, fetcher, manifest-io, reporter, resolver, verifier, wizard | `manifest-io.ts`(ManifestIo)が `Installation.detect` の協力者 |
| `ports/` | apply-write, fsops, http, tty, verify-read | — |
| `shared/` | result, timestamps | — |

`Installation`(`domain/installation.ts:18-22`)は判別ユニオン(`none` / `manifested` / `manual-or-unknown` / `partial`)で、`admitsInstall(force)` を tell-dont-ask に持つ。`detect()`(`installation.ts:28-47`)は namespace 側の static 関数で、manifest 優先 → `scanEvidence()` → 3分岐という一直線のロジックであり、`upgrade.ts` の `LegacyLayout` とは呼び出し関係を持たない。これが #656 の構造的原因である。

## センサー複製構造(#657 の影響範囲)

`amadeus-sensor-type-check.ts` は次の4箇所に同一内容が複製されている。

| 配置 | 役割 | 修理時の扱い |
| --- | --- | --- |
| `packages/framework/core/tools/amadeus-sensor-type-check.ts` | 正本 | ここを修正する |
| `.claude/tools/amadeus-sensor-type-check.ts` | self-install コピー | `bun run promote:self` で同期 |
| `.codex/tools/amadeus-sensor-type-check.ts`(想定) | self-install コピー | 同上 |
| `dist/*/tools/amadeus-sensor-type-check.ts` | 生成配布物 | `bun scripts/package.ts` で同期 |

正本1箇所の手動修正だけでは `dist:check`/`promote:self:check` が drift として検知する。修理コミットは正本修正 + `bun scripts/package.ts` + `bun run promote:self` を同一コミットに含める必要がある(team.md Mandated 準拠)。

## hooks ライブラリの構成(#641 の影響範囲)

`resolveProjectDirFromHook()`(`.claude/tools/amadeus-lib.ts:240-259`)は4段のフォールバック鎖を持つ。

1. `CLAUDE_PROJECT_DIR` env
2. hook スクリプトパス逆算
3. cwd probe
4. cwd

worktree セッションでは (1) の env が未設定または launch dir を指したままの場合、(2) も launch dir に基づく計算になり、最終的に4層すべてが launch dir に収束しうる。engine(`amadeus-orchestrate.ts`)側は実際の worktree cwd で動作するため、両者が別ツリーに分岐する。`amadeus-lib.ts` は `.claude/tools/` 配下にあり、`packages/framework/core/tools/` の正本コピーである可能性が高い(要 diff 確認)。

## グロッサリー逆転記述の所在(#661 の影響範囲)

「A Bolt wraps one or more Units of Work」という誤記述の所在。

| ファイル | 状態 |
| --- | --- |
| `.claude/amadeus-common/stages/inception/delivery-planning.md:79` | 誤記述あり(+ core/dist/.codex に複製4箇所) |
| `.claude/knowledge/amadeus-delivery-agent/workflow-planning-guide.md:58` | 同記述を継承 |
| `.claude/amadeus-common/protocols/stage-protocol.md:657` | Glossary(canonical、正しい定義) |
| `docs/reference/04-stages/inception.md:993` | 英語版に転記済み(誤り) |
| `docs/reference/04-stages/inception.ja.md`、`docs/guide/glossary.md`/`glossary.ja.md` | 未精査。修理時に確認が必要 |

## 次工程へ持ち越す設計候補

1. #656: `Installation.detect` に loose ファイル検出パスを追加するか、`LegacyLayout.isUnsupported` 条件(b)を到達可能にする呼び出し経路を設計する。
2. #657: `spawnSync` 呼び出し前に repo-local `node_modules/.bin/tsc` の存在を優先確認する分岐を追加する。
3. #641: `resolveProjectDirFromHook()` に worktree cwd を優先/検証するステップを追加する。
4. #661: 全複製箇所(4+ ファイル、日本語版含む)を grep で洗い出し、Bolt/Unit の定義を canonical glossary に統一する。project.md の「概念の改名・所有移管を含む修正では旧名を全成果物で grep してから再レビューに出す」是正事項(cid:functional-design:c3)に従う。
