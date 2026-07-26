# Services — plugin-host-delivery

> 上流入力(consumes 全数): requirements、architecture、component-inventory、team-practices

## 判定: 常駐サービスなし(N/A の根拠)

本 intent の全コンポーネント(components.md C1-C9)は CLI・ビルド時投影・セッションフックの単発実行で構成され、常駐プロセス・ネットワークサービス・デーモンを導入しない(requirements スコープ外の「generic tracker transport / scheduler / daemon」禁止 affirm、および cid:nfr-design:c1 — CLI/library に常駐 service 向けパターンを機械適用しない)。

## サービス相当の実行単位(整理)

| 実行単位 | 起動契機 | 寿命 | 状態 |
|---|---|---|---|
| C1 CLI(compose/doctor/drop/status) | 利用者コマンド or C4 フック | 単発 | composition record(ファイル)のみ |
| C3 投影 | `bun scripts/package.ts`(ビルド時) | 単発 | dist/ 生成物 |
| C4 フック | ホストのセッション開始イベント | 単発(数百 ms 目標 — no-op 高速路) | なし(C1 へ委譲) |
| 再 compile | C1 compose 成功後 | 単発 | runtime-graph.json(既存・gitignore) |

team-practices.md の対応表どおり、CI は既存 workflow への編入のみで新規常駐面を作らない。requirements NFR-2(起動レイテンシ)はフック実行単位の設計制約として C4 に帰属し、codekb architecture.md / component-inventory.md の既存フック面(7 面実測)の実行モデルを変えない。
