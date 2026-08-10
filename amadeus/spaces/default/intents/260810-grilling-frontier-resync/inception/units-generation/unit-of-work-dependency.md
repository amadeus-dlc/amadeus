# Unit Dependency — grilling frontier 再同期

**Intent**: 260810-grilling-frontier-resync / **Stage**: units-generation (2.7)

上流入力(consumes 全数): `component-dependency.md`(C1 根の依存行列 — Unit 依存の導出元)、`components.md`(C→U の束ね)、`requirements.md`(FR の依存前提)、`component-methods.md`(U2 の pin 対象が U1 の確定文言であることの根拠)、`services.md`(実行順が実行時役割へ影響しないことの確認)、`decisions.md`(ADR-3 の二層分担 — U1 規律と U2 機械検査の分離根拠)。

## 依存グラフ(edge block)

```yaml
units:
  - name: protocol-core
    kind: spec
    depends_on: []
  - name: budget-sensor
    kind: library
    depends_on: [protocol-core]
  - name: projection-sweep
    kind: packaging
    depends_on: [protocol-core]
```

## 依存の説明

- `budget-sensor → protocol-core`: U2 の t415 逐語 pin と C3 の超過記録行照合述語は、U1 が確定させる正本文言(新終了条件・記録行様式・マーカー様式)を対象とする — 文言確定前の pin は書けない(scope-definition Q1 裁定「正本先行」の Unit 面)。
- `projection-sweep → protocol-core`: U3 の語彙 sweep は U1 の新語彙(frontier 表現)確定後でないと置換先が定まらない。また stage-protocol.md の残存語彙 sweep は U1(C2 改訂)完了後に行う(components.md C6 注記)。
- `budget-sensor` と `projection-sweep` は相互独立(ファイル非交差: U2 = ts+テスト、U3 = md+検証)— U1 完了後は並行実装可。

## 技術的依存と実行環境制約の区別

上記2エッジはいずれも**技術的依存**(成果物の内容依存)であり、依存グラフに載せる実行環境制約エッジは存在しない。ただし**運用上の実行順序の注記が1件ある**: U3 の隔離2回ビルドはホスト負荷と衝突しやすいため、U2/U3 並行時は U3 の検証コマンドを最後に直列実行する(fanout-load-settle-before-integration)。delivery-planning はこの注記をスケジューリング制約として扱うこと。
