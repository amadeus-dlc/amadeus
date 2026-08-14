# Requirements Analysis — 質問(260814-unit-failure-autoelectio)

Issue #2976 とクロスレビュー2名(CONFIRMED_WITH_REFINEMENTS)、RE 成果物で大半の要件は確定済み。既決事項は再質問しない(cid:requirements-analysis:c5)。実装を阻む要件欠落は以下の1点のみ。

## Q1: engine が auto 分岐で emit する directive の形状

Issue 期待結果 2-4 は「auto 設定時に election を open し、ordinary ask を返さない」ことを要求するが、election の実行主体形状が未決である。engine は subagent を spawn できず(選挙の blind 配布・2 voter spawn は conductor の契約 — `skills/amadeus-election/SKILL.md:28`)、`amadeus-election.ts` を import していない(RE 実測: A2/B 述語 exit 1)。完了条件 6 は「auto 設定下で engine の directive kind が ask でない」ことをテストで固定することを要求する(reviewer-2 未解決3)。

A. engine が階層 config を読み、auto なら**新種 directive**(election 委任指示 + definition 材料を carry)を emit する。conductor が `open --trigger auto --file` を実行し、CLI の decline envelope(`opened: null`)なら protocol branch 2 として従来 prompt を提示する。ruling は既存 `report --user-input retry|skip|abort` 経路で commit する
B. 既存 `ask` directive に auto-election メタフィールドを追加し、conductor がメタの有無で prompt 提示/選挙付託を分岐する(kind は "ask" のまま)
C. engine は無変更とし、conductor 手順(SKILL.md/conductor.md)のみで ask を受けて選挙へ回す
D. engine が election CLI をプロセス内 import で直接 open し、open 済み election への追従だけを conductor に指示する
X. Other (please specify)

[Answer]: A

**裁定根拠(semi 梯子 AUTO_DECIDED `auto-decision-285d7a74a6a8940f8aa19ee6ddbaded5`、decider=agent-recommendation、solo-election result 不在の loud degradation `native-solo-election-result-unavailable` を記録済み)**: A を採用。protocol branch 1 は「prompt を提示しない」を規定しており、`ask` の契約(human answer のための停止 — codex SKILL.md:65)と両立しない B は意味論が濁る。C は完了条件 6(engine directive kind の述語テスト)を構造的に満たせず、t369 型の検証劇場(テキストのみ緑)を再生産する。D は election 指令ループ(配布・投票・tally)が conductor 所有である以上 open だけ engine に移しても責務が分断され、subagent spawn 不能な engine では完遂できない。A は CLI envelope を最終判別子とする reviewer-2 精緻化(c)とも一致する。
