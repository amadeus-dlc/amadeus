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

## スケーリング・性能

- 追加ホットパス: Stop hook の対話性判定(毎ターン)。C3 は既存 presence 読取の再利用でファイル I/O 1 回級 — 性能 NFR なし(承認済み NFR に不在のため計測劇場を作らない)
