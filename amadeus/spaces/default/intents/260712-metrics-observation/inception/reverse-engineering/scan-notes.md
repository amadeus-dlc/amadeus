# RE スキャン記録(Developer スキャン) — 260712-metrics-observation

intent 目的: 既存の計測経路(CCN 分布・テスト数・カバレッジ%)の出力を、リポジトリコミットの snapshot として保存する観測機構(Issue #921)。本スキャンは差分リフレッシュ(cid:reverse-engineering:c1)で、snapshot が再利用する既存 seam と接続面(CI 権限・配置規約)を確定する。

## 実行メタデータ

- **base**: `13598b752b656cc9bbf5d931f8e3a6c34881fd1c`(前 intent 260711-docs-repair-batch9 の observed。全 re-scan observed 候補の HEAD 祖先性を判定し、**HEAD の祖先である observed のうち距離最小=56 を採用**。E-L63 明文則)
- **observed**: `c11554226542faabd2a6c694650ea26323745ed8`(`git rev-parse HEAD` 実測。branch intent/921-metrics-observation)
- **base..observed コミット数**: 56(`git rev-list --count`)
- **手法**: diff-refresh。フォーカス面は observed HEAD の実コード直読で file:line を確定し、base→observed diff で ideation の feasibility 前提の現存を検証。

## base 決定の実測根拠(E-L63)

`re-scans/*.md` の全 observed SHA について `git merge-base --is-ancestor <sha> HEAD` + `git rev-list --count <sha>..HEAD` で判定:

| observed 候補 | 出所 re-scan | HEAD 祖先? | HEAD までの距離 |
|---|---|---|---|
| `13598b752b…` | 260711-docs-repair-batch9 | YES | **56(最小=採用)** |
| `60f5e1edf…` | 260711-p3-cleanup-batch8 | YES | 58 |
| `37ad36a97f…` | 260711-p2-repair-batch7 / p3-repair-batch6 | YES | 69 |
| `b845478bb…` | 260710-bughunt-fix-batch | YES | 115 |
| `fc5a34cf19…` | 260710-mint-presence-vectors | YES | 156 |
| `5e9040cdab…` | 260710-delegate-answer-consume | YES | 238 |
| `e1a07fada3…` | 260710-kiro-stale-hooks | YES | 246 |
| `24197d755a…` | 260709-dynamic-test-size | YES | 296 |
| `98089faf17…` | 260710-codecov-project-gate | YES | 459 |
| `9a2f5c7205…` | 260709-pbt-small-band | YES | 469 |
| `11c52f153f…` | 260710-swarm-worktree-batch | **NO**(squash 別 SHA) | — 除外 |
| `d6375bba68…` | 260711-docs-batch10 | **NO**(squash 別 SHA) | — 除外 |

非祖先 2 件(swarm-worktree-batch / docs-batch10)は squash マージで現 HEAD の祖先でないため base 候補から除外(rescan-base-ancestry)。

## フォーカス面 file:line 台帳(observed HEAD 直読)

### A. CCN 計測 seam — `tests/complexity-gate.ts`(snapshot が CCN 分布を取る経路)

全て **export 済み**(in-process import で分布計測が可能。spawn 不要):

- `MEASUREMENT_ROOTS`(:43)= `["packages/framework/core", "packages/setup/src", "scripts"]` — 計測対象面。**export const**。
- `CCN_BLOCK_THRESHOLD`(:35)=15、`CCN_WARN_FLOOR`(:36)=11 — **export const**。
- `runLizard(): MeasurementOutcome`(:151、**export**)— `spawnSync(["python3","-m","lizard", ...roots, "-l","typescript","--csv"])`(:154)。返り値 `{ kind:"ok"; records: KeyedFunctionRecord[] }`(:98)。**これが CCN 生データ(path/name/ccn/ordinal)の唯一の入口。** snapshot は本関数を import して records 配列から分布(件数・最大 CCN・warn band 数・閾値超過数)を導出できる。
- `parseLizardCsv(csv, repoRoot): FunctionRecord[]`(:128、**export**)/ `assignOrdinals()`(:141、**export**)— CSV 正規化 seam(lizard を直接叩いて自前パースする場合の再利用点)。
- `evaluateComplexity(measured, baseline): ComplexityVerdict`(:241、**export**、純関数)/ `baselineMapOf(doc)`(:268、**export**)/ `renderBaseline(records)`(:223、**export**)。
- baseline 構造: `BaselineDoc = { schemaVersion:1; threshold:number; entries: BaselineEntry[] }`(:88)。committed baseline は `tests/.complexity-baseline.json`(:60、閾値超過関数のみ列挙 :225)。
- env seam(:54-66、CALL 時解決): `AMADEUS_COMPLEXITY_ROOTS` / `AMADEUS_COMPLEXITY_BASELINE` / `AMADEUS_COMPLEXITY_LIZARD_CMD` — in-process テストで計測対象を差し替え可能。
- **注意**: `runLizard` は `python3 -m lizard` を spawn する(CI は `pip install lizard==1.23.0` を前提、ci.yml :49-50)。snapshot が CCN 分布を取るには lizard の実在が前提。

### B. カバレッジ% / テスト数 seam — `tests/run-tests.ts` + `tests/lib/coverage-normalize.ts`

- **テスト数(SUMMARY)**: `printSummary()`(:899)が `Test files: ${totalFiles}`(:903)、`Total assertions: ${totalTests}`(:905)、`Failed files`(:904)/`Failed assertions`(:906)を **stdout へ print するのみ**(構造化 JSON 出力なし)。カウンタ `totalFiles/failedFiles/totalTests/totalFailed`(:398-401、モジュールスコープ変数、**非 export**)は per-file `.meta`(`PASS/FAIL`,`TESTS`,`FAILED`,:434/:458)集計。**テスト数の機械可読 seam は現状なし** — snapshot はランナー stdout の `Test files:` / `Total assertions:` 行をパースするか、`.meta` を集計する必要がある(この seam 化は本 intent の設計判断)。
- **カバレッジ%**: `writeCoverageTotalsJson()`(:610)が `coverage/coverage-totals.json` = `{ schemaVersion:1, hits, lines }`(:613)を emit。**これが機械可読なカバレッジ入力**(project coverage gate `tests/coverage-project-gate.ts` が消費)。%は hits/lines から導出(gate 側が整数演算、:608 コメント)。ただし出力先 `coverage/` は **.gitignore 済み**(下記 D)。
- `collectCoverageTotals(lcov): CoverageTotals`(:538、**非 export**、run-tests.ts 内部)— lcov から `{rows, totalHits, totalLines}` を単一パースで導出。HTML と totals.json の共有源(:536 コメント)。snapshot がカバレッジ%を取るならこの関数相当(SF/LF/LH 集計)を lcov から再導出するか、`coverage-totals.json` を読む。
- `combineCoverageReports()`(:618)— per-test lcov チャンクを union→正規化→`coverage/lcov.info` 書き出し(:634)、`--coverage` 指定時のみ(:619)。
- lib seam(**export 済み・in-process 可**): `normalizeCoverageReport(body, context, repoRoot, options)`(coverage-normalize.ts :273、**export**)/ `computeStrippableLines(sourceText)`(:79、**export**)。base→observed で本ファイルは +72/-9 変更(#876 closing-only strip 追加)だが **export シグネチャは base と同一**(下記 diff)。

### C. CI 権限・トリガー・並行制御 — `.github/workflows/`

snapshot 用 workflow が踏襲すべき前例:

- `ci.yml`: トリガー `push: branches:[main]` + `pull_request`(:7-11)。`permissions: contents: read`(:23-24)。concurrency は **main は SHA キー**でキャンセル無効化、PR は ref キーで supersede(:12-21)。coverage job のみ `id-token: write`(:81、Codecov OIDC)。→ **read 権限では commit push 不可**。snapshot をコミットへ書く workflow は `contents: write` が必要。
- `release.yml`: `permissions: contents: write`(:48、release-it が bump commit + tag を **main へ直 push**)。concurrency `group: release-setup, cancel-in-progress: false`(:43-45)。トリガー `push: tags:['v*']` + `workflow_dispatch`(:28-31)。**push 手順の前例**: release-it(:97-114)が `git config user.name github-actions[bot]`(:101)で bot コミットを main へ push。GITHUB_TOKEN の push は他 workflow をトリガーしない(:15-16 コメント — snapshot workflow がコミットを push しても CI ループを起こさない設計前例)。

### D. 配置規約と dist 同期(C2)スコープ — `scripts/package.ts`

- dist へコピーされる source は `CORE_ROOT = packages/framework/core`(:57)と `HARNESS_ROOT = packages/framework/harness`(:58)配下のみ。`walk()`(:147)の呼び出し源は全て `join(CORE_ROOT, ...)` / manifest src(CORE/HARNESS 配下)(:237/:257/:339)。
- **`scripts/` と `tests/` は dist へ一切コピーされない** → snapshot ツールを `scripts/` または `tests/` に置けば **dist:check / promote:self:check(C2)の対象外**(dist 再生成義務なし)。逆に snapshot ロジックを `core/` に置くと C2 対象になる。
- 既存配置: `scripts/`(package.ts, promote-self.ts, release-version-sync.ts 等)/ `tests/`(complexity-gate.ts, run-tests.ts, lib/)。snapshot ツールは兄弟 CLI 様式(complexity-gate.ts / coverage-project-gate.ts の `main(args): number` + `import.meta.main` パターン、complexity-gate.ts :372/:384)に揃えるのが既習。
- `metrics/` 相当ディレクトリは **不在**(`ls metrics` → NO metrics/ dir)。snapshot の出力先は新規ディレクトリを作る設計判断。
- `.gitignore`: `coverage/`(:30)を無視 → **snapshot の出力先を `coverage/` 配下にすると commit されない**(要注意)。`amadeus/spaces/*/intents/*/runtime-graph.json`(:54)も無視。metrics/snapshot 関連の無視エントリは無し。

## diff 実測(base 13598b752b… → observed c11554226…)

| ファイル | 区間内変更 | 備考 |
|---|---|---|
| `tests/complexity-gate.ts` | **なし** | CCN seam は base と同一 |
| `tests/run-tests.ts` | **なし** | SUMMARY / coverage-totals seam は base と同一 |
| `tests/lib/coverage-normalize.ts` | **M(+72/-9)** | #876 closing-only strip 追加。**export シグネチャ(computeStrippableLines / NormalizeCoverageOptions / normalizeCoverageReport)は base と byte 同一**(`diff` で確認済み) |
| `.github/workflows/ci.yml` | **なし** | 権限 contents:read / concurrency は base と同一 |
| `.github/workflows/release.yml` | **なし** | contents:write / push 前例は base と同一 |
| `scripts/package.ts` | **なし** | dist コピー源は CORE/HARNESS のみ、base と同一 |

区間 56 コミットの内訳: 大半は本 intent 自身の ideation チェックポイント(intent-capture〜approval-handoff)+ ノルム PR(#917-#920)。フォーカス面のコード実体に触れたのは coverage-normalize.ts のみ(snapshot 再利用面の export は不変)。

## ideation 前提の再確認(feasibility 実測群の現存)

- **CCN 分布は既存経路から in-process 取得可能** → 成立(`runLizard`/records が export、observed HEAD で不変)。
- **カバレッジ% は既存の機械可読出力から取得可能** → 成立(`coverage/coverage-totals.json` = {hits,lines}、`writeCoverageTotalsJson` 不変)。ただし出力先 `coverage/` は gitignore 済み。
- **テスト数は構造化出力が無く stdout/.meta 集計が必要** → 成立(前提どおり seam 化は設計判断。`printSummary` の print は不変)。
- **snapshot ツールを scripts/tests に置けば C2 対象外** → 成立(package.ts コピー源不変)。
- **コミット push の CI ループ回避前例あり**(GITHUB_TOKEN push は非トリガー、release.yml)、**commit 書き込みには contents:write が必要**(ci.yml は read) → 成立、現状不変。

**結論**: ideation の feasibility 前提は全て現 observed HEAD で成立。snapshot 再利用面(CCN/カバレッジ seam)の export・CI 権限前例・配置規約に base からの逸脱なし。テスト数の機械可読 seam 不在のみ後続ステージ(functional-design)で解決すべき既知ギャップとして持ち越す。
