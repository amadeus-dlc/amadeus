# Reliability Requirements — solo-election-surface (U2)

上流入力(consumes 全数): business-logic-model.md(ソロ手順・降格・ノルム改定の論理)、business-rules.md(BR-U2-1〜8 の検証列)、requirements.md(FR-02/04/08〜13・NFR-01〜03 の正本)、technology-stack.md(SKILL/dist 投影の実行環境)。

## 信頼性要件

| ID | 要件 | 合否基準 | 出典 |
|---|---|---|---|
| U2-REL-01 | 票未着の回復手順(再spawn 1回→エスカレーション)と選挙の collecting 保存が SKILL 転送節に明記され、無限リトライ・無音放置の経路がない | 文言 grep(BR-U2-3)+手順に上限値「1回」の明記 | requirements.md FR-04、business-logic-model.md |
| U2-REL-02 | resume 不能時の降格(新規 spawn+同一 voter 名+record 記録)が loud に規定される | 文言 grep(BR-U2-4) | requirements.md FR-08、ADR-4 |
| U2-REL-03 | spawn 不能環境の降格告知(1行・loud)が起動節に明記され、無音降格経路がない | 文言 grep(BR-U2-6)+不開設採用の申告文実在 | requirements.md FR-10 |
| U2-REL-04 | team.md 改定が org.md と矛盾しない加算であること(admission 突き合わせの記録) | code-generation での照合記録(BR-U2-7)— 照合対象は team.md「共通の品質契約」節のチームモード限定宣言 | requirements.md FR-12 |

## 障害時の挙動境界

U2 の全異常系(未着・resume 不能・spawn 不能)は「人間へのエスカレーション」に収束し、自動回復の新機構を持たない(要求外のフォールバック禁止 — org.md Forbidden)。
