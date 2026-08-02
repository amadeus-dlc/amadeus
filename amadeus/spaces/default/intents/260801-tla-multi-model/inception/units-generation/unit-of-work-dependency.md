# Unit of Work Dependency — 260801-tla-multi-model

上流入力(consumes 全数): components, component-methods, services, component-dependency, decisions, requirements + 同ステージ unit-of-work.md

unit-of-work.md の 5 Unit 間の依存 DAG(トポロジーのみ)。実装順・Bolt 順の経済的裁定は Stage 2.8 delivery-planning が行う — 本ファイルは順序を推薦しない。矢印は「依存する」。

## 依存グラフ(text 図)

```
u1-schema-resolver
 ├──> u2-loader-generalization ──┐
 ├──> u3-vocabulary-supply ──────┼──> u5-ci-all-models-measure
 └──> u4-mirror-declaration-drift ┘
        (u4 は u1+u2 に依存)
```

- u2 → u1: loader が aux 宣言スキーマ(C1)と推移解決リゾルバ(C2)を消費。
- u3 → u1: vocabulary optional フィールドのスキーマ受入が前提。
- u4 → u1, u2: sensor/updateModelMap がリゾルバ(C2)を共有し、宣言 pin は loader の aux 照合(u2)と同一アルゴリズムで整合する前提。
- u5 → u2, u3, u4: 全モデル CI 駆動は全モデル loader(u2)+ 語彙供給(u3)+ MirrorLifecycle 宣言と drift pin(u4)の三点が揃って初めて成立。

## 機械可読エッジブロック

```yaml
units:
  - name: u1-schema-resolver
    depends_on: []
  - name: u2-loader-generalization
    depends_on: [u1-schema-resolver]
  - name: u3-vocabulary-supply
    depends_on: [u1-schema-resolver]
  - name: u4-mirror-declaration-drift
    depends_on: [u1-schema-resolver, u2-loader-generalization]
  - name: u5-ci-all-models-measure
    depends_on: [u2-loader-generalization, u3-vocabulary-supply, u4-mirror-declaration-drift]
```

## 統合点(contracts)

- **u1 → u2/u4**: `tla-module-deps.ts` の推移解決 API(component-methods.md C2 シグネチャ)と `ModelMapModel.auxiliaries` 型。loader・sensor・canonical CLI の3消費者が同一実装を共有(component-dependency.md 依存ルール)。
- **u1/u3 → u5**: `VerifiedTlaSources` 配列 + モデル別 vocabulary レコード(services.md S2 の配給契約。toolchain は map を直接読まない)。
- **u3/u4 → 共有資源**: `specs/tla/model-map.json` — FormalElection vocabulary(u3)と MirrorLifecycle 宣言(u4)は別エントリへの追記で行競合しないが、同一ファイルを逐次変更するため DAG 上も u4 が u3 に直接依存しない点に注意(map 変更順は u3→u4 のどちら先でも byte 競合しない。ただし entries sha256 の impl-only 連動更新は u4 が担う)。
- **全 Unit → 配布面**: `bun scripts/package.ts` 再生成による dist/ 追随(手編集禁止)。

## 並行開発機会

- **u2 ∥ u3**: どちらも u1 のみに依存し相互依存なし — u1 完了後に並行起動可能(複数の有効なトポロジカル順序が存在)。
- **u4** は u2 完了後に u3 と並行可能(u4 ∥ u3、u5 のみが両者を待つ)。
- 直列鎖の最大長は u1 → u2 → u4 → u5(4)。ただしこれを「推奨順」「クリティカルパス」とは呼ばない — 経済的順序付けは 2.8 の責務。
