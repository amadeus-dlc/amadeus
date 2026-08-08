# PR Convergence Report — u4-conduit-parity

上流入力(consumes 全数): code-generation-plan.md(検証コマンド集合)、code-summary.md(着地内容と落ちる実証)、functional-design/business-rules.md(BR-U4 の充足面)、nfr-design/security-design.md(認可境界を文言で緩めていないことの確認観点)、requirements-analysis/requirements.md(FR-5a〜5e)。

対象 PR: https://github.com/amadeus-dlc/amadeus/pull/2532

## 収束ループ(`j5ik2o-gh-pr-converge-loop` の順序)

### 1. mergeability

`gh pr view --json mergeable,mergeStateStatus` → 発行直後 `MERGEABLE` / `BLOCKED`(check 未完のみ)、CI 完走後 **`MERGEABLE` / `CLEAN`**。base(`main`)との競合はゼロ — ブランチは `origin/main` 起点で切り、u2(#2524)着地後の断面から fork している。

### 2. レビュースレッド

- **Cursor Bugbot**: pass(指摘なし)
- **CodeRabbit**: 初回はアカウントのレビュー上限により未実行(`Review limit reached`)。`@coderabbitai review` で再依頼して完走(コメント `#issuecomment-5225671586`)。行コメント3件を受領し、**全件に実測根拠付きで応答**した
- **§12a 独立レビュー**(`amadeus-architecture-reviewer-agent`、invocation `b2a756da…` iteration 1): **READY**。NIT 1件は是正済み

#### CodeRabbit 指摘の処理(採否とその根拠)

| # | 指摘 | 判定 | 根拠 |
|---|---|---|---|
| 1 | `stage-protocol.md:137`(Major)— semi の参照表が実装契約と食い違う | **採用・是正** | 実装の正準定義 `amadeus-intent-autonomy.ts:581` が `SEMI_ROUTINE_INTERACTIONS = ["stage-gate", "question"]` で **question を含む**。よって :137 が正しく、`24-intent-autonomy.md:26` / `.ja.md:26` の「Internal stage gates only / 内部ステージゲートのみ」が古い側だった。両言語の表を question を含む形へ更新。あわせて要求されたテストは既存(`tests/unit/t452-authorize-interaction-semi.test.ts:168` が `occurrence("question")` に対し `semi-authority` を assert)であることを実測して返信し、重複追加は行わなかった |
| 2 | `24-intent-autonomy.{md,ja.md}`(Minor)— MD040 フェンス言語未指定 | **採用・是正** | 妥当。両ファイルの起動例フェンスへ `sh` を指定 |
| 3 | `README.md:53`(Minor)— 日本語混入とハーネス中立性 | **不採用(反証)** | 「Line 53 が日本語」は実測で不成立 — `sed -n '53p' README.md` は英語行を返す。日本語なのは `README.ja.md:53` で、日本語版として規約どおり。中立性についても、README の機能箇条書きは `:37` `:44` `:71` が既に `/amadeus` 表記を採る既存慣行で、ハーネス別起動子は `:81-86` の起動表が単独で担う分担。本行だけを変えると同節内で不整合になるため、README 全体の表記方針として別途扱うべきと返信した |

`stage-protocol.md:137` については §12a reviewer も独立に NIT を出しており(`parked` が fail-closed 3値と同一括り)、こちらも `parked` を独立句へ分離して是正した。

処理後、actionable な未解決スレッドはゼロ。

### 3. 必須 check

`gh pr checks 2532 --watch --fail-fast` の最終状態 — **失敗ゼロ / 保留ゼロ**:

| check | 結果 |
|---|---|
| Tests | pass (10m9s) |
| Typecheck | pass |
| Lint and complexity | pass |
| Coverage Report / (base) / (head) | pass |
| Reproducible build | pass |
| Source-only and graph invariants | pass |
| Plugin conformance E2E | pass |
| Intent Mirror distribution contract | pass |
| Detect CI changes | pass |
| CI Success | pass |
| Cursor Bugbot | pass |
| Formal model check / Metrics Snapshot | skipping(対象外) |

初回 run で赤が出た面はない(builder の conductor tree 段階で `t-coverage-mechanism-ratchet` の `none→cli` 再分類を先に解消済み — `f679e2864`)。是正コミット2本を追加した後も**全 run で失敗ゼロ**を維持した(push ごとに再確認 — 収束ループの再入規律)。

最終コミット列(4本):

1. `feat(u4-conduit-parity): surface the --autonomy launch declaration on every conduit`
2. `test(u4-conduit-parity): register t492 as a deterministic spawner`
3. `docs(u4-conduit-parity): keep parked separated from the fail-closed trio in the semi paragraph`(§12a NIT 是正)
4. `docs(u4-conduit-parity): name questions in the semi row of the mode table`(CodeRabbit Major 是正 + MD040)

### 4. ローカル検証

PR worktree(`.../scratchpad/u4-pr`、`origin/main` 起点)で `build` / `typecheck` / `lint` / `gen-coverage-registry --check` / `source-only:check` をいずれも exit 0、対象テスト `7 pass / 0 fail`。落ちる実証は conductor が `kimi` 面で独立に1セット実施し、復元後 `5 pass / 0 fail` と残渣ゼロを機械確認した(詳細は code-summary.md)。

## 収束判定

mergeability CLEAN・actionable スレッドゼロ・必須 check 全件 green・ローカル検証 green が同時に成立。**収束確認はマージ承認を代替しない** — マージは no-AI-merge に従い、ユーザーの明示承認を得てから leader が実行する。
