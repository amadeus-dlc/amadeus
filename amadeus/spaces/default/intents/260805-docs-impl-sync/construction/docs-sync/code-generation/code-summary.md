# Code Summary — docs-sync(code-generation)

上流入力(consumes 全数): business-logic-model.md(3 Phase パイプラインを Bolt 1-4 として執行)、business-rules.md(BR-1〜BR-8 を各 Bolt の検証条件に適用)、domain-entities.md(Divergence→Bolt 割当どおりに配送)、requirements.md(FR/NFR 受け入れ基準の逐語適用 — code-generation-plan.md 経由)

## 配送実績(4 Bolt / PR、すべて amadeus-developer-agent builder の worktree 隔離実装)

| Bolt | ブランチ | PR | 内容 | 状態 |
|---|---|---|---|---|
| 1 divergence-fixes | bolt/docs-sync-divergence-fixes | [#2302](https://github.com/amadeus-dlc/amadeus/pull/2302) | クラス A(A-2〜A-9、A-11)+ B(B-1〜B-3)+ D(D-1〜D-4、D-7〜D-9)+ 同根 1 件(01-architecture)+ coderabbit レビュー対応 | open・CI Success green・CLEAN(Bolt 2/3 を包含) |
| 2 self-scopes | bolt/docs-sync-self-scopes | [#2306](https://github.com/amadeus-dlc/amadeus/pull/2306) | FR-3: 05 章の一般 11 スコープ化+self-* 専用 H2 節(FD-Q2=A)+ 17/04 章参照 | **ユーザーが #2302 へスカッシュマージ済み**(0f7cbec73) |
| 3 tool-docs | bolt/docs-sync-tool-docs | [#2310](https://github.com/amadeus-dlc/amadeus/pull/2310) | FR-5 F-2〜F-7: 22/19/11/12 章への節追加+新章 24-intent-autonomy(章番号は起草時+コミット直前の origin/main 実測 2 回で確定)+ 19-plugins 件数畳み込み | **ユーザーが #2302 へスカッシュマージ済み**(ad7c9bc3e) |
| 4 freeze-and-parity | bolt/docs-sync-freeze-parity | [#2314](https://github.com/amadeus-dlc/amadeus/pull/2314) | FR-4: 凍結注記(内容バイト不変)+ amadeus-files 現況化 / F-8: live-e2e.ja / F-9/F-10: 索引リンク | open(#2302 へ stacked、transplant 済み・patch-id 一致確認) |

マージはすべて人間実行(no-AI-merge 維持)。#2302 と #2314 の最終マージ承認はユーザーに帰属。

## 裁定・逸脱の記録

- **E-DIS-CG1(設計逸脱、ソロ選挙 2-0)**: D-9 は JA に節ごと不在で 2 行だけの追加が構造的に不可能 → 「Loop monitor and quality repair」節全体を忠実訳で移植(choice 1)。認可超過はコミット 407a1168b 本文と PR #2302 本文に申告。record: `amadeus/spaces/default/elections/260805-e-dis-cg1/`
- **執行(選挙不要)判定 3 件**: (1) t174 fixture 衝突の codekb glob → 本 intent 変更禁止面のため #2296 起票(builder が修正→赤実測→revert の実証付き) (2) 同根件数語 2 件(01-architecture、19-plugins「Seven packaged faces」)→ Q1=B + cid:same-root-inventory の機械適用で同 Bolt 修正 (3) 04-scopes.ja.md:9 → Q1=B + BR-2 で count-free 化(Bolt 2 畳み込み)
- **既決維持**: 17-skills「(29 total)」は RE 独立検算(core 32 − init 3)を正とし builder の別母集団カウント(30)を撤回
- **ブリーフとの相違(実読を正)**: tla-evidence.ts は CLI でなく library(import.meta.main 不在の grep 実測)、tla-authoring.ts は 556 行 — いずれも実装実読どおり記述

## FR-6 Issue 起票(受け入れ基準充足)

起票前重複検索(`gh issue list --state all`)実施済み・共通契約 6 節。ラベルは `gh issue view <n> --json labels` の実出力転記(FR-6 AC(2)): #2276 = `enhancement,P2` / #2277 = `enhancement,P2` / #2278 = `enhancement,P2` / #2296 = `documentation,P2`(付随 #2279 = enhancement,P2、#2311 = enhancement,P3):

- [#2276](https://github.com/amadeus-dlc/amadeus/issues/2276) G-2: glossary-projection の実 corpus 未配線
- [#2277](https://github.com/amadeus-dlc/amadeus/issues/2277) D-3/D-9 構造因: EN 限定 docs 同期ガードの JA 一般化
- [#2278](https://github.com/amadeus-dlc/amadeus/issues/2278) G-1: docs-only PR の CI tier
- [#2296](https://github.com/amadeus-dlc/amadeus/issues/2296) codekb glob × t174 fixture の同一 PR 是正
- 付随: [#2279](https://github.com/amadeus-dlc/amadeus/issues/2279) subagent 型規律+model 記録、[#2311](https://github.com/amadeus-dlc/amadeus/issues/2311) PACKAGE_HARNESS_IDS 未消費 export

## 検証(BR-6: ローカルを正 — 全 Bolt の builder 実測 exit code、conductor が報告書で裏取り)

- unit(t174 / t132 / t68): 全 Bolt で exit 0
- integration(t48 / t52 / t287 / t291 / t-pi-docs-contract): 全 Bolt で exit 0(Bolt 3 はコミット後再実行も 0)
- 受け入れ grep 述語: FR-1(誤件数語残存 0)/ FR-3(self-* 解説実体 EN/JA 対、15 スコープ全名、H2 10=10)/ FR-5(7 識別子 EN/JA ≥1 + 解説実体、新章 H2 5/5)/ FR-4(凍結注記 ≥1 + 注記のみ diff)/ F-8(H2 5=5)/ F-9(被リンク ≥1)— 全成立
- 対象外面の不変: 全 Bolt で `git status` により packages/ scripts/ tests/ .github/ amadeus/ の無変更を確認
- CI(PR #2302): CI Success = SUCCESS(docs-only のため tests は G-1 どおり SKIPPED — ローカル検証を正とする旨を PR 本文へ記載)

## 残余・申し送り

- #2302(Bolt 1-3 包含)と #2314(Bolt 4)のマージ承認待ち(ユーザー専権)
- `docs/research/upstream-ai-dlc-v2.2.0-…differences.{md,ja.md}` は FR-4 名指しパス外・RE 目録外のため不変(必要なら次回監査で扱う)
- RE 未確定 3 点(core tools +3 不整合ほか)は requirements § 未解決事項どおり持ち越し
