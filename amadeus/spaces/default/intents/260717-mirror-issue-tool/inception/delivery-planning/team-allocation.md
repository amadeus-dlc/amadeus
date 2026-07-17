# Team Allocation — amadeus-mirror ツール

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

## 体制(ソロモード)

| 役割 | 担い手 |
|---|---|
| conductor | 本セッション(/amadeus 実行者) |
| builder | amadeus-developer-agent subagent(code-generation は mode: subagent) |
| reviewer | 独立サブエージェント(自己実装の自己レビュー禁止を維持) |
| 承認 | ユーザー(全ゲート+PR マージ) |

## 注記

チームモードの割当規則(agmsg/選挙/2名クロスレビュー)は非適用(operating-modes)。record PR のクロスレビューは独立サブエージェント2レンズで代替(intent-capture Q5 裁定)。
