# Performance Requirements — U1 tie-choice-resolution

上流入力(consumes 全数): requirements.md、business-logic-model.md、business-rules.md、technology-stack.md(brownfield 条件付き consumes — codekb) — 性能要求は business-logic-model.md の受理フロー(1入力1 parse)と business-rules.md BR-1 の regex 形から導出し、実行基盤は technology-stack.md の Bun/TypeScript 前提、上限根拠は requirements.md の対象データ規模(NFR-3 の store 全数)に依拠。

## 要求

| # | 要求 | 根拠 |
| --- | --- | --- |
| P-1 | parseChoiceResolution は O(入力長) — regex `/^choice:(0|[1-9][0-9]*)$/` は nested quantifier なし・アンカー付きの線形形。regex-linearity-untrusted-input の適用判定: 本 regex は**固定様式の短トークン照合(SHA 形・slug 形等と同類)**であり、cid が明文で義務化対象外とする類型に該当 — 100KB 級実測は不要(除外軸はこの1点のみ。CLI 引数=ユーザー入力自体は cid の対象カテゴリに含まれる点に注意 — 「信頼側入力だから除外」という一般則は存在しない)。形状の線形性は設計時確認済み(本行がその記録) | BR-1、team.md regex-linearity cid |
| P-2 | choices 実在照合は O(choices 数) の some — 実選挙の choices は 2〜5件(本 worktree store 51本の機械集計 `for f in elections/*/election.json; do python3 -c len(choices); done \| sort \| uniq -c` → 2件×38 / 3件×11 / 4件×1 / 5件×1、最大 = E-CCCRA の5件)で上限問題なし。性能テストは追加しない(強制メカニズム不在の数値目標を発明しない — constants-from-code) | BR-1、NFR 系ノルム |
| P-3 | render/trail の追加コストは既存 map 1回の範囲内(生成式無変更) | business-logic-model.md render フロー |

## 検証対応

P-1 の線形性は設計時の形状確認で完結(実測義務なし — 適用判定を P-1 に記録)。P-2/P-3 は専用性能テストを追加しない判断そのものが要求(発明数値の排除)。
