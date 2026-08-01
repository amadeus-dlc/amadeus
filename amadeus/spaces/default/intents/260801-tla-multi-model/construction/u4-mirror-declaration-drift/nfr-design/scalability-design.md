# Scalability Design — u4-mirror-declaration-drift

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u4-mirror-declaration-drift(C7+C8-MirrorLifecycle 面)

上流入力(consumes 全数): scalability-requirements(非適用判定・判定の根拠), performance-requirements(PERF-U4-2: 線形計算量の集約先), security-requirements, reliability-requirements, tech-stack-decisions, business-logic-model(§2.2 宣言照合ステップ / §5 timeout 予算), business-rules(BR-SC6)

## 非適用の根拠(scalability-requirements からの引き継ぎ)

scalability-requirements.md の判定をそのまま継承する: 本 Unit はステートレスな単発 CLI ツールの拡張であり、負荷増大に応じたスケーリング戦略(水平/垂直スケール、容量計画、同時実行制御、データ成長予測)を定義する対象を持たない。処理対象の登録モデル数は現行2件(FormalElection / MirrorLifecycle)で、intent の成功条件もこの2モデルでの red/green 実証である。変更面は CI ジョブ内で逐次実行される検証ステップであり、同時実行ワークロードを持たない(requirements NFR-1〜4 にスケーラビリティ要求なし、unit-of-work u4 節 AC1〜4 は全て正しさに関するもので容量・負荷の定量目標を含まない)。したがって負荷予測・スケーリングトリガ・同時実行目標・データ分割・オートスケーリング規則は設計しない。

## 構造的な将来耐性(設計事実の記録 — 要件ではない)

将来モデル数が増えた場合に備えた唯一のスケーラビリティ関連保証は、宣言照合が登録モデル数・依存辺数に対し線形 **O(N × (V + E))** に留まることである。これは performance-requirements.md PERF-U4-2 として既に固定済みであり独立した要求を重複定義しないが、設計事実として次を記録する(前方参照: performance-design.md の PERF-U4-2 行が機構と検証の正本)。

- **推移解決は登録モデルごと高々1回**: u1 リゾルバ `resolveAuxiliaryModules` は BFS/DFS 1回の推移解決で、モジュール数 V・依存辺数 E に対し線形(business-rules BR-SC6、u1 リゾルバ仕様に由来)。
- **宣言照合は集合比較のみ**: `compareDeclarations` はモジュール名の集合差分を取るだけで、計測済み identity の再計算・再読込を伴わない(business-logic-model §2.2「判定不能時の読込二重化防止」)。モデル数 N が増えても照合ループは N に線形で、モデル間の相互作用経路は存在しない。
- **読込は単一読込原則の内側**: readModule アダプタは計測済み bytes を優先返却し、未読込モジュールのみ `deps.readFile` でその場読みする(business-logic-model §2.2)。読込総量は safeReadFile の totalBytes 予算に計上され、モデル数・宣言サイズに比例する線形の増加に留まる(performance-design.md PERF-U4-1/3)。

スケーラビリティ設計として新規の機構(キャッシュ・並列化・分割)は導入しない — 上記の線形性があれば現行規模および想定される増加に対し十分であり、要件側の非適用判定と矛盾しない。
