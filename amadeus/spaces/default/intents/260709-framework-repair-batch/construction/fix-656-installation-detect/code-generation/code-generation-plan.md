# Code Generation Plan — fix-656-installation-detect

> Bolt: `fix-656-installation-detect` / Issue: [#656](https://github.com/amadeus-dlc/amadeus/issues/656) / 要件: FR-656(requirements.md)
> 対象: `packages/setup/src/domain/installation.ts`(+ `upgrade.ts` の合流点)。P0。

## 設計方針(実測済みコードに基づく)

現状の `Installation.detect`(installation.ts:28-47)は (1) manifest 可読なら無条件 `manifested`、(2) evidence なし → `none`、(3) アンカー欠落 → `partial`、(4) 両アンカーあり → `manual-or-unknown`。`LegacyLayout.isUnsupported` 条件(b)(upgrade.ts:106-116)は `manual-or-unknown` 経由でしか評価されず(upgrade.ts:191-194)、`scanEvidence` は loose `amadeus-*` を `paths` に載せないため到達不能。修理は:

- **FR-656-1**: `scanEvidence` が各 engineDir 直下の loose `amadeus-*` エントリ(anchor 3種以外の `amadeus-` 接頭辞ファイル/ディレクトリ)を `paths` に収集する。`detect` は「両アンカー false かつ loose `amadeus-*` evidence あり」の場合、`partial` ではなく evidence を保持した `manual-or-unknown` を返す — これにより既存の `LegacyLayout.isUnsupported` 条件(b)が `UpgradeSource.fromInstallation` で実経路評価され、`unsupported-layout` 拒否(force 無関係、upgrade.ts:193)に到達する。片アンカーのみ欠落のケースは従来どおり `partial`。
- **FR-656-2**: manifest 可読時、manifest 記載エントリのディスク実在を検証し、1件以上欠落なら `partial`(missing = 欠落パス)を返す。全件実在なら従来どおり `manifested`。
- **FR-656-3**: 上記(1)により BR-U07(unsupported-layout の無条件ハード拒否)は既存の `fromInstallation` 分岐で成立する。`partial-forced` への続行パスを unsupported ケースに残さない。

## Steps

- [ ] Step 1: 回帰テスト(赤)を先に書く — `tests/unit/`(既存 `setup-upgrade.test.ts` 系の慣行に従う)へ実ファイル fixture ベースで追加: (a) アンカーなし + loose `amadeus-*` のみの fixture で `detect` → `manual-or-unknown` かつ `UpgradeSource.fromInstallation(..., force=true)` が `unsupported-layout` 拒否; (b) manifest あり + 記載ファイル一部欠落 fixture で `detect` → `partial`。修正前に赤であることを実行して記録する(NFR-4)
- [ ] Step 2: `scanEvidence` に loose `amadeus-*` 収集を実装(FR-656-1 前半)
- [ ] Step 3: `Installation.detect` の分類分岐を修正 — 両アンカー false かつ loose evidence あり → `manual-or-unknown`(FR-656-1 後半)
- [ ] Step 4: `Installation.detect` に manifest エントリ実在検証を実装(FR-656-2)。manifest のファイル一覧 API は `manifest.ts` を読んで既存アクセサを使う(カプセル化破りの新設をしない)
- [ ] Step 5: Step 1 のテストが緑になることを実測。既存 `packages/setup` テストスイート全体の緑維持を確認
- [ ] Step 6: 検証コマンド一式: `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci`(packages/setup は dist/promote 対象外だが NFR-2 のフルセットを実行)

## 制約

- 互換シム・フォールバック分岐の追加禁止(NFR-3)。旧分類挙動は置き換える
- `packages/setup` は tell-dont-ask / parse-dont-validate の functional-domain-modeling スタイルを維持(project.md DECIDED)
- application code は workspace root(record dir に書かない)
