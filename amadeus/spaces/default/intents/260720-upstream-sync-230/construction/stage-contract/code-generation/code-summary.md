# stage-contract コード生成サマリ (U01)

## 対象

- ユニット: U01 `stage-contract`
- 作業ツリー: `resume-usync-230-takeover`(HEAD `d1c3dd3560b8401c248303e1cdcc5f8ed8a5b58d`)
- 測定 ref: `origin/main...HEAD`(merge-base `d41d8a82a322cd9539e0feecc2204abda5ea32b1`)

備考: 本ブランチは upstream-sync-230 の複数ユニットをまとめた takeover ブランチであり、`origin/main...HEAD` の全体差分(211 ファイル)は U01 に限定されない。以下は U01 該当面のみを scope した差分である。

## 変更ファイル一覧(U01 該当面、ref: `origin/main...HEAD`)

`git diff --stat origin/main...HEAD -- <U01該当面>` からの転記:

| ファイル | 増減 |
| --- | --- |
| packages/framework/core/tools/amadeus-graph.ts | 54 |
| packages/framework/core/tools/amadeus-stage-schema.ts | 171 |
| tests/integration/t248-stage-contract-routing.test.ts | 292 (+) |
| tests/unit/t248-stage-contract.test.ts | 220 (+) |
| tests/unit/t186-foreach-per-unit-iteration.test.ts | 30 (+) |
| tests/unit/t62.test.ts | 6 |
| tests/unit/t64.test.ts | 7 |

合計(上記 scope): 7 files changed, 757 insertions(+), 23 deletions(-)。

加えて U01 公開シームの配線・所有:

- `packages/framework/core/tools/amadeus-orchestrate.ts`: `requiredArtifactsForUnit` を 4 箇所で参照(import :123、呼び出し :1153 / :1160 / :2181)。
- `packages/framework/core/tools/amadeus-state.ts`: artifact guard 配線 — `requiredArtifactsForUnit` を import(:83)し、stage completion の `kindAwareArtifactsExist`(:972、呼び出し :988)で同一の成果物選択規則を適用する(検証: `tests/integration/t248-stage-contract-routing.test.ts` の completion guard 2 ケース)。同ファイルの `origin/main...HEAD` 差分は 608 insertions / 104 deletions(他ユニット変更同居のため U01 分は上記関数・参照単位で特定)。
- `packages/framework/core/tools/amadeus-lib.ts`: `UNIT_KINDS` / `UnitKind` / `normalizeUnitKind`(:67)を正本として所有(機能設計 E-USSUFD1 の lib 所有裁定に準拠)。
- dist/self-install 生成物: 6 ハーネスの `amadeus-stage-schema.ts` コピー(claude/codex/cursor/kiro/kiro-ide/opencode)を `bun scripts/package.ts` の正準ジェネレーター経由で同期(手編集なし)。

## 実装した契約(FR-2 item 7 / FR-6 item 18)

- **FR-2 item 7(厳格な frontmatter 検証)**: `validateStageFrontmatter` を `amadeus-stage-schema.ts` に実装(`normalizeUnitKind` は `amadeus-lib.ts:67` 実装を import:12 で利用)。プラグイン由来 frontmatter の未知キー・不正なユニット種別・不正な `when` 条件式を fail-closed で拒否し、`produces_kinds` を検証する。
- **FR-6 item 18(ユニット種別別の成果物枝刈り)**: `requiredArtifactsForUnit(stage, kind)` を `amadeus-graph.ts:764` に公開シームとして実装。filter ロジックは同関数本体にインライン実装であり、独立 helper `filterProducesByKind` は存在しない(実測: repo 全域 grep 0 件)。directive(orchestrate)・coverage(orchestrate)・artifact guard(state の `kindAwareArtifactsExist`)が同一の成果物選択規則を適用する。種別情報が欠落・不正な場合は全成果物行列へフォールバックし過少生成を防ぐ(空集合は vacuous success)。
- 公開シームのうち `validateStageFrontmatter` / `normalizeUnitKind` / `requiredArtifactsForUnit` は機能設計 BR-U01-11 の正準 signature に一致。`compileStageGraph` は**申告済み逸脱**: 設計の純関数 signature(`(stages) => ContractResult`)ではなく、既存の disk 読み込み型コンパイラ `compileStageGraph(): { json; gridJson; stages }`(`amadeus-graph.ts:1439`、検証失敗は throw)を再利用し、body 内で `produces_kinds`/`bundle`/`when`/`required_sections` を投影する。ユーザー裁定(2026-07-22、レビューイテレーション1 Critical #1)により「実装を正とし記録を訂正」— NFR-7(既存 choke point 最小変更)と既存テスト群(t88/t89/t110/t124/t184/t212/t66)との整合を根拠とする。FD 側の追補は functional-design/business-logic-model.md「実装裁定追補」を参照。
- 既定 4 ステージに `produces_kinds` を追加。既定ステージ生成物は変更前とバイト同一。

## 検証コマンドと実測 exit code

前提: 当初 node_modules 不在により `tsc` が未解決(typecheck EXIT=127)だったため `bun install` を実施(EXIT=0、257 packages)。以降は全て deps 導入済みで再実測。すべてパイプなし・フォアグラウンド同期実行し `$?` を実測。

| コマンド | exit code | 備考(集計出力からの転記) |
| --- | --- | --- |
| `bun test tests/unit/t248-stage-contract.test.ts tests/integration/t248-stage-contract-routing.test.ts tests/unit/t62.test.ts tests/unit/t64.test.ts tests/unit/t186-foreach-per-unit-iteration.test.ts` | 0 | `Ran 175 tests across 5 files` / `175 pass` / `0 fail`(期待 5 ファイルと一致) |
| `bun run typecheck` | 0 | `tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.tests.json` |
| `bun run lint:check` | 0 | Biome check(tests/ packages/setup/ packages/framework/core/ scripts/) |
| `bun run dist:check` | 0 | `bun scripts/package.ts --check` |
| `bun run promote:self:check` | 0 | `bun scripts/promote-self.ts --check` |
| complexity gate | N/A | package.json に complexity 系 script は不在(`grep -iE 'complexity' package.json` で 0 件) |

focused test の path 実在は実行前に `ls` で 5 path 全て機械確認済み。dist byte-identity は補助確認として `cmp -s` で 6 ハーネスコピー全てが core と identical であることを実測(dist:check EXIT=0 と整合)。

## 修正の有無

- U01 実装(手順 1〜7)は前任検分どおり全て実装済みで、本タスクでのソース修正は不要だった。
- 環境面のみ: `bun install` で依存を導入(typecheck 実行のため)。ソースコード・生成物への変更なし、正本再生成(`scripts/package.ts` / `promote:self`)も不要。

## 既知の制約・申告事項

- **`requiredArtifactsForUnit` の所在判定(2026-07-22 訂正)**: 本関数は `amadeus-graph.ts:764` に配置されている。設計はファイル所在を明示指定しておらず、graph.ts 配置自体は矛盾しない。ただし当初記載の「内部 `filterProducesByKind` を `compileStageGraph` と共有」は実装に存在しない共有関係の誤記だった(grep 0 件 — レビューイテレーション1 Critical #2 で捕捉)。実態は filter ロジックの同関数内インライン実装であり、`compileStageGraph` は kind フィルタリングに関与しない。`compileStageGraph` の signature 逸脱はユーザー裁定で申告済み(前節)。
- 測定 ref の全体差分は takeover ブランチ全ユニットを含むため、上記変更ファイル一覧は U01 該当面に scope 済み。amadeus-lib.ts / amadeus-orchestrate.ts は他ユニット変更も同居するため、U01 分は関数・参照単位で明示した。
- コミット/push は未実施(conductor が実施)。
