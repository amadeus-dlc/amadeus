# requirements-analysis memory (260810-plugin-manifest-resoluti)

## Interpretations

- 2026-08-10T11:10:00Z — Q1〜Q5 は autonomy=full グラント(intent-grant-3f36d239bbdc1e61e34fe015614c8127、allowedInteractionKinds に question を含む)の記録済み宣言として自動裁定した。各回答は Issue #2823 完了条件 + RE scan PROVEN 事実から一意に導くもので、cid:requirements-analysis:c1-xrev-verdict-not-ruling-authority に従う
- 2026-08-10T11:10:00Z — 修正軸は「読取側修正」(Q1-A)に確定。#2790 の配送設計(拡張子限定・plugin.json 非配送)を維持しつつ、読取規約を配送規約へ整合させる方向が両規約を両立させる唯一の軸と判断

## Deviations

- 2026-08-10T11:10:00Z — guided/self-guided のモード提示を省略し、グラント自動裁定で問票を一括記入した。問票にはグラント ID と根拠(cid)を provenance として明記

## Tradeoffs

- 2026-08-10T11:10:00Z — loud 化は可観測化のみ(Q2-A)とし fail-closed 化を選ばなかった。plugin 未導入環境の破壊を避けるため。t445:155-160 の pin は「無音」でなく「非発火」を本質として書き直す方針
- 2026-08-10T11:10:00Z — #2267 は別 Issue 維持・着地時にユーザーへ close 提案(Q4-A)とした。Issue 操作はユーザー決定事項(cid:requirements-analysis:issue-selection-user-decides)のため

## Open questions

- 2026-08-10T11:10:00Z — marketplace 経路の staging 供給機序は repo 内に証拠なし(CLAUDE_PLUGIN_ROOT 0 件)。FR-1 の候補探索は機能するが供給欠損は別問題
- 2026-08-10T11:10:00Z — reviewer FOLLOW-UP: FR-2 の argv path 様要素とフラグの区別規則を1行明記する案。code-generation で「path separator を含む positional 要素」規則を採用予定
