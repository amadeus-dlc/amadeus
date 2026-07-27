# Code Summary — docs-drift-repair (code-generation)

上流入力(consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, requirements.md (注: nfr-design / infrastructure-design 系 consumes は amadeus-document スコープの SKIP により設計上不在 — degrade 構成の documented fallback)

依拠箇所: 実施内容は code-generation-plan.md の Step 1-5、検出・閉包の実体は drift-ledger.md、修正規則は business-rules.md BR-1〜BR-6 に従った。

## 実施結果

| 項目 | 実測値 |
|---|---|
| 乖離検出(監査、ref bafeccca8) | 98件(semantic 48 / enum-missing 23 / count-stale 18 / pair-drift 6 / pair-missing 2 / impl-bug 1) |
| 修正 PR | 3本 — [#1576](https://github.com/amadeus-dlc/amadeus/pull/1576)(README+件数系 22件)/ [#1577](https://github.com/amadeus-dlc/amadeus/pull/1577)(EN/JA ペア・対訳新規 14件)/ [#1578](https://github.com/amadeus-dlc/amadeus/pull/1578)(廃止パス・semantic 残余 61件) |
| Issue 起票 | [#1575](https://github.com/amadeus-dlc/amadeus/issues/1575)(impl-bug D-098 — promote-self の同名 export 値衝突。実装は変更せず) |
| 目録閉包 | 98/98 行が処置済み(未処置 0 — 機械検査で確認) |
| CI | 3 PR とも CI Success = pass、mergeable = MERGEABLE/CLEAN(gh pr checks / pr view 実測) |

## 特記事項

- **クラスタ B(19-plugins)は着手時点で解消済み**: PR #1568 が先行着地しており、監査で「是正の模範形」と確定。本 intent の修正対象から除外(要件 FR-2 の受け入れ基準は main 上で既に充足)
- **PR-1 は #1574(バージョン列追加)との実テキスト衝突を rebase 解消**: 新表形式(Version 列)を採用して Kimi 行を追記、JA 表は EN と同順化(D-095 閉包)。マーカー検査(3語彙+diff3)0 件、解消後 CI 再 green。Version 列の構造は本 intent の設計変更ではなく **main 側 #1574 の既決変更を base-advance-regrounding(business-logic-model.md 段1)として採用**したもの — 本 PR の寄与は既存構造への Kimi 行追記(FR-1a の行内容を BR-3 転記で充足)と JA の同順同期(BR-4)に限る
- **クラスタ→PR 配分**(domain-entities.md エンティティ3との対応): PR #1576 = クラスタ A(README)+件数・列挙系 22件 / PR #1577 = クラスタ D の一部+E(対訳新規)+pair 系 14件 / PR #1578 = クラスタ C(hook EN/JA)+D 残余+FR-6 検出の semantic 61件 / Issue #1575 = impl-bug 1件。クラスタ B は #1568 先行解消につき配分なし。22+14+61+1 = 98(機械検算一致)
- 実装コード(packages/、scripts/、.claude/)の変更 0(NFR-2 遵守 — `git diff --name-only` が docs/ と README*.md のみであることを3ブランチで確認)
- 並行 builder 3体の worktree 分離実装。担当交差1件(docs/README.ja.md — conductor のプロンプト転記ミス起因)は両者同一ハンクを実測確認のうえ PR-3 から除外して解消

## 未完(build-and-test へ引き継ぎ)

- PR マージは人間承認待ち(no-AI-merge)。マージ後の受け入れ基準 grep 再実測(main 断面)と乖離目録の最終閉包確認は build-and-test で行う
- 検証済み面 / 未検証面(cid:verdict-names-unverified-facets): PR 単位の CI green・受け入れ基準 grep は検証済み。3 PR 相互のマージ順序による衝突(特に PR-2 と PR-3 は近接ファイル群)は未検証 — 各マージ後の update-branch で吸収する
