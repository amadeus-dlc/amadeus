# Code Generation Plan — landed-report(Bolt 1)

上流入力(consumes 全数): `requirements`(FR-1〜FR-5 / AC-1a〜AC-4b)。設計拘束 = FD(`construction/landed-report/functional-design/` 3成果物、i2 READY)と選挙 E-MPC-CGBLK(案A)。

## 実装ステップ(story-map スライス 1〜6、TDD — AC 述語は requirements 逐語)

1. **PrLifecycleState / LandedFacts / EvaluatedVerdict**(predicate 新設): 未知値 throw(AC-1b「未知 state 値を注入したテストが throw を assert」)。evaluateConvergence / ConvergenceVerdict / resolveMergeable はバイト不変。
2. **PR_STATE_QUERY + RawPrState 拡張**(gh-runner): state/mergedAt/mergeCommit.oid/statusCheckRollup.state を raw のまま返す(AC-1a「拡張後クエリがマージ済み PR で state/mergedAt/mergeCommit.oid を返すことを scripted fixture で assert」)。裁定 E-MPC-CGBLK 案A: absent は undefined のまま。
3. **status の landed 短絡**(cli: resolvePrLifecycle + primed): AC-2a「sleep seam 呼び出し 0 回」/ AC-2b「exit 0 + verdict 判別」/ AC-2c「t446/t448 無改変 green + 未マージ PR で landed 不発火(負方向)」。
4. **report の landed variant**(cli): AC-3a「全フィールドが GhSpawn fixture の値から機械導出」/ AC-3b「landed 経路が latestHumanTurn を呼ばない(または不在でも成功する)」/ AC-3c「renderReport 出力がセンサー PASS」。
5. **sensor 拡張**(core): AC-4a「kind=landed の受理と landed 規則違反の finding を単体で assert」/ AC-4b「landed fixture の PASS + 欠落/矛盾の FAILED を両側実測(落ちる実証)」。
6. **stage 文書**: FR-5.1(landed = マージの記録であり承認ではない)/ FR-5.2(語彙の repo 全域 grep 棚卸し)。

## 逸脱裁定(実装前停止 → 選挙)

builder が FD 3項の同時充足不能(t448 の toEqual 意味論)を実測立証して実装前停止 → **E-MPC-CGBLK 成立 2-0 で案A 採用**(absent-undefined 許容 + resolvePrLifecycle の undefined ガード。fail-open 残余の仕様裁定 = Issue #2412)。詳細は `construction/code-generation/memory.md` と選挙記録。

## 検証計画

- typecheck / lint / complexity gate / 対象6テストファイル(t446/t447/t448/t450/t481/t482)/ `bun run build` 後追跡ファイル不変。
- coverage 正規判定は PR CI(Project/Patch 両ゲート)— `cid:code-generation:local-lcov-pre-push`。
- 新規テスト番号 t481/t482 は実装開始時点の固定 base(4a3da7d62)で衝突なしを実測済み。
