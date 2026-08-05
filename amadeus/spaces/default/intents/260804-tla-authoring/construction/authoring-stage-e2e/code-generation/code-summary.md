# Code Summary — U5 authoring-stage-e2e(Bolt 6、バッチ 4)

上流入力(consumes 全数): business-rules.md(BR-U5-01〜14 の照合元)、domain-entities.md(手順契約表と E2eFixture 定義の照合元)、security-design.md(fail-closed 契約と read-only 規律)、unit-of-work.md(U5 宣言境界)、requirements.md(FR-002 / FR-009 / FR-012 / AC-007)。business-logic-model.md は U5 が spec kind のため FD 非該当で不在(nfr-design-questions.md の 0 件判定に記録済みの設計どおりの欠落 — 内容を発明しない)。

## 実装結果(実測)

- ブランチ: `bolt-authoring-stage-e2e`(base = tla-authoring-wt 2307aff10、U4 #2287 着地済み origin/main 系譜)
- コミット(5件): b206c4798(stage 文書 160行)→ c70087e33(unit-pool 要求 fixture)→ 950371c79(E2E テスト t450)→ d5b9c5d44(plugin manifest 2-stage ピン + 既存2テスト追随)→ 3006562fa(**REVISE 是正: 既存 formal-model-check の実実行を E2E へ結線**)
- 新設: `plugins/formal-model-check/stages/tla-authoring.md`(frontmatter + Steps 6節 + 失敗時挙動明記。FD FOLLOW-UP 2点反映: 登録節の build→verify→commit 明示 / terminal route 拒否の ADR-7 申告)、`tests/fixtures/tla-authoring-unit-pool/requirements.md`(見出し駆動文法適合を実 regex 照合)、`tests/integration/t450-tla-authoring-stage-e2e.integration.test.ts`(848行: stage 文書契約検査 + 全経路 E2E + import closure + fail-closed 2系)
- 変更: `plugins/formal-model-check/plugin.json`(stages 2件宣言)、`plugins/formal-model-check/README.md`、既存 plugin 検査2テストの最小追随

## 独立レビュー(§12a 相当、iteration 2/2)

- iteration 1: **REVISE(GoA 5-7)** — CRITICAL: E2E 主フローが「既存 formal-model-check 実行 → 相関 verdict」(FR-012 / AC-007 / BR-U5-08)を実行せず、run-model-check.ts 参照 0 件。FOLLOW-UP: witness 欠落 halt テストの map-unchanged が自明成立
- 是正(3006562fa): `runComposedModelCheck()` が composed host の run-model-check.ts を動的 import し実 `runModelCheck(argv, dependencies)` を呼出し(fake は toolchain.runPlanned のみ、filesystem/publisher/reserveArtifacts は実実装)。commit が書いた同一 map への収束・`selectVerifiedModel` のバイト一致検証経由・`NOT_DETECTED` + exit 0 + 相関 hold 解放まで assert。FOLLOW-UP も能動検査(halt 後 commit 試行 → preconditions-failed + map 不変)へ是正
- iteration 2: **READY(GoA 1-2)** — CRITICAL 閉包を実測確認(dependencies 契約への正配線・本番コード汚染なし・docstring の実態一致・是正 diff 内引用3件の独立再実測すべて一致)。NIT 1件(test タイトル文字列に formal-model-check の語が無い — docstring とコードで裏付け済みのため非ブロッカー)

## 検証(実測 exit code)

- conductor 裏取り(c5 引き取り — Stop hook 下で builder 報告がターン境界配送不能のため disk-evidence 早期切替): typecheck 0 / lint 0 / t450 = 11 pass 0 fail / siblings(t444+t448+t449+plugin 検査2)= 84 pass 0 fail / patch gate PASS(measured 0 — spec kind のためソース測定行なし)/ 統合 full CI は本 summary 確定前に実行(結果は PR 検証と CI を正とする)
- builder 実測: 是正後断面(HEAD 3006562fa)で full CI RESULT: PASS / coverage:ci PASS / patch gate PASS(measured 0 = tests のみ)/ typecheck 0 / lint 0(遅着報告 2026-08-05T16:19Z 受領で確定)。conductor 側でも同断面の full CI PASS を独立実測(exit 0)
- 是正の TDD: Red(MODEL_MAP_INVALID: repository root 未解決で 1 fail)→ 実装契約3件(domain 付き canonical identity / implPath 実在+ハッシュ一致 / vocabulary 宣言必須)を実測追随 → Green 11 pass。CONTROL(repo 外 scratch・未コミット): commit 直後に map を登録前へ戻すと『model map does not register the requested model UnitPool』で fail — E2E の model-check assert が自身の登録に依存することを実証
- referee: `amadeus-swarm check authoring-stage-e2e` converged=true / tampered=false、settle-release outcome=succeeded(pool terminal/completed)。finalize の engine merge-back は AUDIT_FORKED 不在(worktree を手動 git worktree add で作成したため fork 監査マーカーが無い)で audit-merge-failed — 既習回収手順により conductor が --no-ff 明示マージで回収(parent 2 / ls-files -u 0 / 対象ファイル実在 / 監査シャード重複 0 を機械確認)

## 逸脱・裁定

1. **iteration 1 CRITICAL の無申告乖離 → 是正で閉包**: 逸脱申告なしで E2E 後段2ステップが省かれていた点はレビューが捕捉し、是正 3006562fa で契約準拠へ回復(裁定不要 — 契約への機械的復帰の執行クラス)
2. terminal route 拒否は FD 段で申告済みの追加(ADR-7)— stage 文書内に申告文言を保持
3. TDD 適用外(1)の申告: stage 文書・fixture は文書成果物のため既存テスト前後 green + 文書契約テスト(t450 前半)で代替
4. builder 遅着報告(是正前断面、2026-08-05T15:54Z 受領)の差分吸収: 新規矛盾なし。追加吸収 — (a) stage 文書の節構成は FD 逐語(Steps+Learn)を優先しつつ plugin 既習の「Not a stock-scope stage」節を併記(2既習形の併存につき新様式発明なし — reviewer iteration 1 の BR-U5-07 確認と整合) (b) 既存2テストの stage 集合完全一致ピンの 2-stage 更新は承認済み成果物追加への機械的追随 (c) composed runtime 非自明性の CONTROL 実測(composed の tla-registration.ts を削除すると Cannot find module で E2E 3 arm が fail — repo 外 scratch・未コミット) (d) テスト層は --ci が e2e 層を含まないため integration 配置(fs-tests-integration-first 整合)

## 申し送り

- NIT(iteration 2): E2E 主フローの test タイトル文字列への formal-model-check 明記は任意の後続整形
- E2E の合否実測の受け入れ主体は build-and-test stage(BR-U5-12)— 本 unit は stage 文書と fixture を提供し判定を所有しない
