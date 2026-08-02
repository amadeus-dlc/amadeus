# Logical Components — U4 subagent-started

上流入力(consumes 全数): performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions — nfr-requirements SKIP により不在(expected)、各面要件は requirements.md NFR-1〜3 から代替導出(本ファイルは4設計の適用先コンポーネント目録)。business-logic-model.md(実在)のコンポーネント分担を消費。

## コンポーネント目録と NFR 適用点

| コンポーネント | 責務 | 適用 NFR 設計 |
|---|---|---|
| `otel/event-registry.ts`(改修 — SUBAGENT_STARTED def 追加+79 化) | canonical 定義と pin 網 | reliability(fail-closed 検証・pin 10項目)、security(safe-key 自動追従の源) |
| subagent hook(amadeus-log-subagent.ts 契約の emit 点) | started イベント emit+Purpose 統制 | security(200字・1行)、reliability(3段ゲート fail-open) |
| lifetime 合成(composeSubagentLifetimes — journal 後処理) | started/completed 突合+span 合成 | performance(1パス貪欲)、reliability(孤児除外)、scalability(並列突合の決定性) |
| doc 同期(audit-format.md / 12-state-machine.md) | イベント目録の2ドキュメント更新 | reliability(t48 ガードとの整合 — pin 網の一部) |

## 障害ドメインと blast radius

- emit 面: hook 1回の失敗は当該イベント欠落に閉じる(subagent 実行自体・他イベントへ波及しない)。registry fail-closed は emit 側 caller bug の即時顕在化で、store 汚染を防ぐ側の統制
- 突合面: 読取専用後処理 — 失敗しても store・emit 経路へ波及せず、lifetime 表示の欠落のみ

## 共有資源

- 共有は監査 store(append-only 行)のみ — 既存 writer 経路で追記、新規ロックなし

## dist 投影(NFR-4)

改修は packages/framework/core/ 配下 — 変更ごとに package.ts+promote:self を同一 PR で回し、7ハーネス dist+self-install を同期する(bt-dist-regen-seven-harnesses)。
