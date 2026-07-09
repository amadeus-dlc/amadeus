# リバースエンジニアリング実施記録

## 実行メタデータ

- Date: 2026-07-09
- Intent: `260709-framework-repair-batch`
- Scope: `bugfix`
- Repository: `/Users/j5ik2o/worktrees/github.com/amadeus-dlc/amadeus/claude-leader`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(前回スキャンコミットからの差分更新。project.md 是正事項 cid:reverse-engineering:c1 に従う)
- Base commit: `8510281ae`(前 intent `260708-installer-distribution` のベースライン、`amadeus/spaces/default/codekb/installer-distribution/` に記録)
- Observed commit: `aff3b6671`(166コミット差分)
- Focus: 修理対象バグ4件 — #656(`installation.ts` evidence 検出)、#657(`sensor-type-check.ts` bunx tsc 起動)、#641(hooks worktree cwd アンカー)、#661(Bolt/Unit glossary 逆転)

## 分析範囲

Developer サブエージェントが `git diff --name-status 8510281ae..aff3b6671` を基に166コミット分の差分をスキャンした。主な変更領域は次の通り。

- **new package**: `packages/setup/` — 独立配布 npm パッケージ `@amadeus-dlc/setup`(installer CLI)。前回スキャン時は未着手、今回スキャン時点で完成済み。
- **license/repo変更**: `MIT-0` → `(MIT OR Apache-2.0)`、repo url `awslabs/amadeus-workflows` → `amadeus-dlc/amadeus`。
- **root package.json**: `test:all` script 追加、`lint` スコープが `tests/` → `tests/ packages/setup/` に拡大、`release-it` 依存追加。
- **tests**: `packages/setup/tests/setup-*.test.ts` 群(11ファイル新規)。`CHANGELOG.md` は2026-07-09に削除済み(project.md DECIDED 準拠)。

重点スキャン対象は次の4ファイル/領域。

- `packages/setup/src/domain/installation.ts`(#656)
- `packages/setup/src/domain/upgrade.ts`(#656、LegacyLayout)
- `packages/framework/core/tools/amadeus-sensor-type-check.ts`(#657、+ `.claude`/`.codex`/`dist` の複製3箇所)
- `.claude/tools/amadeus-lib.ts`(#641、`resolveProjectDirFromHook()`)
- `.claude/amadeus-common/stages/inception/delivery-planning.md`(#661、+ core/dist/.codex 複製、knowledge、docs)

## 鮮度に関する注記

ベースライン `amadeus/spaces/default/codekb/installer-distribution/`(2026-07-08、commit `8510281ae` でスキャン)は「`packages/setup` が未着手」という前提のもとで書かれていた。この前提は本スキャン時点で stale であり、`packages/setup` は完成済みパッケージとして本 codekb 全体で置き換えた。

`260708-installer-distribution` intent のマージにより次が変化した。

- `packages/setup/` が実在し、functional-domain-modeling-ts スタイルで `domain/`、`internal/`、`modules/`、`ports/`、`shared/` が実装された。
- `package.json` の license/repository の既知の不備(前回 codekb の負債項目)が解消された。
- CI lint スコープが `packages/setup/` を含むよう拡大された(前回 codekb で指摘した「新設パッケージは lint 配線が必要」という負債は既に解消済み)。
- `CHANGELOG.md` が削除され、リリースノートは `release.yml` の GitHub Release 自動生成に一本化された。

## 合成方針(Architect)

Developer スキャン結果を受け、9アーティファクトを diff-refresh 方式で更新した。installer-distribution 完成という文脈の転換(未着手 → 完成済み)を全アーティファクトに反映しつつ、本 intent の主眼である4バグの原因コード位置・再現条件・修理時の波及範囲を architecture.md(相互作用図4本を新設)・code-structure.md・code-quality-assessment.md に集中して記述した。前回 codekb の「installer 設計の未確定事項」に関する記述は、確定済みの事実(バージョンライフサイクル分離、release.yml 一本化等)に置き換えた。

## 更新した成果物

- `business-overview.md`
- `architecture.md`
- `code-structure.md`
- `api-documentation.md`
- `component-inventory.md`
- `technology-stack.md`
- `dependencies.md`
- `code-quality-assessment.md`
- `reverse-engineering-timestamp.md`
