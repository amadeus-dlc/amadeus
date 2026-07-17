# Requirements Analysis — 明確化質問(swarm-dispatch-enum / Issue #1157)

## 判定サマリ(E-OC1 3段順序)

既決照合の結果、真に未決の判断は Q1 の 1 問のみ。C-01〜C-12(確定制約)・C-15(証拠限界の開示)・C-16(機械検証境界の存在要求 — 実現形は design 委任)・C-17(wave 許容)・C-18(retry identity は FD 前契約化)・C-19(Kiro 影響 = scope S-05 で解決)は既決として requirements へ直接反映し、質問を重複再演しない(intent-capture:c1)。C-13/C-14 は質問ではなく live probe の実施(ブロッカー運用)として扱う。

Q1 は選挙対象(leader 配信)。裁定受領後に [Answer] を記入する(election-answer-after-ruling)。

## Q1: dispatch 指示を持たないハーネス(opencode / cursor)の三値契約における扱い

RE 実測(re-scans/260717-swarm-dispatch-enum.md): opencode / cursor の harness 源には skills/amadeus/SKILL.md が存在せず、invoke-swarm dispatch 指示を持たない。dist/opencode・dist/cursor には amadeus-swarm.ts(ツールコピー)と audit-format.md のみが配布される。scope-document の In Scope は S-03(Claude)/ S-04(Codex)/ S-05(Kiro 系)のみを列挙し、opencode / cursor の consumer 同期は明記されていない。

A. 契約対象外とする — dispatch 指示が存在しないため decision table の consumer に含めず、S-09(generated-asset parity)の既存生成経路でツールコピー・audit 語彙のみ同期する。requirements の Out of scope に明記
B. S-05 相当の consumer 同期を opencode / cursor にも追加する — In Scope の拡大となるため Change Control により Intent owner(ユーザー)の再承認が必要
C. requirements では A とし、docs(S-08)に「opencode / cursor は dispatch 指示を持たないため env 値の影響を受けない」旨の1行言及のみ追加する
X. Other (please specify)

[Answer]:
