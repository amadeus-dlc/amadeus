# Phase Check — Construction（260706-readme-refresh）

対象 phase: Construction（refactor scope、実行ステージは functional-design、code-generation、build-and-test）
検査日: 2026-07-06

## トレーサビリティ

| 連鎖 | 状態 |
|---|---|
| requirements.md FR-1〜FR-6（Issue #535 の乖離 6 系統） → functional-design（編集計画表・照合台帳） → README.md / README.ja.md の該当節の実編集 | Fully traced |
| requirements.md FR-7（実測追加乖離 6 件 + スコープ外判断） → 編集計画表の該当行 → 実編集（amadeus-steering / validate:all / intents.json / skill-forge / エンジン駆動表現 / language-policy リンク） | Fully traced |
| requirements.md FR-8（ja 同期） → BR-2 → README.ja.md の同一構成対訳 + Extension guide 行の同期漏れ解消 + .ja.md 優先リンク（Cross-linking rules） | Fully traced |
| NFR-1（リンク機械検査） → BR-5 → checked=46 broken=0（修正前ベースライン examples/ 4 件検出、検出力確認済み） | Fully traced |
| gate 付帯条件（PR #542 merge 後の再照合） → 33c40271 へ rebase → amadeus-compose の追加（設計・成果物・README に記録） | Fully traced |
| C-2（validator + test:all） → build-and-test → build-test-results.md（validator pass、test:all exit 0） | Fully traced |

Orphan の成果物はない。

## カバレッジ

- 実行 3 ステージ（functional-design、code-generation、build-and-test）とも成果物・検証結果を持つ。functional-design と code-generation は reviewer（amadeus-architecture-reviewer-agent）の iteration 2 READY を持つ。
- Issue #535 の受け入れ条件 3 件（全記載一致 / 実在しない参照 0 件 + 機械検査の PR 記載 / インストーラ整合）は build-and-test-summary.md の対応表で担保。

## 整合性検査

- 変更対象は README.md / README.ja.md の 2 ファイルに閉じ、C-1 逸脱なし（reviewer が git status で確認）。
- intents.json の rebase 衝突は union（upstream 保持 + 自 entry 末尾）で解消し、標準検証で整合を確認した（team.md「共有成果物の統合」）。
- 退役語 grep 0 件、リンク機械検査 broken 0 件。

## 警告

- なし

## 人間承認

- [x] functional-design の gate を人間が承認した（承認経路: 人間の包括委任 2026-07-06 04:07 JST → leader 内容確認 → engineer5、中継承認定型文 2026-07-06T01:48:20Z 受信、DECISION_RECORDED 転記済み。付帯条件 = #542 後の再照合は履行済み）。
- [x] code-generation の gate を人間が承認した（同経路、中継承認定型文 2026-07-06T02:11:01Z 受信、DECISION_RECORDED 転記済み）。
- [ ] build-and-test の gate（本 phase-check 作成時点で承認待ち）。
