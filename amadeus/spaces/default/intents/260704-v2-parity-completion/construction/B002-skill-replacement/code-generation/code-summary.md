# Code Summary：B002 skill 置換と整理

## 変更ファイル

| 変更 | 内容 | 対応する要求 |
|---|---|---|
| `skills/amadeus-<x>/`（36 skill 新規） | 上流 37 skill（intent-capture は B001 済み）の適応コピー。stage runner 28、scope 系 4、utility 4（init、replay、session-cost、outcomes-pack） | R003 |
| `skills/amadeus/SKILL.md`（置換） | 上流 `aidlc/SKILL.md`（forwarding loop 版）への置換。question-rendering.md は references/ へ移設。旧 references/ と templates/ は B004 まで残置 | R003 |
| 削除 5 skill | amadeus-learning-review、amadeus-decision-review、amadeus-history-review、amadeus-domain-grilling、amadeus-event-storming（source、昇格先、symlink。provenance 非参照を確認済み） | R004 |
| 昇格 | 37 skill を promote-skill.ts で昇格、symlink 作成 | R003 |
| 検証コードの追随 | amadeus-contracts カタログ（decision-review entry 除去 + 再生成）、promote-skill eval、amadeus-templates eval（削除分除去 + amadeus entry を新入口契約へ更新）、llm-templates eval（event-storming E2E 除去）、package.json（event-storming E2E script 除去）、amadeus-contracts.ts の型注釈 | R004 |
| `.claude/rules/aidlc.md` の symlink 化 | `.agents/rules/aidlc.md` へ実体を移し symlink（wiring 規約準拠。B001 の残課題） | R001 |
| `.gitattributes`（新規） | エンジンが書く audit shard を whitespace 検査対象外に（エンジン無改変契約の帰結） | R001 |

## 適応の型（全 skill 共通）

frontmatter の name 改名、aidlc-* skill 名言及の置換、質問を扱う skill への grilling bridge 段落追加（stage runner 28 + scope 4 + 入口。read-only utility 4 は対象外）。エンジンコマンドパス、stage slug、`/aidlc` エンジン引数、`aidlc-<x>-agent` agent 名は原文のまま。

## 写像確認

上流 38 skill 名 ↔ `skills/amadeus*` が 1 対 1（comm 双方向で差分ゼロ）。写像対象外: 独自 3 skill（grilling、domain-modeling、validator）、B004 まで残置の旧 stage skill 22 個と amadeus-steering。
