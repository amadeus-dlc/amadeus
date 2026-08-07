# Code Summary — Bolt 1: fix-2313-reconcile-freshness

上流入力(consumes 全数): `requirements`(`amadeus/spaces/default/intents/260807-failclosed-recovery-path/inception/requirements-analysis/requirements.md` — FR-1.1〜1.5 / AC-1a〜1e を実装と検証の合否面として消費)。

## 実装結果

- **ブランチ**: `bolt/fix-2313-reconcile-freshness`、head `bea90d0579c28e66340321d8dfbaa46ee15c56a5`(base = origin/main `b8e3e664f`)
- **コミット**: `e39e497e7` fix(no-silent-drop): share one freshness path set and narrow the landing proof / `bea90d057` fix(no-silent-drop): rebind adoption evidence to the freshness fix
- **変更**: 10 files / +347 −151(`scripts/` + `tests/` + `docs/` — repo-only、dist 投影なし = NFR-4 どおり)

## FR 対応

| FR | 実装 |
|---|---|
| FR-1.1 | `tests/no-silent-drop/evidence-rebind.ts` に `EVIDENCE_FRESHNESS_PATHSPECS`(2要素: `:(glob)tests/no-silent-drop/**/*.ts` + `tests/no-silent-drop-gate.ts`)を export。t413 と adapter の両方が import 消費(canonical 1定義) |
| FR-1.2 | adapter の第2段 root tree 完全一致を `assertProvenPathsIdentical`(freshness pathspecs + `EVIDENCE_BUNDLE_PATHS` 面の `git diff --name-only -z`)へ置換。それ以外の差分は base 前進として許容。エラーコード識別子 `REBIND_PR_LANDING_TREE_MISMATCH` は据え置き(メッセージのみ更新、他所での消費なしを grep 確認) |
| FR-1.3 | t427 の drift テーブルを `LandingDrift = "outside" | "freshness"` へ改訂 — `"freshness"` は `differ on proven evidence paths` を期待、`"outside"` は throw せず proof 返却 + root tree 実差分を assert。CLI ソース pin 3件は無改変 green |
| FR-1.4 | 落ちる実証2件を一時ブランチで実測(注入→赤→復元→残渣ゼロ実測: status 空 / diff 空 / grep 0)。(b) 形 = gate 実装パスの PR head↔landing 差分で t427 が 2 fail、canonical 縮退で t466 が 2 fail。**いずれも fixture として恒久固定** |
| FR-1.5 | `docs/reference/11-contributing.md`(+37)/ `.ja.md`(+23)に branch 内 rebind 手順節(コマンド逐語) |
| 自己マッチ | `bun scripts/no-silent-drop-evidence.ts rebind --target-revision <head>` 実行、証拠3ファイルをコミット(`bea90d057`) |

## TDD 実測(builder 報告 + conductor 裏取り)

- Red 1(FR-1.1): `SyntaxError: Export named 'EVIDENCE_FRESHNESS_PATHSPECS' not found` → Green 2 pass
- Red 2(FR-1.2): `Expected substring: "differ on proven evidence paths" / Received: "…root trees differ"` 19 pass 2 fail → Green 21 pass

## 検証(builder: 全 exit 0 / conductor 裏取り)

builder: build 0 / typecheck 0 / lint 0 / 対象4+新規 t466 = 49 pass 0 fail / no-silent-drop スイート 89 pass 0 fail / gate check(`--base-revision b8e3e664f`)= `NO_SILENT_DROP_OK` 0 / gen-coverage-registry --check 0 / source-only:check 0 / 波及ガード 39 pass 0。
conductor 裏取り(builder worktree で再実行): `bun run typecheck` = 0、t466+t413+t427 = **33 tests / 0 fail / 173 expect**。
`run-tests.sh --ci` と coverage は conductor が PR CI で判定(coverage 単独所有 — `cid:code-generation:c1-coverage-single-owner`)。

## §12a i1 FOLLOW-UP への追補(conductor 実測)

- **落ちる実証の所在**: 一時ブランチ `tmp/falling-proof-2313`(実測後に削除済み — 注入コミット SHA は branch 削除で失われたが、両実証は **fixture として恒久固定**されており以後は t427(残存ホール (b) 形: `assertProvenPathsIdentical` から freshness pathspecs を除くと 19 pass 2 fail)と t466(canonical 縮退: `tests/no-silent-drop-gate.ts` を除くと 0 pass 2 fail)自体が実証を担保する。赤の実測 assertion 実文は本文 TDD 節と builder 報告に記録済み。
- **AC-1a の対応テスト**: `t427-no-silent-drop-evidence-reconcile.integration.test.ts:314 / :407 / :436` の `REBIND_NOOP` 期待(canonical 集合 diff 空 → `status: "no-op"`)が fixture 機械再現。
- **complexity gate**: conductor が builder worktree で再実行 — `bun tests/complexity-gate.ts --check` = **exit 0**(0 new violations)。
- **隔離2回ビルド再現性**: 本 Bolt は repo-only(dist 投影なし)のため、判定は PR CI の `Reproducible build` job に委ねる(N/A ではなく CI 委譲)。
- **NSD 台帳制約(NFR-5)**: `git diff --name-only origin/main..HEAD | grep -c '^tests/no-silent-drop/events/'` = **0** — events 台帳は無改変。rebind が触るのは証拠束3ファイル(`EVIDENCE_BUNDLE_PATHS`)のみで、これは rebind verb の設計上の書き込み面であり台帳契約に抵触しない。

## 付随判断(builder 申告 — 分類を precision 化)

- **機械的帰結**: `rootTree` private メソッド削除(FR-1.2 置換で呼び出し元消滅)/ t427 の `MOCK_TREE` 定数と `^{tree}` 分岐の除去(到達不能化)
- **設計判断(P5 最小変更を根拠)**: エラーコード識別子 `REBIND_PR_LANDING_TREE_MISMATCH` の据え置き — FR-1.2 は改名を指示せず、コード識別子は他所で消費されない(grep 0)ため、改名は不要な差分拡大と判断。メッセージのみ新契約(`differ on proven evidence paths`)へ更新
