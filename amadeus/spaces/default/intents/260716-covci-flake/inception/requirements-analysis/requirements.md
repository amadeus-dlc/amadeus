# Requirements — covci-flake(Issue #1085)

> 上流入力(consumes 全数): Issue #1085(e2 起票+e1/e3 クロスレビュー、e3 の機構矛盾指摘)、leader 割当指示(柱3本+逸脱実装前停止+確定値報告)、RE scan-notes(計上機構の file:line 確定・未確定仮説の引き継ぎ)、codekb `code-structure.md`「テストランナー失敗計上機構の観測」節。`business-overview.md` / `architecture.md` はランナー内部のみの bugfix と非交差 — scan-notes と当該節を上流の正とする。
> 既決照合: 修正選定 = 割当の pre-declared 分岐(既知クラス→修正 / 環境起因→ガード or リトライを**後段選挙**)。明確化質問 0問(questions 冒頭の判定参照)。

## FR-1: 能動再現ハーネス(柱(2))

repo 外 scratch で `bun run coverage:ci 2>&1 | tee <scratch>/covci-<n>.log` を、意図的負荷(別プロセスの並行テスト実行等 — fanout-load-settle の逆操作)併走で反復する。

- AC-1a: 判定は tee 全文からの機械抽出のみ — `Failed files:` の実数値(SUMMARY :909 由来)と、失敗ファイル名は `=== START/DONE` ブロック文脈で親 run 直下の `--- FAIL:` 行に限定して抽出(planted 子 run 行の除外 — 抽出精度の担保。仮説検証そのものは AC-2c が受け持つ)
- AC-1b: exit code はパイプ越しに捕捉しない(cid:code-generation:no-exit-capture-through-pipe — E-PM5 M1、norm PR #1099 着地済み。`${PIPESTATUS[0]}` か一時ファイル)
- AC-1c: 打ち切り予算は実装時に実行時間×資源制約から導出し、試行回数・負荷条件・結果を**確定値のみ**で報告(cid:requirements-analysis:report-final-values-only — E-PM5 M4、norm PR #1099 で origin/main 着地済み)。非再現でも FR-3 の選挙へ「非再現+静穏 PASS 系列」を入力として進む
- AC-1d: scratch 実行規律(scratch-script-discipline — `cd X || exit`・record 非汚染)

## FR-2: シグネチャの出所確定(柱(1)の残余)

- AC-2a: 再現時 — Failed files 実数値・実ファイル名・スコープ帰属を一次ログで確定し Issue #1085 へ追記(「unit 1+e2e 2」の出所解明: 実失敗 or 読み取り誤計上)
- AC-2c(読み取り誤計上仮説の定量検証 — RE 未確定仮説の閉包): 再現/非再現に関わらず1回の run で per-file ログ(bun test 出力 — verbose 実行 or tee 全文)を保全し、planted 文字列(`--- FAIL:` / `RESULT: FAIL` / `PROJECT COVERAGE GATE FAILED`)を含む **passing** テストを列挙 — 「ログ全文の素朴 grep だと何件の偽陽性が出るか」を実測件数で Issue #1085 へ記載し、「unit 1+e2e 2」の読み取り誤計上経路として成立するかを判定する
- AC-2b: 非再現時 — RE の不在主張(--ci の e2e 非実行 :187-192、.meta mkdtemp 隔離)を根拠に「e2e 2 は実失敗として機構上不成立」を Issue へ確定記載し、読み取り誤計上仮説(:673 --debug 限定エコーの非適用含む)の検証結果を添える

## FR-3: 原因別の対処(pre-declared 分岐 — 後段選挙)

- AC-3a: 既知クラス(size 宣言・timeout 予算・t163 系負荷敏感)なら該当修正を本 intent で実施(前例: #1059/#1077 の1行宣言、E-L71 の負荷収束)
- AC-3b: 環境起因なら決定的ガード(負荷検出)or リトライ設計の選択肢を leader へ送り選挙(blocker-election)— 実装は裁定後
- AC-3c: いずれの分岐でも新設ゲート/ガードは落ちる実証必須(Mandated)

## FR-4: 検証(既存ゲート準拠)

- AC-4a: 修正を伴う場合 `bun run typecheck` / `bun run lint` exit 0+関連テスト green+dist 面は変更対象に応じ dist:check / promote:self:check
- AC-4b: push 前 lcov(修正がツール面に及ぶ場合のみ — local-lcov-pre-push)

## FR-5: クローズ条件

- AC-5a: 対処着地後、着地面 grep → Issue #1085 手動クローズ+in-progress:amadeus ラベル除去(close-after-landing-verification)。非再現+ガード非採用の裁定となった場合は、裁定引用付きで Issue を整理(クローズ or 発動条件付き保留)し leader 経由でユーザー確認

## トレーサビリティ

| 要件 | 由来 |
|------|------|
| FR-1 | 割当柱(2)+ RE 捕捉要件+ cid:code-generation:no-exit-capture-through-pipe(E-PM5 M1)/ cid:requirements-analysis:report-final-values-only(E-PM5 M4)/ scratch-script-discipline — **E-PM5 系2件は norm PR #1099 で origin/main 着地済み(本 worktree の memory 層は未 merge のため grep 不可 — 出典は origin/main を正とする)** |
| FR-2 | 割当柱(1)残余+ e3 機構矛盾指摘+ RE 未確定仮説の引き継ぎ |
| FR-3 | 割当柱(3)の pre-declared 分岐+ blocker-election + 落ちる実証 Mandated |
| FR-4 | project.md Mandated + local-lcov-pre-push |
| FR-5 | close-after-landing-verification + Issue 可視化運用 |

## スコープ外(明示)

- run-tests.ts の SUMMARY への per-scope 失敗表追加(観測改善 — 必要が実測されたら別 Issue)
- CI 側の変更(CI は全期間 green — ローカル限定事象)
