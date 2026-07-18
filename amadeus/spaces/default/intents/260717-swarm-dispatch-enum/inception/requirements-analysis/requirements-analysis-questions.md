# Requirements Analysis — 明確化質問(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `intent-statement.md`、`scope-document.md`、`business-overview.md`、`architecture.md`、`code-structure.md`、`team-practices.md`。

## 判定サマリ(E-OC1 3段順序)

判定: Q1 以外の全論点を選挙不要とする。conductor e2 が 2026-07-17T23:50Z 頃に leader へ申告し(product-lead レビュー Minor #2 指摘後の事後補正)、leader が 2026-07-17T23:56:43Z に承認した(agmsg 出典)。

既決照合の結果、真に未決の判断は Q1 の 1 問のみ。照合面: `intent-statement.md` の三値契約・成功指標、`scope-document.md` の S-01〜S-09/Won't、constraint-register C-01〜C-19、`business-overview.md`/`architecture.md` が示す repo 全体像と swarm seam(区間無変更)、`code-structure.md` の harness 表層構成(opencode/cursor の SKILL 不在は本構成の実測差分)、`team-practices.md` の Testing Posture(検証要件の前提)。C-01〜C-12(確定制約)・C-15(証拠限界の開示)・C-16(機械検証境界の存在要求 — 実現形は design 委任)・C-17(wave 許容)・C-18(retry identity は FD 前契約化)・C-19(Kiro 影響 = scope S-05 で解決)は既決として requirements へ直接反映し、質問を重複再演しない(intent-capture:c1)。C-13/C-14 は質問ではなく live probe の実施(ブロッカー運用)として扱う。

Q1 は選挙対象(leader 配信)。裁定受領後に [Answer] を記入する(election-answer-after-ruling)。

## Q1: dispatch 指示を持たないハーネス(opencode / cursor)の三値契約における扱い

RE 実測(re-scans/260717-swarm-dispatch-enum.md): opencode / cursor の harness 源には skills/amadeus/SKILL.md が存在せず、invoke-swarm dispatch 指示を持たない。dist/opencode・dist/cursor には amadeus-swarm.ts(ツールコピー)と audit-format.md のみが配布される。scope-document の In Scope は S-03(Claude)/ S-04(Codex)/ S-05(Kiro 系)のみを列挙し、opencode / cursor の consumer 同期は明記されていない。

A. 契約対象外とする — dispatch 指示が存在しないため decision table の consumer に含めず、S-09(generated-asset parity)の既存生成経路でツールコピー・audit 語彙のみ同期する。requirements の Out of scope に明記
B. S-05 相当の consumer 同期を opencode / cursor にも追加する — In Scope の拡大となるため Change Control により Intent owner(ユーザー)の再承認が必要
C. requirements では A とし、docs(S-08)に「opencode / cursor は dispatch 指示を持たないため env 値の影響を受けない」旨の1行言及のみ追加する
X. Other (please specify)

[Answer]: C — 契約対象外とし、S-09 の生成物同期に加えて docs へ1行言及のみ追加する(E-SDE-RA 裁定、開票 2026-07-17T23:27:58Z)。
裁定: E-SDE-RA 2026-07-17T23:27:58Z 開票(採用 C、開票時 2/3: e3 GoA1 / e4 GoA2、e1 後着は到着次第記録)。
留保転記(GoA 2 — e4、必須反映): docs 言及は enum 変更で更新される既存 `docs/harness-engineering/08-construction-and-swarm.md` 節への1行追記に限定し、新規ページ・新規節は作らない。
e3 根拠: dist に tool コピー配布+dispatch 指示非配布の非対称による AMADEUS_USE_SWARM 無音 no-op ギャップを docs 1行で封じる。(いずれも agmsg 出典: leader 開票配信 23:27:58Z)
後着転記(23:28:23Z): e1 後着票 = A・GoA 2(C 受容度 6)、裁定 C 不変。e1 留保(必須反映): Out of scope に『SKILL 追加時に三値契約へ追随する』将来条件を1行残す — requirements.md Out of scope 節へ転記済み。最終 GoA[E-SDE-RA]: C 1x1 2x1 + A 2x1
