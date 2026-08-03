# Business Rules — unit `pbt-deep-ci` (#1980)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: **worktree HEAD `c8702be09d74daa8091d99d3eae48987b9fd7527`**(`.github/workflows/` と `tests/fixtures/formal-verif-ci-baseline.sha256` は application-design の測定 ref `5a6f79727` から差分ゼロ)。

本書のルールは、requirements.md FR-5a / FR-5b と NFR-5、decisions.md ADR-3、services.md S2 のジョブ契約表を **テスト可能な形へ落としたもの**である。unit-of-work.md「pbt-deep-ci は services.md S2 のジョブ契約(workflow_dispatch 限定・`ci-success` needs 非参加・loud fail・timeout-minutes 明記)に従う」がその写像の指示である。

---

## ルール表

| ID | ルール | 検証方法(テスト可能な形) | 由来 |
| --- | --- | --- | --- |
| **BR-PDC-1** | `.github/workflows/ci.yml` の `jobs` に **`pbt-deep`** が存在し、`if: github.event_name == 'workflow_dispatch'` を持つ | ci.yml を YAML parse し、`jobs["pbt-deep"].if === "github.event_name == 'workflow_dispatch'"` を assert。文字列を verbatim 一致で比較する(`!=` 形への書き換えを検出するため) | FR-5a / ADR-3 Decision / services.md S2 ジョブ契約表「トリガ」 |
| **BR-PDC-2** | ci.yml の `on:` は変更しない — `workflow_dispatch` トリガ定義を追加しない | `git diff` の ci.yml `on:` ブロックが無変更であること。`ci.yml:8` に `  workflow_dispatch: {}` が既存(HEAD 実測) | ADR-3 Rationale 2「トリガ定義の追加が不要」 |
| **BR-PDC-3** | `jobs["ci-success"].needs` は **8 要素のまま**(`changes` / `typecheck` / `lint` / `distribution-contract` / `plugin-conformance-e2e` / `tests` / `drift-check` / `coverage`)であり、`pbt-deep` を含まない | 既存テストが assert 済み: `tests/integration/t222-ci-snapshot-branch.integration.test.ts:107` `const ciSuccessNeeds = jobs["ci-success"]?.needs;` に続く集合比較、`tests/unit/t222-ci-snapshot-wiring.test.ts:121` `test("ci-success remains independent from both publishers", …)`。**新規テストは書かず、既存の緑を維持することで満たす** | FR-5b / NFR-5 / ADR-3 Rationale 3 |
| **BR-PDC-4** | `pbt-deep` は独立 workflow ファイルとして作られない — `.github/workflows/` のファイル数は **4 のまま**(`ci.yml` / `metrics-maintenance.yml` / `perf.yml` / `release.yml`) | `ls .github/workflows/ \| wc -l` が 4(HEAD 実測値と同値)。新規 `.yml` を追加しない | ADR-3 Decision(独立 workflow は新設しない)/ `cid:ci-pipeline:c2` |
| **BR-PDC-5** | 深掘り実行の**前**に、対象 PBT パス集合の全数実在を検査し、1件でも不在ならジョブを exit 非 0 で止める | ジョブ内の実在検査ステップ。ローカル再現: 対象列の1件を存在しないパスに差し替えて実行し、`bun test` に到達せず赤になることを実測 | `cid:build-and-test:test-path-set-completeness`(Bun は不存在 path を無音で除外したまま exit 0 になり得る)/ INV-5 |
| **BR-PDC-6** | 深掘り実行の**後**に、bun の `Ran <N> tests across <M> files` の **M を期待ファイル数と照合**し、不一致ならジョブを exit 非 0 で止める | ログから M を抽出して比較するステップ。ローカル再現: 期待数を意図的にずらして赤を実測(落ちる実証) | 同上。BR-PDC-5 は「起動前の不在」、BR-PDC-6 は「起動後の実行漏れ」を見る別の面 |
| **BR-PDC-7** | 実行ステップは `AMADEUS_PBT_DEEP=1` を env に持ち、`set -o pipefail` を先頭に置き、`2>&1 \| tee <log>` で出力を保存する | ジョブ定義の実文検査。`set -o pipefail` 欠落時に `bun test` の失敗が exit 0 に化けることをローカルで実証(`false \| tee /dev/null; echo $?` = 0 の対照) | services.md S2「実行コマンド」「失敗の扱い = loud fail」/ `cid:code-generation:no-exit-capture-through-pipe` |
| **BR-PDC-8** | `timeout-minutes` を明示し、**その値の算出根拠をジョブ直上のコメントに書く**。根拠は対象ファイル集合を `AMADEUS_PBT_DEEP=1` で実走させた wall clock の実測値であり、`perf.yml` と同じ「2x the expected wall clock」の様式で導く | ジョブ定義に `timeout-minutes` が存在し、直上コメントに実測値と算出式があること。`.github/workflows/perf.yml:39-42` 実文(`    # 2x the expected wall clock: per-test caps 250s + 180s + 120s, plus the` / `    # remaining perf tests (~60s) and checkout/bun install setup (~120s) is` / `    # about 12.2 min; 2 x 12.2 = 24.4, rounded up to 25.` / `    timeout-minutes: 25`)が様式の canonical | services.md S2「タイムアウト」/ `cid:nfr-requirements:derived-value-shows-formula`(派生値は算出式を併記)/ `cid:requirements-analysis:numbers-from-command-output-only` |
| **BR-PDC-9** | `continue-on-error` と `\|\| true` を**書かない**(実行ステップ・実在検査ステップ・照合ステップのいずれにも) | ジョブ定義の grep で 0 件。`formal-model-check` は `continue-on-error: true` を持つ(`ci.yml:513` 近傍の各ステップ)が、あれは**証跡アーティファクトを必ず上げるための構造**であり、本 unit は採らない(下記「引用元との意図的相違」) | services.md S2「失敗の扱い」/ `.github/workflows/perf.yml:6-11` の loud-fail 契約 |
| **BR-PDC-10** | 失敗時サマリのステップは `if: ${{ failure() && steps.<実行ステップ id>.conclusion == 'failure' }}` で**実行ステップに限定**する。素の `failure()` は使わない | ジョブ定義の実文検査。`.github/workflows/perf.yml:74-77` と同形 | perf.yml `:75-76` 実文が理由を明記(`# Scope the summary to the test step itself: a bare failure() also` / `# fires on checkout/setup/install failures and would mislabel them.`) |
| **BR-PDC-11** | 失敗時サマリはログ末尾を `$GITHUB_STEP_SUMMARY` へ追記する。fast-check の出力(seed / replay path / 縮小反例)を**加工・抽出しない** | サマリ生成が `tail -n <N> <log>` の素通しであること。seed 抽出用の正規表現を書かない | FR-5a「失敗 seed をジョブログへ可視化」/ services.md S2「fast-check の既定出力…を素通しする」/ `tests/unit/t204-audit-escape.pbt.test.ts:21-22` 実文(`// 2. FAILURE OUTPUT. On failure fast-check prints the seed, replay path, and` / `//    the SHRUNK counterexample — enough to reproduce with no extra wiring.`) |
| **BR-PDC-12** | `AMADEUS_PBT_DEEP` の判定式・深掘り予算値(`numRuns: 50_000`)・seed 定数を**本 unit は変更しない** | `git diff` に `tests/unit/*.pbt.test.ts` の判定行が含まれないこと。判定の正本は `tests/unit/t204-audit-escape.pbt.test.ts:39` `const DEEP = process.env.AMADEUS_PBT_DEEP === "1" \|\| process.env.AMADEUS_PBT_DEEP === "true";`、予算は `:41` `const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };` | FR-4c(既存規約準拠、t204:16-28 が canonical)/ components.md 再利用棚卸し `:97` |
| **BR-PDC-13** | 実行対象は**本 intent が新設した PBT ファイル群に限る**。`--release` tier 全体や `tests/` 全体を深掘りで走らせない | 実行コマンドの引数が明示列挙であること。列挙集合は依存 unit(election-readpath / state-pbt)の着地物と1対1 | services.md S2「実行コマンド = `AMADEUS_PBT_DEEP=1 bun test <新規 PBT ファイル群>`(対象を新規 PBT に限定し、深掘りの実行時間を有界に保つ)」 |
| **BR-PDC-14** | ci.yml 編集後、`tests/fixtures/formal-verif-ci-baseline.sha256` を **cast-guard 着地後の ci.yml** から採り直す。値は `sha256(normalizedCiBaseline(ci.yml))` で、fixture の行形式は既存どおり `<64桁 hex><空白2><.github/workflows/ci.yml>` | `bun test tests/integration/t-formal-verif-ci-workflow.integration.test.ts` が緑。再 baseline 前は `changes outside the three permitted U4 edits` で赤になること(=編集がピンに実際に検出されること)を先に実測してから採り直す | ADR-3 Consequences「負(実装段の必須手順)」/ services.md「ci.yml 編集に伴う既知コスト」/ INV-4 |
| **BR-PDC-15** | `tests/integration/t-formal-verif-ci-workflow.integration.test.ts` のヘッダ「Recorded re-baselines」へ本 intent 分を追記する。書式は既存3件と同じ「`//   - <intent slug>(#<issue>): <何を追加したか><なぜそこか>`」 | 同ファイルヘッダに本 intent のエントリが1件存在すること。既存3件は `260725-mirror-review-fixes` / `260729-otel-upstream U7` / `260729-otel-upstream U8` / `260801-open-bug-batch-5 (#1863)`(実読: `:18-32` — エントリ行は `:18` / `:19-22` / `:23-27` / `:28-32`。**先行例は「3件」と記録されているが、実ファイルのエントリは 260729-otel-upstream が U7 と U8 の2エントリに分かれているため物理エントリ数は 4** — §「件数の実測訂正」参照) | ADR-3 Consequences / services.md「同テストヘッダの『Recorded re-baselines』へ本 intent 分を追記する」 |
| **BR-PDC-16** | `pbt-deep` が使う `actions/checkout` と `oven-sh/setup-bun` は**コミット SHA ピン**で参照し、SHA は同ファイル内 `formal-model-check` の値と逐語一致させる(`actions/checkout@11d5960a326750d5838078e36cf38b85af677262` / `oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6`、`bun-version: 1.3.13`) | ジョブ定義の実文が上記と一致。**この pin は既存テストでは強制されない**(`tests/formal-verif/support/ci-workflow-contract.ts` の pin 検査は `formal-model-check` ジョブ限定 — `inspectFormalSteps` が `stepById(formal, …)` で formal ジョブのステップのみを見る)ため、レビュー観点として明示する | ADR-3 Security/Compliance 影響「actions は既存ジョブと同じくコミット SHA ピンで参照する」 |
| **BR-PDC-17** | `pbt-deep` は `permissions: contents: read` を宣言し、secrets を要求せず、`bun install --frozen-lockfile` 以外の外部ネットワークアクセスを持たない | ジョブ定義の実文検査。`ci.yml:514-515` の `formal-model-check` が同形(`    permissions:` / `      contents: read`) | ADR-3 Security/Compliance 影響 |
| **BR-PDC-18** | `pbt-deep` は `needs:` を持たない(`changes` に依存しない) | ジョブ定義に `needs` が無いこと。`formal-model-check`(`ci.yml:509-513`)も `needs` を持たない — `changes` の出力は push/PR の差分判定であり、手動起動の深掘りには意味を持たない | ADR-3 の先例準拠(`formal-model-check` と同形)/ INV-1 |
| **BR-PDC-19** | ジョブ本体はブロックマーカーで囲む(`  # <unit> pbt-deep begin` / `  # <unit> pbt-deep end`)。マーカーは `normalizedCiBaseline` の strip 対象**ではない**ため、baseline に含まれる | ci.yml 実文にマーカー2行が存在。既存慣習: `ci.yml:508` `  # U4 formal-model-check begin` / `:610` `  # U4 formal-model-check end`。**重要**: `normalizedCiBaseline`(`tests/formal-verif/support/ci-workflow-contract.ts:38-46`)が strip するのは `/\n {2}# U4 formal-model-check begin\n[\s\S]*?\n {2}# U4 formal-model-check end\n/` という **U4 固有の正規表現**であり、本 unit のマーカーには一致しない。したがって本 unit のジョブは baseline に含まれ、BR-PDC-14 の再 baseline が必須になる | ADR-3 Consequences「負」(ci.yml が長くなる/ブロックマーカーの慣習)/ 実読による機序確認 |

## 適用外(この unit が**しない**こと)

| 事項 | しない理由 | 由来 |
| --- | --- | --- |
| `schedule` トリガの追加 | FR-5a が明示的に Out。ADR-3 Alternatives Rejected B が「相乗りすると FR-5a が Out としている schedule 化が事実上成立してしまう」と退けている | FR-5a / ADR-3 |
| `tests/run-tests.ts` への深掘り tier 追加 | services.md S2 が実行コマンドを `bun test <新規 PBT ファイル群>` と指定。ランナーへの tier 追加は components.md U5 の所在(ci.yml + fixture)を超える | services.md S2 / components.md U5 |
| プロパティ(P-EL / P-ST)の新設・変更 | プロパティの所有は component-methods.md の U2 / U3。本 unit に U5 節が無いことがその反映 | component-methods.md |
| `ci-success` の needs 変更 | BR-PDC-3。既存 t222 系のピンを触らないことが FR-5b/NFR-5 の充足経路 | ADR-3 Rationale 3 |
| `perf.yml` への相乗り | ADR-3 Alternatives Rejected B(schedule 混入・責務乖離・tier 区分の濁り) | ADR-3 |

## 引用元との意図的相違(`cid:application-design:citation-semantics-check`)

引用元は同一ファイル内の `formal-model-check`(`.github/workflows/ci.yml:508-610`)である。配置様式(`workflow_dispatch` 限定の `if:`、`ci-success` needs 非参加、`permissions: contents: read`、action の SHA ピン、ブロックマーカー)はそのまま継承する。**エラー分岐方針だけが意図的に相違する**:

引用元の各ステップは `continue-on-error: true` を持つ(`ci.yml:517-520` の `formal-checkout`(`:519` `        continue-on-error: true`)、`:522-528` の `formal-setup-bun`(`:525`)、`:530-533` の `formal-acceptance`(`:533`)等)。これは「どのステップが落ちても最後まで進み、証跡 JSON を必ずアーティファクトへ上げてから、終端ステップで exit code を決める」という**証跡優先の設計**であり、`ci-workflow-contract.ts` の `inspectFormalSteps` がその形(`upload.if === "always()"` / `upload["continue-on-error"] === true`)をピンしている。

本 unit はこの方針を**採らない**。理由:

1. 本ジョブの証跡は**ジョブログそのもの**(fast-check の既定出力)であり、アップロードすべき成果物ファイルが無い。`continue-on-error` で先へ進む必要が無い。
2. services.md S2 のジョブ契約表が失敗の扱いを loud fail と定め、根拠として `.github/workflows/perf.yml:6-11` を引く。同契約は `continue-on-error` を明示的に禁じている(実文 ``# Silencing a failure (continue-on-error, `|| true`) is`` / `# not an acceptable way to keep this workflow green.`)。**引用元の証跡優先方針をそのまま写すと、この契約と正面から矛盾する。**
3. したがって本 unit は「配置様式は `formal-model-check` から、失敗方針は `perf.yml` から」という**2つの引用元の合成**になる。この相違は自要件(FR-5a の seed 可視化 = ログで足りる/ FR-5b の非ブロッキング loud fail)から導かれたものであり、無申告の逸脱ではない。

## 件数の実測訂正(`cid:requirements-analysis:ledger-count-mechanical-recalc`)

decisions.md ADR-3 Consequences と services.md「ci.yml 編集に伴う既知コスト」は再 baseline の先行例を「**3件**(260725-mirror-review-fixes / 260729-otel-upstream U7 と U8 / 260801-open-bug-batch-5)」と記す。本ステージで `tests/integration/t-formal-verif-ci-workflow.integration.test.ts:14-32` を実読したところ、ヘッダの箇条書き物理エントリは **4件**である:

1. `260725-mirror-review-fixes: the Mirror CI job (rebase integration);`
2. `260729-otel-upstream U7: the lint job's callsite-guard step, …`
3. `260729-otel-upstream U8: the lint job's deletion-gate step and its report upload …`
4. `260801-open-bug-batch-5 (#1863): the drift-check job's compiled-graph drift step …`

上流の「3件」は **intent 単位の数え方**(260729-otel-upstream を1件と数える)であり、上流表記の内訳「260729-otel-upstream U7 と U8」がその数え方を自ら明示している。したがって両者は矛盾ではなく **数える単位の違い**である。本 unit は追記先の物理形式を扱うため、**エントリ単位 4 件**を作業上の基準とし、本 intent 分を追加して 5 件にする。上流の記述は訂正を要さない。

## 落ちる実証の設計(`cid:code-generation:corpus-sweep-for-new-guards` の両側実測)

BR-PDC-5 / BR-PDC-6 / BR-PDC-14 は新設の検査であり、「赤くなること」と「正当な状態で赤くならないこと」の両側を実測する:

| 検査 | 赤の実証 | 緑の実証 |
| --- | --- | --- |
| BR-PDC-5(パス実在) | 対象列の1件を不存在パスへ差し替えて実行 → 実在検査ステップで exit 非 0 | 正規の対象列で実行 → 実在検査を通過して `bun test` に到達 |
| BR-PDC-6(ファイル数照合) | 期待数を1つずらして実行 → 照合ステップで exit 非 0 | 正規の期待数で `Ran … across M files` の M と一致 |
| BR-PDC-14(baseline ピン) | 再 baseline **前**に `bun test tests/integration/t-formal-verif-ci-workflow.integration.test.ts` を実行 → `changes outside the three permitted U4 edits` で赤 | 再 baseline **後**に同テストが緑。かつ既存の「未承認編集は依然としてハッシュを反転させる」テスト(同ファイル `:39-48` の `falls when event isolation, action pinning, or legacy retirement regresses` 冒頭 — `:45` `      source.replace("    name: Lint and complexity", "    name: Lint and complexity (unsanctioned edit)"),` / `:48` `    )).toContain("changes outside the three permitted U4 edits");`)が引き続き緑 = ピンの保護力が弱まっていない |

BR-PDC-14 の赤の実証は **ci.yml を編集した直後・fixture を更新する前**という一時点でしか観測できない。`cid:code-generation:falling-proof-injection-one-set` が要求する「赤の実測 → revert を不可分1セット」については、本件は**注入と revert ではなく、正規の作業順序の中間状態を観測するだけ**であるため、head に注入コミットが残る余地が無い(観測 → そのまま fixture 更新 → 緑、で1つの作業単位が閉じる)。

## 検証の実行方法(実装段が回すコマンド)

| 目的 | コマンド |
| --- | --- |
| CI 形状ピン(BR-PDC-14 / 15) | `bun test tests/integration/t-formal-verif-ci-workflow.integration.test.ts` |
| `ci-success` 独立性(BR-PDC-3) | `bun test tests/unit/t222-ci-snapshot-wiring.test.ts tests/integration/t222-ci-snapshot-branch.integration.test.ts` |
| ワークフロー全体の緑(NFR-5) | `bash tests/run-tests.sh --ci` |
| 深掘りのローカル再現(BR-PDC-8 の実測値採取) | `AMADEUS_PBT_DEEP=1 /usr/bin/time -p bun test <対象 PBT ファイル列>` |

複数 test path を渡す実行では、実行前に全 path の実在を機械確認し、実行後に `Ran … across M files` の M を期待ファイル数と照合する(`cid:build-and-test:test-path-set-completeness`。zsh では配列展開で確認する — `cid:build-and-test:bt-path-existence-array-expansion`)。これは BR-PDC-5 / BR-PDC-6 が CI ジョブへ焼く規律を、実装者のローカル検証にも同じ形で適用するものである。

## 上流成果物の本文参照(consumes の依拠箇所)

| 上流成果物 | 本書での依拠箇所 |
| --- | --- |
| requirements.md | BR-PDC-1(FR-5a)、BR-PDC-3(FR-5b / NFR-5)、BR-PDC-11(FR-5a の seed 可視化)、BR-PDC-12(FR-4c)、適用外表(FR-5a の schedule Out) |
| unit-of-work.md | 前文(「pbt-deep-ci は services.md S2 のジョブ契約に従う」という写像の指示) |
| unit-of-work-dependency.md | BR-PDC-14(cast-guard 着地後に採り直す = 共有資源の直列化) |
| components.md | BR-PDC-12(再利用棚卸し `:97` の PBT 規約 canonical)、適用外表(U5 の所在を超えない) |
| component-methods.md | 適用外表(P-EL / P-ST の所有は U2/U3 にあり本 unit は新設しない) |
| decisions.md | BR-PDC-1 / 2 / 4(ADR-3 Decision と Rationale 2)、BR-PDC-3(ADR-3 Rationale 3)、BR-PDC-14 / 15 / 19(ADR-3 Consequences)、BR-PDC-16 / 17(ADR-3 Security/Compliance 影響)、適用外表(ADR-3 Alternatives Rejected B) |

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段4(手動深掘りによる浅い探索の見逃し回収と失敗 seed 再現)に対応する。
