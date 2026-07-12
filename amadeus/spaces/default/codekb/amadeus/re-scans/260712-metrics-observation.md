# RE スキャン記録 — 260712-metrics-observation

## 実行メタデータ

- **base**: `13598b752b656cc9bbf5d931f8e3a6c34881fd1c`(前 intent 260711-docs-repair-batch9 の observed。HEAD 祖先の observed のうち距離最小=56。E-L63)
- **observed**: `c11554226542faabd2a6c694650ea26323745ed8`(`git rev-parse HEAD` 実測)
- **base..observed コミット数**: 56
- **手法**: diff-refresh(cid:reverse-engineering:c1)。フォーカス面は observed HEAD 実コード直読で file:line 確定。真実源は本ファイルと `inception/reverse-engineering/scan-notes.md`。
- **intent 目的**: 既存計測経路(CCN 分布・テスト数・カバレッジ%)の出力をコミット snapshot に保存する観測機構(#921)。

## base 決定の実測根拠(E-L63)

`re-scans/*.md` 全 observed について `git merge-base --is-ancestor <sha> HEAD` + `git rev-list --count <sha>..HEAD`:

| observed 候補 | 出所 re-scan | HEAD 祖先? | 距離 |
|---|---|---|---|
| `13598b752b…` | 260711-docs-repair-batch9 | YES | **56(採用)** |
| `60f5e1edf…` | 260711-p3-cleanup-batch8 | YES | 58 |
| `37ad36a97f…` | 260711-p2-repair-batch7 / p3-repair-batch6 | YES | 69 |
| `b845478bb…` | 260710-bughunt-fix-batch | YES | 115 |
| `fc5a34cf19…` | 260710-mint-presence-vectors | YES | 156 |
| `5e9040cdab…` | 260710-delegate-answer-consume | YES | 238 |
| `e1a07fada3…` | 260710-kiro-stale-hooks | YES | 246 |
| `24197d755a…` | 260709-dynamic-test-size | YES | 296 |
| `98089faf17…` | 260710-codecov-project-gate | YES | 459 |
| `9a2f5c7205…` | 260709-pbt-small-band | YES | 469 |
| `11c52f153f…` | 260710-swarm-worktree-batch | NO(squash 別 SHA) | 除外 |
| `d6375bba68…` | 260711-docs-batch10 | NO(squash 別 SHA) | 除外 |

## フォーカス面(snapshot 再利用 seam の現存確認)

CCN 計測 seam(`tests/complexity-gate.ts`、全 export):
- `runLizard(): MeasurementOutcome`(:151)= CCN 生データ(records: path/name/ccn/ordinal)の入口。`MEASUREMENT_ROOTS`(:43)/ `CCN_BLOCK_THRESHOLD`=15(:35)/ `CCN_WARN_FLOOR`=11(:36)/ `parseLizardCsv`(:128)/ `evaluateComplexity`(:241)。env seam `AMADEUS_COMPLEXITY_*`(:54-66)。lizard(`python3 -m lizard`)spawn 前提。

カバレッジ% / テスト数 seam(`tests/run-tests.ts` + `tests/lib/coverage-normalize.ts`):
- カバレッジ機械可読出力 = `coverage/coverage-totals.json` {schemaVersion,hits,lines}(`writeCoverageTotalsJson` :610)。`collectCoverageTotals`(:538、非 export、内部)/ `combineCoverageReports`(:618)/ `normalizeCoverageReport`(coverage-normalize.ts :273、export)/ `computeStrippableLines`(:79、export)。
- テスト数 = `printSummary`(:899)が `Test files:`(:903)/`Total assertions:`(:905)を **stdout print のみ**(機械可読 seam 無し)。カウンタ totalFiles/totalTests(:398-401)は非 export、.meta 集計。

CI 接続面(`.github/workflows/`):
- ci.yml: push main + pull_request(:7-11)、`permissions: contents:read`(:23-24)、main は SHA キー concurrency(:12-21)、coverage job のみ id-token:write(:81)。
- release.yml: `permissions: contents:write`(:48)、release-it が bot コミットを main へ直 push(:97-114)、GITHUB_TOKEN push は他 workflow 非トリガー(:15-16)、concurrency `release-setup` cancel-in-progress:false(:43-45)。

配置規約 / dist 同期(C2)スコープ(`scripts/package.ts`):
- dist コピー源は `CORE_ROOT=packages/framework/core`(:57)+ `HARNESS_ROOT=packages/framework/harness`(:58)のみ。**`scripts/` と `tests/` は dist 非コピー** → snapshot ツールをそこに置けば C2 対象外。
- `metrics/` 相当ディレクトリ不在。`.gitignore` は `coverage/`(:30)を無視 → snapshot 出力先を coverage/ 配下にすると非コミット。metrics 関連無視エントリ無し。

## diff 実測(base→observed、フォーカス面)

| ファイル | 区間内変更 |
|---|---|
| `tests/complexity-gate.ts` | なし |
| `tests/run-tests.ts` | なし |
| `tests/lib/coverage-normalize.ts` | M(+72/-9、#876 closing-only strip)。**export シグネチャは base と byte 同一** |
| `.github/workflows/ci.yml` | なし |
| `.github/workflows/release.yml` | なし |
| `scripts/package.ts` | なし |

区間 56 コミットの大半は本 intent の ideation チェックポイント + ノルム PR(#917-#920)。snapshot 再利用面の export は全て不変。

## 前提の成立可否

ideation feasibility 前提は全て observed HEAD で成立: CCN 分布 in-process 取得可(runLizard export)、カバレッジ% 機械可読出力あり(coverage-totals.json、ただし coverage/ は gitignore)、テスト数は stdout/.meta 集計が必要(機械可読 seam 不在=既知ギャップ、functional-design へ持ち越し)、snapshot ツールを scripts/tests 配置で C2 対象外、commit push は contents:write 要+GITHUB_TOKEN 非トリガー前例あり。

## 温存判断(churn 回避)

business-overview / api-documentation / code-structure / component-inventory / dependencies / technology-stack / architecture / code-quality-assessment は base→observed で本 intent 観測面と無関係のため温存。
