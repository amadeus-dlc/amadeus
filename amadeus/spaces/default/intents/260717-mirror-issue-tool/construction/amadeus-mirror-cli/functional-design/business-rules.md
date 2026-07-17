# Business Rules — amadeus-mirror-cli

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## ルール一覧(要件へのトレース付き)

| # | ルール | 出典 |
|---|---|---|
| R1 | ミラー本文は定型3要素(概要/Record/状態)のみ。renderBody 以外に本文組み立てを置かない | FR-5.1、指標2 |
| R2 | 同期は record → Issue の一方向。Issue 読み取りは行わない(番号以外) | C-R3 |
| R3 | 重複 create は exit 1(Mirror Issue フィールド既存 = 重複) | FR-2.2 |
| R4 | close は intents.json complete AND state Completed の両立時のみ | FR-4.1 |
| R5 | intents.json へ書かない。書くのは gh(Issue)と state.md の Mirror Issue フィールドのみ | FR-1.5 |
| R6 | 状態行は決定的素材のみから生成(ADR-3 形式)。park は state Parked フィールド非空で判定 | FR-5.1、RE 重点3 |
| R7 | ラベルは intent-mirror + enhancement の2つ | FR-2.1(Q4=B) |
| R8 | 全 gh 呼び出しは引数配列形+env: process.env 明示(ADR-2)、exit code 自己捕捉 | NFR-2 |

## 網羅性確認

R1〜R8 は requirements.md の FR-2.2/FR-3.2-3.3/FR-4.1-4.2/FR-1.3-1.5/FR-5.1/C-R2-C-R3/NFR-2 と Q4 裁定を全数カバーする。本表にない業務ルールは存在しない(追加ルールが生じた場合は要件へ遡って追記する)。
