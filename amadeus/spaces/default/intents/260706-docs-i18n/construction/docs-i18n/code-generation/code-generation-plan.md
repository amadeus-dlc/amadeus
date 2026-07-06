# Code Generation Plan — docs-i18n

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)（編集計画の正）、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 実施計画と実施結果

| # | 作業 | 実施方法 | 結果 |
|---|---|---|---|
| 1 | B001: steering.md 英語化 + steering.ja.md 併置 + 参照元更新（README.ja.md、extension-guide.ja.md） | subagent（amadeus-developer-agent）→ conductor が #541 純正性検証 | 完了（commit「docs: steering.md を英語化し steering.ja.md を併置（#521）」） |
| 2 | B001 で発見した元文書の陳腐化（amadeus-steering / intents.md 索引 / <dirName>.md）の扱い | ピア協議（全メンバー同報、5 回答全会一致で案 B = 言及行限定の外科修正・英日同時適用） | 完了（B001 commit に含む。修正一覧は code-summary.md） |
| 3 | B002: aidlc-v2 系 5 文書の英語化 + .ja.md 併置 | subagent → conductor 純正性検証 → ファイル単位 5 コミット（FR-2.2） | 完了（5 commits） |
| 4 | B003: skill-language-policy + rollout-plan の英語化 + 参照元更新 | subagent → conductor 純正性検証 → 2 コミット | 完了（rollout-plan には旧 skill 名が計画時点のものである旨の注記を英日追加） |
| 5 | NFR-1: reviewer（Codex / GPT-5.5）初見読者レビュー | B002 完了後に依頼（B003 と並行）。High 3 + Low 3 の所見 → 全件対応 | 完了（commit「docs: 初見読者レビュー所見（reviewer / GPT-5.5）を反映」。詳細は code-summary.md） |
| 6 | PR #559 merge への追従 | leader へ一報 → origin/main（29f3122c）へ rebase → codekb timestamp / intents.json を時系列 union で解消 | 完了 |

## 検証（NFR-3、C-2 に向けて）

- 全 8 英語版の日本語残存 0 件、全 8 対の H2 数一致、ja 版の移設忠実性（差分 = 意図した .ja.md リンク差し替えのみ）を確認済み。
- リンク機械検査: 対象 16 ファイル + 参照元 4 ファイルで checked=106 broken=0（scratchpad の一時スクリプト、コミットしない）。
- validator + `npm run test:all` は build-and-test 相当の検証で実行し記録する。
