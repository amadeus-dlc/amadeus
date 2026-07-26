# Requirements Analysis — 明確化質問

> **承認**: 2026-07-26T07:35:47Z にユーザー承認(AskUserQuestion 回答 Q1=A / Q2=A / Q3=D 受領、本タイムスタンプは回答転記時刻)。
>
> **E-OC1 判定証跡**: 本ファイルの3問はいずれもユーザー裁定対象(Q1 = Issue 着手可否・クローズ判断は cid:requirements-analysis:issue-selection-user-decides、Q2 = ユーザー可視 CLI 契約変更の可能性 = エスカレーション正準リスト(4)、Q3 = 複数の妥当解を持つユーザー可視 CI ゲート挙動の方式選択)。ソロモードにつきエージェント選挙は不実施、ユーザー回答が裁定となる。回答受領後にのみ [Answer] を記入する(cid:requirements-analysis:election-answer-after-ruling)。
>
> 上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md(いずれも codekb、observed `1673c4332` の差分リフレッシュ済み)。患部実測は reverse-engineering/scan-notes.md に依拠。
>
> 対象外の4件(#1457 / #1377 / #1459 / #1462)は、文書化済み仕様(コード内 doc コメント・既存の対称実装・スキーマ契約)への回復であり修正方式が一次証拠から一意に定まるため質問しない(選挙不要の機械的執行クラス)。

## Q1: #1388(team-up.sh codex 経路)の扱い

RE 実測により前提が大きく変化しています: (a) 患部は `scripts/team-up.sh` → `packages/framework/core/tools/team-up.sh` へ移動し配布対象化(Issue 記載のパス・行番号は失効) (b) codex 経路の watcher 検証除外は後続 intent の **FR-6 として明示的に決定された設計**(`team-up.sh:1098-1099` verbatim: "Codex is out of scope (FR-6)") (c) Issue 自身が「codex には ready センチネル seam が無くポーリング検証は直接転用不可・実発生は未実測(理論リスク)」と限定。

- A. 本バッチのスコープから除外し、Issue へ実測根拠(FR-6 既決・パス失効)をコメントしてクローズはユーザー判断に委ねる
- B. 本バッチのスコープから除外し、FR-6 既決を根拠に実測コメント付きでクローズする
- C. 本バッチで修正する(FR-6 既決の変更 = 仕様変更として扱い、codex 用の検証 seam を新設計)
- D. 別 intent へ先送り(Issue はパス・行番号の更新コメントのみ)
- X. Other (please specify)

[Answer]: A — 本バッチから除外し、Issue へ実測根拠(FR-6 既決・パス失効)をコメントする。クローズ判断はユーザーに委ねる(ユーザー裁定 2026-07-26、AskUserQuestion 回答「除外+コメントのみ」)

## Q2: #1458(election-transport)の修正方式

設計コメント(`amadeus-election-transport.ts:165-167` verbatim)は「conductor 報告後に reportDelivery が record を mint する」と明言しており、その配線が report verb に未実装(dead export)です。修正2案:

- A. 設計コメントどおり `handleReport` の distributed 遷移へ `reportDelivery` を配線する(CLI 契約不変・文書化済み設計への回復)
- B. subagent 既定を廃止し agmsg transport を必須化する(**ユーザー可視の CLI 契約変更** = 仕様変更)
- X. Other (please specify)

[Answer]: A — 設計コメントどおり `handleReport` の distributed 遷移へ `reportDelivery` を配線する。CLI 契約不変(ユーザー裁定 2026-07-26、AskUserQuestion 回答「reportDelivery 配線」)

## Q3: #1489(benchmark 分散ゲート)の修正方式

現行判定は `maximum / minimum > 2 && absoluteSpread > noiseFloor(= p95Budget × 0.005 = 10ms)`(`mirror-distribution-benchmark-aggregate.ts:33-35`)で、3 replica の min/max 比が単一外れ値で壊れます。Issue の対処案:

- A. 中央値ベースの判定へ変更(例: `max/median` と `median/min` の各比で単一スパイク耐性を持たせる)+ 両側実測(偽赤解消と検出力維持)を完成条件とする
- B. noise floor をワークロード別・絶対値で引き上げる(判定式は不変)
- C. replica 数を増やし外れ値棄却(trimmed)で集計する(CI コスト増)
- D. A を主、必要なら B を併用(実測で決める)
- X. Other (please specify)

[Answer]: D — 中央値ベース判定を主とし、必要なら noise floor 調整を併用(実測で決める)。偽赤解消と検出力維持の両側実測を完成条件とする(ユーザー裁定 2026-07-26、AskUserQuestion 回答「中央値ベース+実測併用」)
