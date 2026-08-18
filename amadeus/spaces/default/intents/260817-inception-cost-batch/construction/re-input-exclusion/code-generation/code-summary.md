# Code Summary — Unit re-input-exclusion(Bolt 2、#2415)

実装ブランチ: `bolt-re-input-exclusion`(base = `bolt-issue-evidence-upstream` @ ceca3f2f4、4 commits: `c828ef6d1`〜`5e0b1cb0d`)。builder 一次報告は worktree の `.amadeus-builder-summary.md`(untracked)。referee check `converged: true / tampered: false`、finalize converged 1 / failed 0。

## 変更ファイルと規模(git diff --stat ceca3f2f4..HEAD からの転記)

| ファイル | +/- |
|---|---|
| `packages/framework/core/amadeus-common/stages/inception/reverse-engineering.md` | +56(Step 2 `#### Scan input exclusions` 節 — 5クラス逐語 pathspec ブロック・specs 非除外・glob 罠警告・base 解決の分離・ADR-3 新規引用禁止・FR-MEAS-2 測定手順) |
| `packages/framework/core/tools/amadeus-lib.ts` | +29(`RE_SCAN_EXCLUDED_PATHSPECS` 定数) |
| `tests/integration/t2415-re-scan-exclusion.integration.test.ts` | +248(述語・帰属・負のコントロール — hermetic fixture repo) |
| `tests/integration/t2415-re-scan-exclusion-contract.integration.test.ts` | +167(契約逐語 + 正本⇔配送 drift の2アーム) |
| docs 対訳 + coverage registry regen | +25/−2 |
| 計 | 523 insertions / 2 deletions |

規模枠 350 に対し実績 500(1.43 倍)— 設計必須6要素の契約記載分とテスト観点(C7 の4観点+負のコントロール+落ちる実証)であり設計逸脱ではない(builder 申告・LOC 較正学習と同型)。

## TDD・落ちる実証

- 全 slice Red 先行(契約変更も drift テストを先に赤置き)。Red/Green のコマンドと exit code は builder summary §TDD の表が正
- FR-EXC-6 落ちる実証は **2アーム各1セット**: (A) 正本 drift(perl 注入 → contract テスト 8 pass/1 fail exit 1 → checkout revert 残渣0 → 9 pass exit 0)、(B) 配送ツリー drift(dist の pathspec 改変 → 赤 → `bun run build` で復元 → 緑)。正本アームと配送アームの分離動作も実測

## DEMO — FR-MEAS-2 初回測定(即時適用、測定 ref = 89053172e..23d4ae767)

- 挿入行 **8,023 → 3,066**(除外 4,957 行、**削減率 61.79%** = 4957/8023 派生値)、ファイル 123 → 34
- クラス別: intents 3,139 / codekb 936 / metrics 455 / elections 425 / memory 2(合計 4,957 = 総除外と一致)
- 帰属検査: 除外 89 ファイル全てが宣言クラスへ一意帰属 — **未帰属 0・二重帰属 0・claim 残存 0**(FR-EXC-4 AC)
- specs 非除外: `specs/tla/model-map.json`・`specs/tla-evidence/*.json` が残存側に実在(FR-EXC-2 AC)
- 素形 pathspec の 0 件無音マッチも同区間で再実測(負のコントロール — FR-EXC-5)

## 検証(head 5e0b1cb0d、実測 exit code)

- typecheck 0 / lint 0(新規ファイル単体 0 diagnostics)/ build 0(tracked 不変)/ registry --check 0
- t2415 ×2 + t3181-contract + t66: 116 pass / 0 fail。t72(unit)+ t3181 残り: 59 pass / 0 fail
- **t72 live SDK テスト 1 fail は base 由来を ablation で確定**(本 Unit の契約変更を base へ戻して同一 assertion で fail 再現 → 復旧・残渣0)。CI では provider 不在時 self-skip(ci.yml:5 逐語)

## 未検証面(申し送り)

- リモート CI の blocking 集合は PR 作成後に実測(PR は #3190 着地後の rebase 形 — serial-landing-rebase-shape)
- 除外適用後の RE 実走(次回 issue-first intent での実測)と RE 系 subagent 実時間の再測は効果測定(後続 intent)の観測対象
