# Application Design Memory

## Interpretations

- 2026-08-04T11:44:29Z — 元のIssue、承認済みScope、Requirementsに記載済みの設計境界は質問対象にしない; ユーザー指示に従い、正本に答えがなく設計結果を変える事項だけを確認する。
- 2026-08-04T11:45:30Z — Kiroのconnected判定はACP/TUIごとの証拠条件で行う; 一方のlive greenを他方へ継承せず、不成立面はregistryと後続Issueで閉じる。

## Deviations

## Tradeoffs

- 2026-08-04T11:45:30Z — legacy journeyとの二重経路や全面書き直しではなく、既存transport mechanicsを再利用して共通lifecycleへ一本化する; 回帰リスクを抑えつつ全live pathへ同じ安全policyを適用するため。

## Open questions

- 2026-08-04T11:45:30Z — Kiro ACP/TUIのsafe auth/config bindingとcleanup closureが実機で成立するか; ADR-03のprobe条件に従い実装前に確定する。
- 2026-08-04T11:49:00Z — retry可能な負荷起因エラーの閉じた分類と、再試行間のresource解放・ledger記録をどう固定するか; Architecture ReviewerのFOLLOW-UPとしてFunctional/NFR Designへ渡す。
- 2026-08-04T11:49:00Z — 実行失敗とcleanup失敗が同時発生した場合のprimary/secondary errorとmatrix投影をどう固定するか; Architecture ReviewerのFOLLOW-UPとしてFunctional/NFR Designへ渡す。
