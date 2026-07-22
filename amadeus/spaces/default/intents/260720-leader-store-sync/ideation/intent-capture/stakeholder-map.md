# Stakeholder Map — 260720-leader-store-sync

上流入力(consumes 全数): (本ステージは consumes 宣言なし)

## 一次ステークホルダー

| 役割 | 関心 | 関与 |
| --- | --- | --- |
| leader | sync 手作業の除去・滞留ゼロ運用 | 生成 tool の唯一の実行者(leader 所有物の同期は leader の執行業務) |
| ユーザー(j5ik2o) | 記録整合性・main の監査可能性 | 方式選挙の可否同数時エスカレーション先/sync PR のマージ承認者(no-AI-merge 不変) |

## 二次ステークホルダー

| 役割 | 関心 | 関与 |
| --- | --- | --- |
| メンバー(e1/e2/e4/e3) | 選挙 record の main 裏取り可能性/自 record への非干渉(E-PM10A) | sync PR のレビュアー(2名) |
| 将来の監査者・別クローン | provenance(HUMAN_TURN/GRANT/DELEGATE)の全量到達 | 読者 |

## 非ステークホルダー(明示)

- 配布フレームワーク利用者: scripts/ は配布外(gh-scripts-boundary)につき無関係。
