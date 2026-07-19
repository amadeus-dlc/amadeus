# Business Logic Model — election-transport(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## 輸送抽象(C5 — FR-2/FR-7)

```
interface VoterTransport {
  notify(voter, payload: ShortNotification): Result<DeliveryRecord, TransportError>
}
ShortNotification = { electionId, viewPath }   # 質問文・選択肢テキストのフィールドを型として持たない(FR-2a 型保証)
DeliveryRecord    = { voter, at, transport: "agmsg" | "subagent", provenance: "spawn-exit" | "reported-by-conductor" }  # 実行結果からのみ構築(Q1=B)
```

## AgmsgTransport(team モード)

```
notify: send.sh を spawnSync(env: process.env 明示 — bun-spawn-env-snapshot)
        payload 文言 = "選挙 <ID> の配布ビュー: <viewPath> — vote verb で投票してください" 相当の短通知のみ
        exit 0 → DeliveryRecord(at=実行時刻)/ 非0 → TransportError("send-failed")
        DeliveryRecord は spawn 実行の戻りからのみ生成(送らず記帳の経路なし — FR-2b)
```

## SubagentTransport(solo モード — E-ETF-FD2 Q1=B 裁定 2026-07-19)

```
notify: **DeliveryDirective(配布ビューパス+spawn 指令)のみを返し、DeliveryRecord は生成しない**
        (spawn は呼出側 AI が実行 — ツールは spawn を観測できないため、この時点の記帳は FR-2b 違反)
        DeliveryRecord は U5 の report(spawn 完了報告)時に**単段生成**され、
        provenance="reported-by-conductor" を必須属性に持つ(pending 記帳は作らない — 検証劇場 Forbidden 整合)
        blind 性は構造的隔離(subagent は他票を見ない)で保証 — FR-7a
```

## 票還流の対称性

両輸送とも票の受理は U5 `vote` verb(→U2 appendBallot)に一本化 — 輸送は「配布の到達」だけを所有し、収集面を持たない(FR-7b の形式共通性)。

## Bolt 切り出しの参照(正本 = bolt-plan.md)

U4 全体は Bolt 3(io-record-transport)。Bolt 1 は輸送を使わない(0件確認選挙は配信なしの最小完走 — U5 の状態機械が configured 票なしで tally へ進む)。

## エラー処理(輸送別の到達可能バリアント — reviewer F3 是正)

TransportError = "send-failed" | "voter-unknown" | "view-missing"。全 fallible API は Result。

| バリアント | agmsg | subagent |
|---|---|---|
| send-failed | spawn exit 非0 | 到達しない(spawn しない — 指令生成のみ) |
| voter-unknown | 到達 | 到達 |
| view-missing | 到達 | 到達(viewPath 解決失敗はこちら — send-failed に写像しない) |
