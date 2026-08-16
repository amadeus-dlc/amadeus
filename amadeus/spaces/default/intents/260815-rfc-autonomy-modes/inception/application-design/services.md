# Services — intent 260815-rfc-autonomy-modes

> 本 intent はデプロイ基盤を持たない CLI フレームワーク内部の改修であり、ネットワークサービスは存在しない。「サービス」は engine 内の協調単位として記述する(orchestration は engine 一極 — choreography なし)。

## S1: 裁定サービス(ruling pipeline)

- 構成: C2(梯子・ゲート導出)→ C1(RecommendationOutcome)→ 分岐: unique → AUTO_DECIDED / 非 unique → C3(対話性)→ 対話: AskUserQuestion 提示(Stop hook carveout — Q11=A)/ 非対話: C4 waiting
- 通信: すべて同期・in-process(tool 呼出)。梯子と engine の境界は既存の decide-question JSON 契約を拡張(戻りに outcome 全体を含める)
- ライフサイクル: 裁定点ごとに stateless。waiting のみ durable(record/state)

## S2: 状態遷移サービス(interruption)

- 構成: C4 が所有。engine(orchestrate)だけが enterWaiting を呼ぶ。resume は次セッションの `next` が ResumeDispatch で分岐
- 監査: WAITING イベントは state 遷移と同一トランザクション(audit-first 原則)

## S3: 可視化サービス

- 構成: C8 が C3/C5/C6/C7 の実効関数を読み取り専用で合成。statusline hook は既存キャッシュ機構のまま(表示元データの一本化のみ)

## S4: 完了レポートサービス

- 構成: C9。complete-workflow 経路の後段で record へ生成(失敗しても workflow 完了を妨げない — 非 blocking、警告のみ)

## S5: 人間ゲート検証サービス(presence 封鎖)

- 構成: C13。approve-batch の presence 検証(未消費 HUMAN_TURN の実在要求、`amadeus-bolt.ts`)と gate presence の ledger-不在 fail-closed(`amadeus-lib.ts`)。C3 と presence の一次信号面(HUMAN_TURN ledger)を共有するが、判定は「本当に人間が動いたか」の検証であり C5 の権限区分判定とは独立
- 通信: 同期・in-process。engine のゲート/バッチ承認経路からのみ呼ばれる
- 〔C13 補記 2026-08-16: unit-of-work.md「§12a iteration-2 FOLLOW-UP の引受」に基づく U6 実装時の設計文書同期。実装は PR #3134 で着地済み — 本節はその同期の完了分〕

## スケーリング・性能

- 追加ホットパス: Stop hook の対話性判定(毎ターン)。C3 は既存 presence 読取の再利用でファイル I/O 1 回級 — 性能 NFR なし(承認済み NFR に不在のため計測劇場を作らない)
