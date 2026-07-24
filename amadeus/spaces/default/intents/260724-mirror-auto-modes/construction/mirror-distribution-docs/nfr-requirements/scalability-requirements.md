# Scalability Requirements — mirror-distribution-docs

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Capacity Model

| Dimension | Supported envelope | Scaling behavior |
|---|---:|---|
| surfaces | 正準6 | closed registry、各surface独立validation |
| payloads | tool＋skillの2 logical payload／surface | O(S×P) projection |
| self-install surfaces | 4 | Claude／Codex／Cursor／OpenCodeだけ |
| docs files | Guide／Reference×JA/EN＝4 | topic ID単位O(F×T) |
| topic IDs | 最大32 | unknown／duplicateをfail |
| artifact size | 1 file最大2 MiB、公開projection最大64 MiB | 超過をgeneration failure |

公開projectionの64 MiBは、temporary tree完成時にmanifestから導出した6 dist root、4 self-install root、Guide／Reference日英4文書に存在する各生成fileの実byte数を、同じpayloadの重複copyも1 fileずつ数えて合計する。core source、old tree、transaction journal、temporary tree自身の重複保持領域は集計しない。

## Growth Rules

- 第7 surface追加は共通projection manifestのsurface ID、dist path、self-install stance／path、golden testを同一変更で追加する。
- payload追加はlogical IDをregistryへ1回追加し、surface別copy listを手書き複製しない。
- docs topic増加はruntime contract fieldまたは明示docs-only topicへbindする。
- surface／payload／topic増加でparallel writerを作らず、temporary tree完成後にexclusive lock下でmanifest管理fileを固定順commitする。
- capacity超過時はpartial distをpublishせずreleaseを停止する。

## Acceptance

1. 6 surface×2 payloadと4 self-install×2 payloadを全件検証する。
2. surface順を入れ替えても生成bytes／finding集合が同じになる。
3. 2 MiB＋1 byte artifactまたは64 MiB＋1 byte projectionをpartial outputなしで拒否する。
