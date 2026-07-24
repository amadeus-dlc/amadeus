# Services — 260722-tla-plugin

上流入力(consumes 全数): requirements、architecture、component-inventory、team-practices

## サービス定義

本intentは常駐サービス・デプロイ可能プロセスを新設しない。実行単位は3つの「呼出し形」であり、いずれも短命プロセス:

| 実行単位 | 起動者 | 形態 |
|---|---|---|
| run-model-check CLI | 開発者(ローカル)/ ci.yml formal ジョブ(CI)/ formal-model-check ステージ(engine 経由) | bun 短命プロセス。TLC を provider 経由で子プロセス spawn |
| model-completeness sensor | PostToolUse hook / conductor 手動 fire | 既存 sensor dispatcher 経由の短命プロセス |
| plugin compose/drop | 利用者(opt-in 時) | 既存 plugin-composition エンジン(ワークスペースロック+journal) |

## オーケストレーションと通信

- すべて同期・プロセス内/子プロセス呼出し。非同期メッセージング・イベント駆動は導入しない(choreography 不要 — 単発検証フロー)
- run-model-check → TLC: provider 抽象越しの spawn(stdout/stderr ストリーム上限 16MB は既存 MAX_TLC_STREAM_BYTES を踏襲)
- CI ジョブ → run-model-check: exit code 契約(0/1/2+)のみで通信。artifact upload で結果保存

## ライフサイクル/スケーリング特性

- スケーリング要件なし(workflow_dispatch の単発実行)。並行実行は想定せず、同時 dispatch 時も各ジョブは独立ワークスペースで干渉しない
- タイムアウト: CI ジョブ 30分(NFR-2)。run-model-check は**単一モデルの単発 run**であり(「suite」概念は実験ハーネス専用語彙のため使わない — iteration 1 Minor 4 是正)、TLC spawn の deadline は単発 run 予算として nfr-design で数値確定する(既存の 120秒/spawn 上限との整合検算を含む)
