# Requirements Analysis — 明確化質問(#736 / delegate-answer-consume)

> 起草: claude-engineer-1(conductor、amadeus-product-agent ペルソナ)。回答経路: election-protocol。
> 前提(RE 実測、post-#685 の現行コード): 消費側 approve/reject は `humanActedSinceGate(pd, verb)`(state.ts:1456)へ verb-scoped 化済みだが、`QUESTION_ANSWERED` は `GATE_RESOLUTION_EVENTS`(lib.ts:1506)の **verb 非依存の resolution** として境界を進めるため、delegate 着地後に answer を打つと delegate が消費され approve が拒否される — **#736 は #685 実装後も残存**(in-process 再現済み)。
> 既決事項は問わない: 落ちる実証必須(Mandated)、t112(偽造拒否)・t188:325-348(one-answer-per-human-turn)の非退行(Issue AC)、dist 同期(core 正本 + package.ts + promote:self 同一コミット)。

## Q1. 修正方式(境界セマンティクスの変更単位)

A. **種別スコープ消費**: delegated provenance(DELEGATED_APPROVAL/REJECTION)は **GATE_APPROVED / GATE_REJECTED のみが消費**し、QUESTION_ANSWERED は **HUMAN_TURN のみを消費**する(発行意図と消費先の一致。ローカル人間運用の意味論は不変 — QA は引き続き人間ターンを消費し t188 を保つ)
B. verb 指定時に QUESTION_ANSWERED を境界集合から除外(approve 述語だけ QA を無視。ローカル人間運用でも「同一 HUMAN_TURN で answer+approve」が通るようになり、既存の同一ターンカスケード防止の意味論が変わる)
C. QUESTION_ANSWERED を GATE_RESOLUTION_EVENTS から全除去(t188 の one-answer-per-human-turn が壊れる — answer 側に別述語の新設が必要でスコープ拡大)
D. コード変更なし・運用明文化のみ(answer→ゲート報告→delegate の順序をノルム化。罠は残置)
X. Other (please specify)

[Answer]:

## Q2. delegated provenance と answer の関係(Q1=A の粒度。エージェントチーム運用では選挙回答の記録に delegate を根拠とする必要がある — conductor セッションに HUMAN_TURN は無い)

A. **1 delegate = 1 answer + 1 gate**(トラック別の consume-once: QA は「delegate の answer 枠」を消費し、GATE_* は「gate 枠」を消費する。1枚の delegate で無制限に answer を積めない — anti-autopilot の維持)
B. delegate は QA に一切消費されない(gate のみが消費。1枚で複数 answer が通る — 選挙回答が複数ファイルに及ぶ場合に便利だが、autopilot インタビューの余地)
C. answer は delegate を根拠にできない(conductor の選挙回答記録が構造的に不可能になる — 現運用と矛盾するため参考選択肢)
X. Other (please specify)

[Answer]:

## Q3. 修正範囲(消費側のみか、発行側 grounding も含むか)

A. **消費側(state.ts:1456 の述語+lib.ts の境界ロジック)のみ**修正。発行側 grounding(delegate-approval :1625 / delegate-rejection :1719 の verb 無し呼び出し)は実測事故が未発生のため現状維持し、必要になったら別 Issue(surgical 原則)
B. 発行側 grounding も同一 PR で同じセマンティクスへ揃える(leader が自 ledger で answer を打つと発行が拒否される同型リスクの先回り。ただし実測事故なし=推測駆動の変更)
X. Other (please specify)

[Answer]:
