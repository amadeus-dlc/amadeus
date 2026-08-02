# Scalability Requirements — u4-mirror-declaration-drift

**Intent**: 260801-tla-multi-model / **Stage**: nfr-requirements / **Unit**: u4-mirror-declaration-drift(C7+C8-MirrorLifecycle 面)

上流入力(consumes 全数): unit-of-work(u4 節), business-logic-model(§2 / §5), business-rules(BR-SC6), requirements(NFR-1 / NFR-4)

## スケーラビリティ適用判定

**非適用(ただし複雑度上界のみ performance-requirements.md で保証)。**

本 Unit はステートレスな単発 CLI ツールの拡張であり、負荷増大に応じたスケーリング戦略(水平/垂直スケール、容量計画、同時実行制御、データ成長予測)を定義する対象を持たない。処理対象の登録モデル数は現行2件(FormalElection / MirrorLifecycle)で、intent の成功条件もこの2モデルでの red/green 実証である。

将来モデル数が増えた場合に備えた唯一のスケーラビリティ関連保証は、宣言照合が登録モデル数・依存辺数に対し線形(O(N × (V + E)))に留まることであるが、これは performance-requirements.md PERF-U4-2 として既に固定しており、ここに独立した要求を重複定義しない(business-rules BR-SC6、u1 リゾルバ仕様に由来)。

## 判定の根拠

- requirements.md の NFR-1〜4 にスケーラビリティ要求は存在しない。
- unit-of-work u4 節の AC1〜4 は全て正しさ(red 実証・三者一致・非接触)に関するもので、容量・負荷の定量目標を含まない。
- 変更面は CI ジョブ内で逐次実行される検証ステップであり、同時実行ワークロードを持たない。
