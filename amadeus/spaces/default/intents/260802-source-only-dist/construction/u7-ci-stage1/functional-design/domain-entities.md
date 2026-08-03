# Domain Entities — u7-ci-stage1

上流入力(consumes 全数): component-methods(C7 段階1)、requirements(FR-4.1/NFR-1/FR-3.1)、components(C7)、unit-of-work(u7)、unit-of-work-story-map(Slice 2)、services(外部境界一覧 — 本 Unit の変更が外部サービス非接触であることの negative 確認)。

## 対象エンティティ(CI 構成 — 新ランタイム型なし)

本 Unit は CI 構成とテストランナー入口の変更であり、新しいドメイン型を導入しない(体裁のためのラッパー型を作らない)。

| エンティティ | 変更 |
|---|---|
| ci.yml テスト系ジョブ | build 前段ステップ追加(needs 連鎖は既存構造を維持) |
| ci.yml 再現性検査ジョブ | 新設(A=生成済み dist / B=隔離追加 build の byte 比較) |
| tests/run-tests.ts 入口 | dist 不在ガード(loud fail + 案内定数。FR-4.1 表記の run-tests.sh は薄ラッパー — 意図的相違申告) |
| package.json | `build` script 新設(dist + promote:self 合成 — FR-3.1 単一コマンド面、u7 所有) |
| 旧 check 3種・detect-ci-changes | 無改変(u8 の原子切替対象) |

## 不変条件

1. 段階1着地後も旧 check 3種は従前どおり green(並存 — 手編集検出の空白ゼロ)
2. 入口ガードは dist 実在時に無音(既存テスト 423 ファイルの挙動不変)
3. 再現性検査の比較対象 A は「テストが検証したものと同一の dist bytes」(第三の build を作らない — u1 FD 手順5の是正と同形)
