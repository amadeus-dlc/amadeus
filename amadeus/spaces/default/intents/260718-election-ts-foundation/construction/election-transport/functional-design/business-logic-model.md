# Business Logic Model — election-transport(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## 輸送抽象(C5 — FR-2/FR-7)

```
interface VoterTransport {
  notify(voter, payload: ShortNotification): Result<DeliveryRecord, TransportError>
}
ShortNotification = { electionId, viewPath }   # 質問文・選択肢テキストのフィールドを型として持たない(FR-2a 型保証)
DeliveryRecord    = { voter, at, transport: "agmsg" | "subagent" }  # 送信実行の結果からのみ構築
```

## AgmsgTransport(team モード)

```
notify: send.sh を spawnSync(env: process.env 明示 — bun-spawn-env-snapshot)
        payload 文言 = "選挙 <ID> の配布ビュー: <viewPath> — vote verb で投票してください" 相当の短通知のみ
        exit 0 → DeliveryRecord(at=実行時刻)/ 非0 → TransportError("send-failed")
        DeliveryRecord は spawn 実行の戻りからのみ生成(送らず記帳の経路なし — FR-2b)
```

## SubagentTransport(solo モード)

```
notify: spawn せず「配布ビューパス+投票指令」を DeliveryRecord と併せて返す
        (実際の subagent spawn は呼出側 AI が U5 の指令に従って実行 — ツールは輸送記録のみ所有)
        blind 性は構造的隔離(subagent は他票を見ない)で保証 — FR-7a
```

## 票還流の対称性

両輸送とも票の受理は U5 `vote` verb(→U2 appendBallot)に一本化 — 輸送は「配布の到達」だけを所有し、収集面を持たない(FR-7b の形式共通性)。

## Bolt 切り出しの参照(正本 = bolt-plan.md)

U4 全体は Bolt 3(io-record-transport)。Bolt 1 は輸送を使わない(0件確認選挙は配信なしの最小完走 — U5 の状態機械が configured 票なしで tally へ進む)。

## エラー処理

TransportError = "send-failed" | "voter-unknown" | "view-missing"。全 fallible API は Result。
