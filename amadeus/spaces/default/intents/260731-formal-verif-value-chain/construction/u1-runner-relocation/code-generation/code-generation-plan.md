# Code Generation Plan — u1-runner-relocation

上流入力(consumes 全数): unit-of-work, functional-design(business-logic-model / business-rules / domain-entities), nfr-design, bolt-plan

## 実行計画(FD T1〜T7 準拠)

1. **T1** — 分類 A/B/C の 24 ファイルを `scripts/formal-verif/` → `plugins/formal-model-check/tools/` へ `git mv`(rename 追跡保持、BR-U1-1)。
2. **T2** — core 正本 `amadeus-formal-verif-model-map.ts` の byte-identical 複製を plugin 配下へ生成し、外部 importer を切替(実装時実測で 2 件: `canonical.ts:5` + `tla-model-map.ts:13` — I2 閉包の機械的適用として T2 の 1 件宣言を訂正)。
3. **T3** — `scripts/package.ts` に write⇔check 対称の複製同期(`writeGeneratedPluginSources` / `checkGeneratedPluginSources`、in-process seam 付き)を追加し、`dist` / `dist:check` へ配線。落ちる実証は 1 バイト注入 → 赤 → revert の不可分 1 セット(BR-U1-2)。
4. **T4** — `ci.yml` のパス 2 箇所(:584/:600)のみ差替(BR-U1-3 意味論保存)。
5. **T5** — stage 本文 :12/:41 の参照書換 → drop→compose の正規サイクルで全複製面(compose 済み/staging/stage-graph/dist 8 変種)へ同一 PR 内伝播(BR-U1-4)。
6. **T6** — 参照 remap の機械分類スイープ(分類 D は intersect で除外)。
7. **T7** — 台帳 2 面(complexity-baseline / coverage-patch-allowlist)の A/B/C エントリのみ機械 remap+直読照合(BR-U1-5)。

## Bolt 編成の改訂(承認系譜)

実装時実測で BR-U1-5 前提「分類 D は自己完結」が反証(D 30 中 26 が移設対象 7 モジュールを import、u1 単独 typecheck 不能)→ ユーザー裁定(2026-07-31)により **B1 = {u1 + u2} 統合 Bolt/1 PR**。u2(D 削除)は同一 worktree で続行実装(bolt-plan 改訂2、BR-U1-5 追補)。

## 検証集合(BR-U1-6)

typecheck / lint / dist:check / promote:self:check / run-tests.sh --ci+push 前ローカル lcov(patch 未カバー 0)。green 判定は統合着地(u1+u2)時点。
