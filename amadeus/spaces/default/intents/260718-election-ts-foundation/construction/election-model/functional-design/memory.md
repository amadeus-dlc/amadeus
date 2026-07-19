## Interpretations
- 2026-07-19T03:01:20Z — 二重票検査は Ballot.parse(単票5クラス)から分離した純関数 checkDuplicate として C1 に置く精密化(fs 非依存維持、契約不変 — component-methods『概形』の分担精密化であり逸脱ではない旨を entities に明記)

## Deviations
- 2026-07-19T03:01:20Z — FD 起草中に FR-4b の契約ギャップ2点(GoA 5 未写像・定足数未定義)を検知し実装前停止相当で E-ETF-FD へ — ユーザー直接裁定 Q1=A(discussion-needed 追加=要件変更の正準(4)承認込み)/ Q2=A(有効票0の最小定義)。requirements.md FR-4b と FD 3点へ同一変更で反映(プレースホルダ残 0 を grep 実測、残存1件は audit 履歴行=不変が正)

## Tradeoffs
- 2026-07-19T03:10:15Z — reviewer iteration 1 NOT-READY(Major 3: Bolt 切り出しの bolt-plan 矛盾 / Ballot amend 型未定義 / checkDuplicate の C2→C1 境界変更を無委任で主張)→ 全5件是正(bolt-plan を正・Ballot union+BallotRef 明示・C2 所有へ復帰撤回)→ iteration 2 READY。境界変更の撤回は implementation-deviation-election の教訓どおり『精密化と境界変更の区別』が要点

## Open questions
