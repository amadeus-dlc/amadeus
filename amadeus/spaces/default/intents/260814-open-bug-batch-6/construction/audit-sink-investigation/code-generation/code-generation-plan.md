# Code Generation Plan — U-5 audit-sink-investigation(#3032 / FR-5)

depth Minimal。調査ユニット(D-5)のため、コード生成は条件分岐後にのみ発生する。トレース: 全 step → FR-5(stories は SKIP のため FR 直接トレース)。

## Steps

- [x] Step 1: 当時断面の確定 — 着地2行(2026-08-07T11:20:09Z)当時のコミット(intent 260807-projectdir-worktree-fix の record と git 履歴から 4a3da7d62 近傍)を特定し、t214-seam テストと emit 経路の当時バイトを読む → FR-5
- [x] Step 2: repo 外 scratch に再現環境を構築 — scratch 配下に workspace A(「実 record」役)と workspace B(fixture 役)の2ツリーを作り、AMADEUS のツール実行を scratch の project-root override で駆動(実 record への書込リスクを構造的に排除) → FR-5
- [x] Step 3: 再現試行 — 同一 bun プロセス内で (a) workspace A を先に OTel bootstrap(ピン) (b) CLAUDE_PROJECT_DIR を workspace B へ向けて recordEngineError を呼ぶ — の順で駆動し、ERROR_LOGGED 行がどこへ書かれるか(A / B / どこにも書かれない)を実測。当時バイト(Step 1)と現行バイトの両断面で試行 → FR-5
- [x] Step 4: 機序判定の記録 — 実測ログ・判定(再現/非再現・機序)を record の investigation-log.md へ確定値のみで記録 → FR-5
- [ ] Step 5(条件: 機序確定時のみ): TDD で是正 — 失敗テスト先行(emit 宛先が呼出時 projectDir と不一致になる再現テスト)→ loud fail または no-op の最小是正 → green。core 変更のため bt-ledger-resync(model-map ピン・coverage 台帳)と bun run build を同一変更で実施。worktree bolt-audit-sink で実装し push-first で PR → FR-5
- [x] Step 6(条件: 非再現時のみ): クローズ準備 — 実測ログを添えた Issue #3032 のクローズ提案文面と既着地2行の revert 要否申し送りを record へ記録(クローズ実行は人間承認境界) → FR-5
- [x] Step 7: code-summary.md の作成(分岐結果・実測値・残課題) → FR-5

## 分岐の実績(実行後の追記)

計画は Step 5(機序確定)と Step 6(非再現)を排他の条件分岐として書いたが、実際の結果はそのどちらでもない第三の形になった: **機序は確定したが、原因は main へ着地しなかった WIP バイトであり現行バイトに是正対象が存在しない**。したがって Step 5 は前提不成立で**不適用**(未チェックのまま)、Step 6 の「実測ログを添えたクローズ準備」を適用経路とした。根拠と実測は `investigation-log.md` を正とする。

## テスト方針

- Test Strategy は Comprehensive(self-fix スコープ既定)だが、本ユニットは調査型 — テスト新設は Step 5 の是正分岐でのみ発生(回帰テスト1件以上、エラーパス含む)。非再現分岐ではコード・テスト変更 0 件(検証劇場の禁止 — 目標なき検査は作らない)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T01:16:24Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER 2件・FOLLOW-UP 2件はすべて是正済み。記録された述語 9本を実際に再実行し全件が記録値と一致(exit code 含む)、PR #2413 引用も gh 実測で逐語一致。新規 BLOCKER なし。

### Findings

- FOLLOW-UP | investigation-log.md:126 の自己参照の例示値が現在は再導出できない — 除外なし `grep -rl` の実測は `"seam: argv project-dir"` が 3 ファイル(記録は 2)、`"probe: pin A"` が 2 ファイル(記録は 1)。増分は本 intent 自身の監査シャード `amadeus/spaces/default/intents/260814-open-bug-batch-6/audit/j5ik2o-mac-studio-lan-1ce2b3e7876b.jsonl`(:358 seq358 timestamp 2026-08-15T01:13:37Z の SUBAGENT_COMPLETED 行が needle を含む = 起草後に append された)であり、append-only 監査の時間ドリフトとして説明可能。結論を担う除外付き述語はすべて再導出できるため BLOCKER ではないが、記録値に「(起草時点。以後は本 intent の監査シャード追記により増加しうる)」の但し書きを添えるか、除外なし側も測定 ref 付きで書き直すのが望ましい。
- FOLLOW-UP | pr-convergence-report.md の attestation は local/remote/pr head すべて `59f15454fae506393679b880c4d9c2eaff32a491`(generated 2026-08-15T01:05:14Z)だが、bolt worktree `bolt-audit-sink` の現 head は `9d9784481`(2026-08-15T10:05:48+09:00 「mint created pr-convergence report ...」)で、iteration 1 の是正コミットを含む head は attestation 発行時点より前進している。`kind: created` / `converged: false` の create 時 attestation としては妥当だが、merge-ready 判定前に現 head で再 mint と必須 check の再実測が要る(team.md Way of Working の created epoch 再 mint 契約)。本レビューの成果物内容には影響しない。
- NIT | 上流宣言と実パスの一致は確認済み — unit-of-work.md:51(U-5)と :41(U-4)がいずれも engine 正準の `construction/<unit-slug>/code-generation/` を宣言し、訂正注記付き。実在パス `amadeus/spaces/default/intents/260814-open-bug-batch-6/construction/audit-sink-investigation/code-generation/`(investigation-log.md / code-summary.md / code-generation-plan.md / pr-convergence-report.md の 4 件)と一致し、BLOCKER-1 は閉包。
- NIT | BLOCKER-2 の再実測を検証者側で独立に再実行し全件一致した(測定 ref: 本 worktree HEAD a49f9e9fdbd19fd40e9374feba77e9360771d173 = ログ §冒頭の記録値と一致)。内訳: (1) `grep -rn --exclude-dir=260814-open-bug-batch-6 "seam: argv project-dir" amadeus/spaces/default/intents/` → 0 行 exit 1 (2) 同形 `"seam: no state"` → 1 行 exit 0(シャード :156) (3) 同形 `"seam: something went wrong"` → 1 行 exit 0(:155) (4) `"probe: pin A"` amadeus/spaces/default/ → 0 行 exit 1 (5) `"seam: cwd-marker-A env-B"` → 0 行 exit 1 (6) `grep -c "" <着地シャード>` → 393 (7) `git status --porcelain -- .../260807-projectdir-worktree-fix/` → 0 行。すべて記録値と exit code まで一致。
- NIT | FOLLOW-UP-1(git log 件数)は閉包 — `TZ=UTC git log --since=2026-08-07T09:00:00Z --until=2026-08-07T13:00:00Z --format='%H %cI %s' --all` を再実行して 5 行 exit 0、5 件の SHA・`%cI`・subject が investigation-log.md:16-22 の表と逐語一致。squash 3 件 / ブランチ 2 件の内訳(:24)も subject の PR 番号有無から再導出できる。§4 の段順述語も 2 件抽出で再実行し、`d4f0513c5` → env 相対 10 / marker 19、`4a3da7d62` → env 6 / marker 出現なし で表(:117 / :116)と一致。
- NIT | FOLLOW-UP-2(PR #2413 引用の逐語性)は閉包 — `gh pr view 2413 --json body -q .body | grep -n "marker 段より"` を再実行して 1 行・`:8` を得、investigation-log.md:54 の引用が全角括弧・`**上**` の強調記号・読点まで含めて原文と 1 文字も違わないことを確認。選挙記録 `amadeus/spaces/default/elections/260807-e-pwf-cgdev2/record.md` も実在し、:3 の question 逐語(「隔離 seam が破れた」「rogue イベント多数」)と :9 の票タイムライン(配信 2026-08-07T11:31:17Z → 開票 11:35:19Z)が :56-60 の引用・派生記述と一致する。
- NIT | FR-5 受け入れとの整合を確認 — requirements.md FR-5 は「いずれの分岐でも実測証跡を record へ確定的に残す」「クローズ自体は人間承認境界」を求めており、本ユニットは (a) 機序確定 (b) クローズ提案文面の record 記録(§6.1、投稿は未実行) (c) 既着地2行の revert 要否申し送り(§6.2)をすべて満たす。計画 Step 5 の不適用も code-generation-plan.md の「分岐の実績」節で前提不成立として明示され、無申告のスコープ縮小には当たらない。コード変更 0 件でテスト新設なしとした判断も project.md の「目標なき検査を作らない」に整合する。
- NIT | 現行バイトへの引用 `packages/framework/core/tools/amadeus-lib.ts:232-270` を実読で確認 — :232 が `export function resolveProjectDir(explicitDir?: string): string {`、:236-240 に env 段を marker 段の上に置く理由のコメントが実在し、§4 の記述(:105)と一致する。段順(explicit → env → marker)も実文どおりで、「現行バイトに残存欠陥なし」の主張は S3 の実測 pin と併せて反証されない。
- NIT | 申し送り(§6.3 / code-summary.md:34)の無音ドロップは Issue 完了条件2の「no-op」に該当するとの整理が妥当だが、可観測性ゼロの `catch {}` は construction フェーズガードレール『サイレントな失敗は許容しない』と緊張関係にある。本 intent のスコープ外とする判断自体は正しい(是正対象コードが存在しないため)ものの、別 Issue 化の要否は intent 完了時のトリアージで明示的に裁定されることが望ましい。
