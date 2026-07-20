# Election Record — E-GSFRA1

- question: 260720-goa-sparse-family(#1254)RA Q1: #1254 の対応方式はどれか?(C-1)

実測コンテキスト(中立事実のみ): team.md 実 GoA 行 17(全行スパース表記・binFail 17 — RE 実測、Architect 再照合一致)。書き手は人間の §13 persist 文(手書き)。GoA 集計(distill)は未実装(NOT COLLECTED)— 被害は latent。選挙 CLI の renderGoaLine は常時 canonical 8-bin を書く(record.ts:77-80)。

各自実測確認のうえ GoA 付き投票。自案非採用時の受容度を note に併記。

裁定: (a) parse 側スパース受理(bin 段拡張 — corpus 17行が即読める・ADR-4 契約拡張)(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=1票
- 留保(e1, GoA2): (b) 成分(以後の手書き persist の 8-bin 化)はコード変更でなくノルム改定なので、本 intent のコード面と混ぜず norm PR トラック(W-4 と同枠)で扱うこと — (c) を採る場合もこの分離を維持。
- 留保(e2, GoA2): スパース受理の受理域境界を fail-closed で明文化すること — 受理するのは「出現 bin の部分集合(各 bin 1-8 の範囲内・重複なし・順序昇順は非要求)」に限り、重複 bin・範囲外 bin・数値不正は loud 拒否。受理域拡大が無検証受理へ滑らないため(verification-numeric-parse の系譜)。
票タイムライン: 配信 2026-07-20T04:31:31Z → 配信 2026-07-20T04:31:31Z → 配信 2026-07-20T04:31:32Z → e3 2026-07-20T04:32:20Z → e1 2026-07-20T04:32:29Z → e2 2026-07-20T04:37:08Z → 開票 2026-07-20T04:37:25Z
GoA[E-GSFRA1]: 1x1 2x2 3x0 4x0 5x0 6x0 7x0 8x0
