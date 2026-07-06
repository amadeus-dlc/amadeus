# Code Summary — u001-lifecycle-i18n（260706-lifecycle-i18n）

上流入力: [code-generation-plan.md](code-generation-plan.md)、[translation-log.md](translation-log.md)

## 変更一覧

| ファイル | 変更 |
|---|---|
| docs/amadeus/lifecycle/{overview,ideation,inception,construction,scopes,state}.md | 英語正へ全面書き直し（節構成・表構造・機械可読ラベルは日本語版と 1:1） |
| docs/amadeus/lifecycle/{overview,ideation,inception,construction,scopes,state}.ja.md | 新規（日本語本文は無改変 + H1 対訳併記 + リンク再指向 = 機械照合済み） |
| docs/amadeus/{steering,aidlc-v2-operation-phase-boundary,aidlc-v2-build-and-test-failure-handling,aidlc-v2-sensor-learn-mapping}.ja.md | lifecycle への逆方向リンク 5 箇所を ja→ja へ更新（FR-2.4 の最小追加） |

## FR カバレッジ

| Requirement | 状態 |
|---|---|
| FR-1.1〜1.4（対訳ペア化、無改変、ラベル同一、H1 のみ対訳併記） | 反映済み（ja 無改変は git diff 機械照合） |
| FR-2.1〜2.4（リンク規約、逆方向 ja→ja） | 反映済み（FR-4.3 照合で破損 0） |
| FR-3（陳腐化の外科修正） | 発動なし（subagent 3+3 体の報告と conductor 確認で陳腐化 0 件。state.md の #464 後続言及は実在する未完了作業への言及と判断し忠実対訳） |
| FR-4.1(a)(b)（執筆時突き合わせ、§12a） | (a) 完了（#541 検証 ×6 文書）。(b) 実施中 |
| FR-4.2（validator + test:all） | build-and-test で実行・記録予定 |
| FR-4.3（リンク機械照合） | 完了（破損 0、流入 16 ファイル・30 箇所無破壊） |

## 発見事項

- subagent 並行翻訳では表記ゆれが 3 種発生した（v2 Counterpart の大小、memory 行の句形、Mode 欄）。conductor 統一パスで正規化し、新規訳語 6 件とともに対訳記録へ登録した。glossary を事前固定しても、表ヘッダ・定型句レベルのゆれは残るため、統一パスは委譲翻訳の必須工程である。
- intents.json の autostash pop 衝突（#563 追従時）を subagent の git status 報告が検出した。union 解消済み。根本原因と再発防止は code-generation/memory.md に記録。
