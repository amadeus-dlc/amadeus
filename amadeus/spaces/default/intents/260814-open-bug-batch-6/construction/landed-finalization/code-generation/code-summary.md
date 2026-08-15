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
