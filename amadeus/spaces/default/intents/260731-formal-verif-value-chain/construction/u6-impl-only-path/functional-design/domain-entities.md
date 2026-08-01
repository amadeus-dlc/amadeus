# Domain Entities — u6-impl-only-path

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## E1: UpdateModelMapResult(拡張)

**第3の判別 union メンバー**(P5 の確定形 — `{ ok: true; code: "IMPL_ONLY_UPDATED"; declared; changed[]; map }`)を新設。既存の成功枝 `{ ok: true, entries, map }`(:70-71)と失敗枝の code union(:73-82)はいずれも不変(components.md C7 / component-methods.md C7 の契約の実現形を FD で精密化)。所有: amadeus-sensor-model-completeness.ts。

## E2: model-map エントリ

`{ implPath, sha256 }`(amadeus-formal-verif-model-map.ts:158 の exactObject)— `--impl-only` は sha256 のみ更新し implPath 集合は不変(集合の増減はモデル改訂 = 従来経路)。

## E3: 監査記録

更新事実の機械記録(P2 の2層 — stdout 構造化結果+git コミット面)。amadeus 監査シャードへは書かない(intent 非依存ツールの独立性維持 — reviewer iteration 1 M1 の裁定)。

## E4: 消費契約(下流)

- u7(mirror model): 新規モデル登録後、mirror 実装の無関係変更で SOURCE_DRIFT が出た場合の正規復旧経路として u6 を前提とする(u6 → u7 の依存根拠 — unit-of-work-dependency.md)
- 利用者: SOURCE_DRIFT / MODEL_UNCHANGED の文面から正規手順へ到達できる(FR-D2 AC、story-map のジャーニー2)
