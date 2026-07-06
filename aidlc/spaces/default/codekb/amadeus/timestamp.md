# 解析記録：amadeus

- 解析時刻: 2026-07-05T12:25:00Z
- 対象コミット: 3049eadf（origin/main）
- 解析方式: focused manual re-scan（Maintainer 指示による全面更新。2026-07-03 スナップショットを置き換える）

## 更新履歴

- 2026-07-03T18:13:09Z: 初回解析（対象コミット 42f3caee）。
- 2026-07-05T12:00:00Z: 廃止機構（intents.md 索引、IndexGenerate.ts）の記述を部分補正（PR #495）。
- 2026-07-05T12:25:00Z: エンジン駆動化・skill 体制・退役機構を反映した全面再解析（PR #496）。
- 2026-07-05T23:25:37Z: 3049eadf..616d063e の差分駆動増分更新（Intent `260705-persist-cid-metamain`。詳細は reverse-engineering-timestamp.md。engineer1 の #428 側並行更新 503a7aa9 と内容統合済み）。
- 2026-07-06T00:25:00Z: 616d063e..2a0a784b の差分駆動増分更新（Intent `260706-docs-lang-guide`。PR #531 = #504/#507 のエンジン変更を反映: eval 28→29、cid marker 新形式、import.meta.main ガード。詳細は reverse-engineering-timestamp.md）。
- 2026-07-06T01:20:00Z: 2a0a784b..7829d99a の差分駆動増分更新（Intent `260706-readme-refresh`。PR #536 は docs-only のため codekb 9 docs への影響なし。詳細は reverse-engineering-timestamp.md）。
