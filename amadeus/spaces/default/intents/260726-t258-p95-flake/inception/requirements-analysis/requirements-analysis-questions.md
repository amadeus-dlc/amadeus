# Requirements Analysis — 明確化質問(260726-t258-p95-flake)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md(codekb 260726-t258-p95-flake 断面 — 性能ゲート2様式の断面と t258 patch 構造)

運用モード: ソロ。回答はユーザー直接裁定(AskUserQuestion)。

前提事実(RE 確定、scan-notes.md):
- 欠陥 = t258:461-462 の絶対 latency ceiling(archive 500ms / recovery 750ms)。予算は #1424 でユーザーが選んだ round number で、CI 実測 p95(41.2 / 29.3ms)の12〜25倍上空だが、共有ランナーのスパイク分散(recovery 219↔767ms / archive 248↔887ms)がレンジ内側に達する
- t258 は noop baseline を既に測定済み(RSS 差分用 :444)— latency にも転用可能な素材が既存
- 同型先例2件: plugin-discovery-overhead-gate(相対比 AND 絶対 noise floor、述語分離、fail-closed)/ mirror-distribution-benchmark-aggregate(median 基準 AND spread floor)
- 同根: t257:240-241(strictReadP95Ms<=100 / migrationP95Ms<=250、同一 #1424 intent 由来・同一 child benchmark)が #1511 未報告のまま同構造

## Q1. t258 の判定方式(#1424 NFR の p95 絶対予算の扱い)

A. **noop 相対化 + 絶対予算の二段判定** — fail 条件を「(archiveP95 − noopP95) が相対 floor 超過 **かつ** archiveP95 > 絶対予算」の AND にする。ランナー全体が遅い時は noop も遅くなるため負荷スパイクを吸収し、実装退行(transaction 自体の遅化)は noop 差分に現れて検出される。#1424 の絶対予算値(500/750)は上限として維持(t259 の相対形+plugin-discovery gate の AND 様式の合成。判定述語は tests/lib/ へ分離して in-process テスト+落ちる実証)
B. **median 基準の絶対予算** — p95 でなく median(サンプル中央値)を 500/750 と比較し、分散条件(spread floor)を併置(mirror-aggregate 様式)。NFR の「p95」表記から「median」への契約変更を伴う
C. **予算引き上げ**(1s/2s 等)— 構造は不変。実測分散(887ms)を包むには 1s 級が必要で、退行検出力が大きく劣化
X. Other (please specify)

[Answer]: A

## Q2. 同根 t257(strictRead 100ms / migration 250ms)の扱い

A. **同一 PR で同方式へ是正**(same-root-inventory 準拠 — 同じ欠陥形状・同じ child benchmark・判定述語を共有できる)
B. **別 Issue 起票のみ**(本 intent は #1511 の t258 スコープに限定)
X. Other (please specify)

[Answer]: A

## 裁定の記録

- Q1 = A(noop 相対+絶対予算の AND 二段判定、述語分離+落ちる実証。#1424 の絶対予算 500/750 は上限として維持 — 契約弱化なし)/ Q2 = A(t257 を同一 PR で同方式へ是正)。裁定者: ユーザー(AskUserQuestion 直接裁定)。ソロモードのため選挙非実施
- ユーザー承認: 2026-07-26T20:35:00Z(AskUserQuestion 回答受領)
- **改訂裁定(前提反証による再裁定)**: builder が FR-1 前提節の要求どおり noop 系列の相関を実装前に実測し、**noop は空計測ウィンドウ(≈40ns・I/O なし)で負荷と相関しない**ことを決定的に反証(高負荷スイープ: archive 2.3倍膨張時も noop 平坦)。裁定 A の二段 AND は旧絶対 ceiling と同一挙動へ退化するため、conductor が再裁定を提示 → **Q1 改 = C(median 基準の絶対予算)**。前回 B/C 案棄却の前提(p95 契約維持が可能)が崩れたことによる仕様変更(p95→median)として、ユーザーがエスカレーション正準リスト(4)に基づき承認
- ユーザー承認(改訂): 2026-07-26T22:05:00Z(AskUserQuestion 回答「C: median 基準」受領)
