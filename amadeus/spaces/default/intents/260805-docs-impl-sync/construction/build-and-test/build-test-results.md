# Build & Test Results — docs-impl-sync

上流入力(consumes 全数): code-generation-plan.md(BR-6 検証集合の実行)、code-summary.md(配送断面の同定)

検証断面: `eec4f57703982f07974c275d7a086322b42d5c12`(`origin/bolt/docs-sync-freeze-parity` = 全 4 Bolt を含む配送先端。origin/main..HEAD = 13 コミットを実測確認)。実行者: 隔離 worktree の検証 runner(amadeus-quality-agent、2026-08-06)。数値はすべて runner の実出力転記。

## コマンド結果

| # | コマンド | exit | 結果 |
|---|---|---|---|
| 1 | `bun run typecheck` | 0 | エラーなし(dist 生成後 — 生成前は tsconfig.tests.json の dist 参照で TS2307、実行順序起因であり docs 変更由来ではない) |
| 2 | `bun run lint` | 0 | 0 errors(421 warnings / 11 infos は base 持ち越しの advisory、1370 files) |
| 3 | `bun run build` | 0 | 8 ハーネス dist 再生成 + promote:self 成功、追跡ファイル不変 |
| 4 | unit(t174 / t132 / t68) | 0 | 17 pass / 0 fail、30 expect、`Ran 17 tests across 3 files`(宣言 3 path と一致) |
| 5 | integration(t48 / t52 / t287 / t291 / t-pi-docs) | 0 | 31 pass / 0 fail、207 expect、`Ran 31 tests across 5 files`(宣言 5 path と一致、事前 ls 実在確認済み) |
| 6 | `project-matrix.ts check` | 0 | 正常 |
| 7 | `git status --short`(検証後) | 0 | clean(dist は source-only 境界の未追跡生成物) |

## 受け入れ述語(11/11 PASS)

| 述語 | 期待 | 実測 |
|---|---|---|
| 誤件数語・版数残存(ten scopes / Ten named / 10個の名前付き / ≥ 0.28.1) | 0 hit | exit 1(0 hit) |
| FR-3: self-* 解説実体 | EN/JA 対 | 5 ファイル(05 章 EN/JA、17 章 EN/JA、glossary.ja) |
| FR-5: 7 識別子(tla-authoring / tla-evidence / import-closure-guard / autonomy-review / amadeus-intent-completion / harness-registry / amadeus-advisory-choice) | EN/JA 各 ≥1 | 全識別子 EN/JA 両面ヒット(24 章・22 章・19/11 章・12 章) |
| FR-4: 凍結注記 | 冒頭 10 行に ≥1 | `> **Frozen record.**`(3 行目)+ 比較リビジョン pin |
| F-8: live-e2e EN/JA 対 | 実在 + H2 一致 | 両実在、H2 5 = 5 |

## 帰属切り分け(1 件)

`0.28.1` の 2 hit(`docs/guide/harnesses/kimi-code.md:145` / `.ja.md:140`)は「その版で SessionStart 注入が届かなかった」という実測済みの事実記述であり、本 intent の除去対象(陳腐化した版数要件 `≥ 0.28.1`)ではない。`git grep -c "0\.28\.1" origin/main` で未改変 base に同数存在することを確認 — 区間内変更ではない(`cid:build-and-test:bt-20260730-2` の両ツリー比較準拠)。

## FR-6 Issue(起票済み — code-summary.md § FR-6 の実出力ラベル表を正とする)

#2276 / #2277 / #2278 / #2296(+付随 #2279 / #2311)。

## verdict

**READY(無条件)** — 未検証面(lint の base 持ち越し warning 群)は受け入れ基準(FR-1〜6 / NFR-1〜4)の外(`cid:build-and-test:c2-unconditional-ready-boundary`)。マージ承認待ちの PR #2302 / #2314 はユーザー専権として申し送り節に記載(verdict の条件ではない — 配送完了の定義は PR 発行+収束確認まで)。
