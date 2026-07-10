# Code Summary — u734-coverage-project-gate

> 実装: cg-builder(amadeus-developer-agent、bolt worktree `bolt-coverage-project-gate`)。検分・検証裏取り: conductor。
> ブランチ: `bolt-coverage-project-gate`(origin/main 6f1d7ab2a 起点)、4コミット、working tree クリーン。

## 変更ファイル(8ファイル、+605/−15)

| ファイル | 種別 | 内容 |
|---|---|---|
| `tests/run-tests.ts` | 変更 | `collectCoverageTotals(lcov)` 抽出(単一パース)、`writeCoverageHtml` は抽出結果を消費(HTML バイト等価)、`writeCoverageTotalsJson` が `coverage/coverage-totals.json` を emit |
| `tests/coverage-project-gate.ts` | 新規 | `evaluateGate` export 純関数(判別ユニオン)、BigInt 厳密判定、parse-don't-validate、`--check`/`--update`、env 注入シーム(`AMADEUS_COVERAGE_TOTALS`/`AMADEUS_COVERAGE_PROJECT_BASELINE`) |
| `tests/.coverage-project-baseline.json` | 新規 | 実測ベースライン `{schemaVersion:1, hits:7096, lines:17519}`(40.5046%、`coverage:ci` 実行→`--update` 転写。手書きなし) |
| `tests/unit/coverage-project-gate.test.ts` | 新規 | 20テスト: 境界両側(ちょうど−0.02pp=緑/1ヒット超過=赤)、MALFORMED 4種+不正JSON、EMPTY_POPULATION 両側、MISSING 両種、プロセス境界の落ちる実証4ケース+usage、`--update` 拒否/転写 |
| `.github/workflows/ci.yml` | 変更 | coverage ジョブ「Generate coverage reports」直後・upload 前に `Project coverage gate` ステップ(+3行のみ) |
| `codecov.yml` | 変更 | `coverage.status.project` ブロックのみ削除(−6行)。patch/ignore/fixes バイト等価 |
| `docs/reference/09-testing.md` | 変更 | 新節「Project Coverage Gate」(EN、FR-7 の5点網羅) |
| `docs/reference/09-testing.ja.md` | 変更 | 同節の日本語版 |

## 主要な実装判断

- 判定と表示の分離: pass/fail は BigInt 整数式のみで確定し、%・delta は表示専用導出(NFR-2)。
- `LoadedTotals`(present/text)を evaluateGate の入力にし、ファイル読みと判定を分離 — 判定の単一情報源を関数内に保ち、テストが I/O なしで全分岐に到達できる。
- registry 再生成は no-op(新規ファイルは enumerated unit を追加しないため)。`--check` green を実測確認。

## 検証(conductor 再実行の実測 exit code)

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun tests/gen-coverage-registry.ts --check` | 0 |
| `bun test tests/unit/coverage-project-gate.test.ts` | 0(20 pass / 0 fail) |
| `bun tests/coverage-project-gate.ts --check` | 0(current=baseline、delta 0.0000pp) |
| `bash tests/run-tests.sh --ci` | 0(**RESULT: PASS、Failed assertions: 0**) |

補記: フルスイート初回実行で 4046 中 1 assertion FAIL を観測したが、builder と conductor のスイートが同一 worktree で並走していたことが原因の flake(builder 単独実行=PASS、conductor 単独再実行=PASS の両実測で確認)。

## プランからの逸脱

1. **worktree ベース是正**: `amadeus-worktree create --base main` が stale なローカル main(611dd1ef8)から fork していたため、builder が worktree 内で `git reset --hard 6f1d7ab2a`(origin/main)へ是正してから実装(org.md「Bolt ベースは main」の意図に整合)。ツール側の silent fork は **#760** として起票済み(bug/P2、e1+e5 レビュー割当済み)。
2. その他の逸脱なし(全8ステップ完了、チェックボックス消込済み)。

## 落ちる実証(NFR-1)の所在

- プロセス境界: `tests/unit/coverage-project-gate.test.ts` の「process boundary: --check」describe — 低下注入/emit 欠落/baseline 欠落で exit 1、閾値内で exit 0 を `spawnSync` 実測。
- builder 追加の手動実証: baseline 7096/17519 に対し current 7000/17519 注入 → DROP_EXCEEDED exit 1(値はファイル由来)。

## Review

**Verdict: READY**

Reviewer: amadeus-architecture-reviewer-agent, date 2026-07-10, iteration 1

実装ワークツリー(`bolt-coverage-project-gate`、`6f1d7ab2a..HEAD`、8ファイル +605/−15)を design/plan/business-rules と突き合わせ、コードを直接検分した。設計忠実性・落ちる実証・検証劇場の不在・スコープの外科的正確さのいずれについても blocker/major は見つからなかった。

1. **[minor] `passesThreshold` の代数的検証は narrative comment のみ** (`tests/coverage-project-gate.ts:114-121`) — `10000·ch·bl − 10000·bh·cl >= −2·cl·bl` が `current% >= base% − 0.02pp` の cleared-of-division 形と一致することはコメントで主張されているが、テストは境界の**具体的な数値ケース**(9998/10000 vs 10000/10000 など)でしか検証していない。異なる分母同士(例: current lines ≠ baseline lines かつ両者が大きく異なる値)での境界一致を確認するテストケースが1つ追加されるとより頑健。今回投入された数値例は正しく、式自体を独立に検算しても一致するため blocker ではない。
2. **[minor] `EMPTY_POPULATION` の到達可能性が実質ゼロ** (`tests/coverage-project-gate.ts:142-147`) — `hits > lines` を先に拒否する MALFORMED チェックがあるため、`lines === 0` に到達するには `hits === 0` も必要(R5 通り正しい)。テスト(`totals(0, 0)`)はこの唯一到達可能な組み合わせを的確に突いており、実装・テストとも要件どおり。指摘は将来の保守者向けの理解補助のみで是正不要。
3. 確認事項(findings ではなく確認): `tests/run-tests.ts` の `collectCoverageTotals` 抽出により HTML 出力は入力と同一の `rows`/`totalHits`/`totalLines` を消費しており、パースロジック自体の変更はゼロ(構造の抽出のみ)。`codecov.yml` は `coverage.status.project` ブロックの削除のみで `patch`/`ignore`/`fixes` はバイト単位で不変。`.github/workflows/ci.yml` の新規ステップは「Generate coverage reports」直後・upload 前に挿入されており、design/plan の配線指示と一致。

**設計忠実性**: R1〜R18(business-rules.md)を1件ずつ突き合わせ、逸脱なし。等号 −0.02pp は合格側(R1)、欠落は MISSING_CURRENT/MISSING_BASELINE として赤(R3)、破損は MALFORMED(R4)、空母集団は EMPTY_POPULATION(R5)、`--update` は emit 不在時に拒否・転写元は実測値のみ(R10/R13)。BigInt 厳密比較(NFR-2)は浮動小数点を一切使わず実装されている。

**落ちる実証(team.md Mandated)**: `bun test tests/unit/coverage-project-gate.test.ts` を実行し `20 pass / 0 fail`(exit 0)を確認。`describe("process boundary: --check ...")` の4ケース(注入低下・totals欠落・baseline欠落・閾値内)は `spawnSync` によるプロセス境界の実 exit code 実証であり、in-process の `evaluateGate` テストと二層構成になっている(R17 準拠)。ベースライン `tests/.coverage-project-baseline.json` の `hits: 7096, lines: 17519` は `bun tests/coverage-project-gate.ts --check` を実行して `current 40.5046%, baseline 40.5046%, delta 0.0000pp` の実測一致を確認しており、手書きの丸め値ではない。

**検証劇場の不在**: 判定はすべて実測ファイル由来の BigInt 演算(R6)。ハードコードされた verdict・自己参照比較・どのコードも消費しないフィールドは見当たらない。

**後方互換シム・投機的柔軟性**: なし。env シーム(`AMADEUS_COVERAGE_TOTALS`/`AMADEUS_COVERAGE_PROJECT_BASELINE`)は既存の `AMADEUS_COVERAGE_RATCHET` と同型の承認済みテストシームであり、本番分岐ではない。

**スコープの外科的正確さ**: diff は該当8ファイルに限定。`tests/run-tests.ts` の変更は抽出のみで HTML ロジックは不変。無関係な整形・リファクタは見当たらない。

**ドキュメント**: EN(`docs/reference/09-testing.md`)・JA(`docs/reference/09-testing.ja.md`)ともに母集団定義・Codecov UI との意図的乖離・0.02pp 判定式・ベースライン更新手順・引き下げのユーザー承認要件の5点を網羅し、内容は忠実に対応。コードコメントは英語、markdown は言語ルールに準拠。

**再実行した検証コマンド(実測 exit code)**:
- `bun test tests/unit/coverage-project-gate.test.ts` → exit 0(20 pass / 0 fail)
- `bun run typecheck` → exit 0
- `bun run lint` → exit 0(414ファイル検査、警告は本diff対象外の既存ファイル `packages/setup/src/cli.ts`・`tests/e2e/t07-audit-fork-merge.test.ts` 等の未使用importのみ)
- `bun tests/gen-coverage-registry.ts --check` → exit 0(fresh, guards green, ratchet held)
- `bun tests/coverage-project-gate.ts --check` → exit 0(current 40.5046%, baseline 40.5046%, delta 0.0000pp)
