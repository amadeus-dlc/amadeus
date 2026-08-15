# Code Summary — U-1 landed-finalization(#3062 / FR-1)

depth Minimal。詳細な実測は `implementation-notes.md`(builder 起草、base 8b36a0ad0 断面)。

## 変更ファイル(git diff --stat origin/main..HEAD、worktree bolt-landed-finalization)

- 実装: `plugins/github-pr-convergence/tools/pr-convergence-cli.ts`(+17/-旧拒否3層削除)、`plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts`(+20)
- 契約文書: `plugins/github-pr-convergence/stages/pr-convergence.md`(+32 — landed=記録事実への改訂、auto-merge×report 順序契約)、`plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md`(+7)
- テスト: 新設 `tests/integration/t3062-pr-convergence-landed-finalization.integration.test.ts`(285 行)、契約更新 `t448` / `t450` 系
- record: `implementation-notes.md`(+79)

## 主要実装判断

- 選挙裁定 A の忠実な実装: self×landed 拒否3層を削除して置換(二重経路なし)、merge fact は非 self 既存集合と同一、converged:false 維持、checkRollupState は合格条件外
- `transitionAllowed` に `created -> landed` を追加(auto-merge 先着 → landed 最終化の正規遷移)
- 波及候補3モジュール(attestation/provenance/ledger)は判別値 "landed" 非消費を実測し変更対象外(根拠は notes §Step 1)
- t448 の旧拒否契約テストは、新契約下で残る不変条件(created epoch なしでは最終化不能)の検査へ置換

## テスト・検証(builder 実測、notes からの転記)

- TDD Red→Green: t3062 3 fail → 4 pass(32 expect)。関連スイート 220 pass / 0 fail、ゲート系 98 pass / 0 fail
- 落ちる実証: merged→pass / created→fail の対 + センサー注入2種で t450 赤(42/1)→ revert 残渣ゼロで 43/0 復帰
- coverage registry regen 済み(`--check` OK)。typecheck / lint green(builder 報告)
- フルスイート・coverage は push 後の CI を正とする(push-first)

## 逸脱

- なし(計画 Step 1-7 どおり。Step 8 の push/PR は conductor 実施)

## FR-1 受け入れ (3)(4) の実測(iteration 1 レビュー指摘対応、測定 ref: worktree bolt-landed-finalization HEAD = PR #3081 head、2026-08-15)

- (3) 対称性回復: 旧拒否メッセージの全域不在 — `grep -rln "landed is not convergence evidence" plugins/` → 出力 0 行・**exit 1**(エラーなし不一致)。self/非 self の landed 判定は単一述語 `const settled = verdict.converged || evaluation.value.kind === "landed";`(`pr-convergence-cli.ts:1394`、`git grep -n` 転記)に収束し、self 専用分岐は report 書込先(`writeSelfReport`)のみ。t3062 テスト1(status settled exit 0)・テスト2(report が merge fact 束縛で書込)が self 側の同値挙動を実測
- (4) stage 文書の契約検査: 旧文言 `landed is not convergence evidence` は `plugins/github-pr-convergence/stages/` で 0 行・exit 1、全ハーネス投影 `dist/` で該当ファイル 0 件(`grep -rln | wc -l` → 0)。新契約節は `grep -n "Already merged" plugins/github-pr-convergence/stages/pr-convergence.md` → `:305` に 1 hit、順序契約は `grep -c "auto-merge"` → 1(「auto-merge can land the pull request before `report` runs」節)
- `transitionAllowed` への `created -> landed` 追加の帰属: D-1 の「CLI 3層の self×landed 拒否を landed 事実の report 書込へ置換」の直接の帰結 — created epoch の report が存在する self record に landed report を書くには created→landed 遷移の許可が必要条件であり、これなしでは裁定 A は実装不能(設計射程内。final state からの遷移追加はなし)
- 変更ファイル数値の測定 ref: `git diff --stat origin/main..HEAD`(origin/main = 8b36a0ad0)の転記。テスト実測値(220 pass 等)は implementation-notes.md §Step 2-5 の bun test 出力転記
