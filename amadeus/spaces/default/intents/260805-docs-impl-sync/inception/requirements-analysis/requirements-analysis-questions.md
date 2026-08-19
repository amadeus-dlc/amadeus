# Requirements Analysis — 明確化質問(260805-docs-impl-sync)

上流入力(consumes 全数): intent-statement.md(裁定候補の由来)、business-overview.md(docs 同期の業務境界)、architecture.md(docs 同期構造)、code-structure.md(患部配置)

> 裁定方式: Intent 自律モード full(grant `intent-grant-d7bbea44ff43fae65262e848d5c4d0fc`、allowedInteractionKinds に `question` を含む、ユーザー明示コミット 2026-08-05)。各問は `amadeus-bolt.ts decide-question` の AUTO_DECIDED 経路で確定し、decisionId を回答行の直下に記録する。既決ノルム・intent-statement から一意に導かれる問(Q1/Q4/Q5)は執行に近く、判断が残る問(Q2/Q3)は推奨案+根拠を basis として記録する。

## Q1: 件数語・実体列挙の不一致(クラス A、11 件)の是正方向

RE は「10 scopes」「7 manifests」等の件数語乖離 11 件を検出した。是正方向をどうするか。

- A. すべて実値へ更新する(15、8 等)
- B. 隣接列挙原則に従う — 同一文書内に列挙(表・一覧)が隣接する箇所のみ実値へ更新し、隣接列挙のない散文の件数語は count-free 表現へ置換する
- C. すべて count-free 表現へ置換する
- D. 現状維持(是正しない)
- X. Other (please specify)

[Answer]: B — 隣接列挙原則(cid:functional-design:c3-adjacent-enum-numerals が既定として明文化済み。前回 intent 260727-docs-impl-sync FD の BR-2 裁定の再適用 = 既決ノルムの執行)
自動裁定承認: 2026-08-05T09:20:00Z（AUTO_DECIDED、grant intent-grant-d7bbea44ff43fae65262e848d5c4d0fc、decisionId auto-decision-a8a3bf63206e764d58ec12f0082acb21）

## Q2: `self-*` 4 スコープのユーザーガイドでの扱い(C-1 / F-1)

`self-document` / `self-feature` / `self-fix` / `self-refactor` のユーザー向け解説が docs に存在しない。どう補うか。

- A. `05-scopes-and-depth.md` を 15 スコープの平坦な解説へ書き換える
- B. 一般スコープ(installer-distribution 含む 11)と自己開発 4 スコープを分離して解説する — 05 章は一般スコープ+自己開発スコープへの節/章参照、self-* は専用節または専用章で「Amadeus 自体を開発する場合」として解説
- C. 現状維持(解説を追加しない)
- D. glossary への用語追加のみで済ませる
- X. Other (please specify)

[Answer]: B — 一般と自己開発を分離(根拠: project.md § Scope Overrides が self-* を「Amadeus 自己開発専用」と定義し、`docs/harness-engineering/04-scopes.md:43-45` の命名規約注記も self-* を別枠扱いしている。一般利用者の導線に自己開発スコープを平坦に混ぜない構成が実装・既存文書の流儀に一致 — cid:requirements-analysis:c5 の「既存パターンに合わせる」適用)
自動裁定承認: 2026-08-05T09:20:00Z（AUTO_DECIDED、grant intent-grant-d7bbea44ff43fae65262e848d5c4d0fc）

## Q3: 凍結記録(`docs/research/upstream-sync/**`、`docs/amadeus-files.md`)の扱い(A-10 / D-5 / D-6 / F-10)

調査時点で凍結されたレポート群と、鮮度宣言付きのファイル目録が observed から乖離している。どうするか。

- A. すべて現況(observed)へ更新する
- B. `docs/research/upstream-sync/**` は凍結スナップショットである旨の明示を強化(ヘッダ注記)して内容不変、`docs/amadeus-files.md` は現況へ更新し `docs/README.md` からリンクする(F-10 同時解消)
- C. すべて凍結明示の強化のみ(内容はどちらも不変)
- D. 何もしない
- X. Other (please specify)

[Answer]: B — 凍結と現況更新の分離(根拠: research レポートは調査時点の歴史記録であり RE 自身が「Low(凍結レポート)」と評価。一方 amadeus-files.md は目録 = 現況参照文書であり凍結に意味がない(D-6 Medium)。歴史記録は改変しない原則は codekb 履歴節の c3-relabel 運用と同型)
自動裁定承認: 2026-08-05T09:20:00Z（AUTO_DECIDED、grant intent-grant-d7bbea44ff43fae65262e848d5c4d0fc）

## Q4: 欠落文書候補 10 件(クラス F)のうち本 intent で補う範囲

- A. 全 10 件を本 intent で補う(F-2〜F-7 のツール群は規模に応じて専用章または既存章への節追加で対応)
- B. 利用者影響の大きい F-1 / F-8 / F-9 / F-10 のみ補い、ツール群(F-2〜F-7)は次回へ送る
- C. F-1 のみ補う
- D. 補わない(乖離修正のみ)
- X. Other (please specify)

[Answer]: A — 全 10 件(根拠: intent-statement 成功指標 4「乖離監査で判明した文書欠落が新規文書として補われている」= intent-capture Q4=B の既決。範囲を絞る選択は既決スコープの無申告縮小(cid:build-and-test:no-silent-scope-narrowing)に該当するため不可 — 執行)
自動裁定承認: 2026-08-05T09:20:00Z（AUTO_DECIDED、grant intent-grant-d7bbea44ff43fae65262e848d5c4d0fc）

## Q5: docs 検証ガードの構造的盲点(G-1: docs-only PR の CI skip、G-2: glossary 検査の未配線)の扱い

- A. 本 intent で CI/スクリプトを修正する
- B. Issue-first で起票のみ行い、本 intent は docs 変更に専念する(検証はローカル実行を正とする)
- C. 無視する
- X. Other (please specify)

[Answer]: B — Issue 起票のみ(根拠: intent-statement「実装コードの変更は行わない(docs で発見した実装バグは Issue 起票)」の既決 — 執行。G-1 により本 intent の検証はローカル実行を正とすることも RE 記録済み)
自動裁定承認: 2026-08-05T09:20:00Z（AUTO_DECIDED、grant intent-grant-d7bbea44ff43fae65262e848d5c4d0fc）

## 裁定の記録

全 5 問を Intent 自律モード full(grant `intent-grant-d7bbea44ff43fae65262e848d5c4d0fc`、ユーザー明示コミット = INTENT_AUTONOMY_TRANSACTION_COMMITTED)の `decide-question` 経路で確定した。decider はいずれも `agent-recommendation`(solo-election 非発動の degraded 経路として audit に明記、reviewState: unreviewed)。転記元は各コマンドの実出力 JSON。

| 問 | 採用 | decisionId |
|---|---|---|
| Q1 | B | `auto-decision-a8a3bf63206e764d58ec12f0082acb21` |
| Q2 | B | `auto-decision-6f58c69cb2736b200880bb22e66db563` |
| Q3 | B | `auto-decision-1db334f061474952266ac3b25ec7da9c` |
| Q4 | A | `auto-decision-8cdacbc8165bfd41dad36a1f19f19bc0` |
| Q5 | B | `auto-decision-42461f10172563cb3ac0475d26df0b0f` |

自動裁定承認: 2026-08-05T09:20:00Z（AUTO_DECIDED 5 件、grant intent-grant-d7bbea44ff43fae65262e848d5c4d0fc）
