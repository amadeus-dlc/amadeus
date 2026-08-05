# Stage Memory — delivery-planning

## Interpretations

- 2026-08-05T09:20:00Z — questions は 0 問様式(E-OC1: 既決規範の機械的執行)。5 つの分岐点(Bolt 1 の中身/単独性/波 A 本数/後置 1 本/docs 位置)がすべて既決規範・実測トポロジ・builder 上限 4 から一意に導かれることを裏取り表で固定した。

## Deviations

- 2026-08-05T09:20:00Z — トポロジ順からの逸脱 1 件を申告: advisory-auto-resolution は DAG 上は波 A に置けるが波 B へ後置。理由 = amadeus-orchestrate.ts を触る非依存 2 Unit 組の後着側を Bolt 6 に一意化し、実 diff 再評価 + allowlist remap を確定 base に対し 1 回にする + builder 上限 4 の遵守。代償(G4 の価値到達が 2 段遅れ)と、U-2 裁定を Bolt 1 ゲートで先行提示する緩和策を bolt-plan / risk-rationale の両方に記録。

## Tradeoffs

- 2026-08-05T09:20:00Z — 1 Unit = 1 Bolt = 1 PR(7 Bolt)。束ねない(cid:units-generation:c1 (b))。波 A は 4 並行(上限ちょうど)、波 B は 2 並行。

## Open questions

- 2026-08-05T09:25:00Z — §13 学習候補: 0件(トポロジ逸脱の申告様式は cid:delivery-planning:intra-bolt-order-as-risk-control の適用実例、0問様式は eoc1 系 cid の適用実例。新規の一般化価値なし)。
