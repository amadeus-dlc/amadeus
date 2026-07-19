# Tech Stack Decisions — election-transport(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 選定と根拠

| 領域 | 選定 | 根拠 |
|---|---|---|
| 言語/ランタイム | TypeScript/ESM+Bun 直接実行 | requirements.md NFR-1+codekb technology-stack.md の既存スタック実測 |
| agmsg 輸送 | `~/.agents/skills/agmsg/scripts/send.sh` の spawn(Bun.spawnSync、env: process.env 明示) | 既存 agmsg 導入の実測(technology-stack.md — Bash driver+SQLite の外部スタック)。API 直結・DB 直読は agmsg スキルの明示禁止(scripts 経由のみ)につき不採用。env 明示は bun-spawn-env-snapshot ノルム準拠 |
| subagent 輸送 | DeliveryDirective 生成のみ(spawn は上位層) | E-ETF-FD2 Q1=B 裁定(business-logic-model.md — 無確認記帳の排除)。port 単一シグネチャは DeliveryOutcome 判別ユニオン(FD レビュー iter3 確定) |
| テストシーム | VoterTransport port への fake 注入(テスト側ヘルパー) | construction ガードレール — 本番コードにテスト分岐なし。実 send.sh spawn の検証は integration 層(fs-tests-integration-first の配置軸の**spawn 系テストへの類推適用** — cid 原義は FS 限定) |
| lint/型検査 | Biome+tsc(既存配線) | ADR-1 Consequences — 新規配線なし |

## 却下した代替

- WebSocket/HTTP 等の独自配信チャネル — 既存 agmsg で代替可能(規模正当化 — 新規機構は既存で代替できない根拠がある場合のみ)。外部サービス依存も W-04 の配布外スコープに不釣り合い
- 送達確認(到達 ack)の機械化を U4 に内蔵 — ack はチームノルム(dispatch-ack-required)の人間系プロトコルで、受信側の応答を要する。U4 単独では検証劇場(送信=到達の偽装)になるため不採用(reliability-requirements.md の明示に従う)
