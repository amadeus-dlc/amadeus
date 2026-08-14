# Units Generation 質問 — Election CLI 多問対応

## Context

[components](../application-design/components.md)、[component-methods](../application-design/component-methods.md)、[services](../application-design/services.md)、[component-dependency](../application-design/component-dependency.md)、[decisions](../application-design/decisions.md)、[requirements](../requirements-analysis/requirements.md) を入力とする。経済的な実装順や critical path は Delivery Planning に留保し、このステージでは topology だけを決める。

## Q1: unit boundary は何を主軸にするか？

- A. domain ownership と independently testable contract を主軸にする
- B. 変更ファイル1件ごとにunit化する
- C. FR 1件ごとにunit化する
- D. 一つの巨大unitにまとめる
- E. 担当者ごとにunit化する
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。Application Design の model/store/CLI/record/formal 境界を保ち、テスト可能な契約単位にする）

## Q2: granularity はどうするか？

- A. 8 unit に分け、canonical schema、tally、store、adapter、CLI、migration、formal、distribution/verification を分離する
- B. 3つの粗粒度unitにする
- C. 15以上の細粒度unitにする
- D. production code と test code を完全に別unitにする
- E. question typeごとにunitを複製する
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。共有ファイルの交差を抑えつつ、過剰な1機能1unitを避ける）

## Q3: dependency の表現はどうするか？

- A. direct dependency だけを acyclic DAG として記録し、独立集合を明示する
- B. 単一の推奨実装順を記録する
- C. critical path をここで決める
- D. 依存を省略して Delivery Planning に委ねる
- E. cycle を許して同時完成を前提にする
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。Stage 2.7 の topology-only 契約に従う）

## Q4: integration contract は何を正本にするか？

- A. canonical TypeScript types、filesystem schema、CLI directive、formal identity を明示的な境界にする
- B. prose record だけを正本にする
- C. generated dist を正本にする
- D. Git commit message を正本にする
- E. unit間の暗黙共有にする
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。Application Design の公開境界と fail-closed 契約を維持する）

## Q5: deployment model はどう分類するか？

- A. libraries は embedded、CLI/migration は standalone executable、formal spec は in-place、最終投影は packaging とする
- B. 全unitを独立serviceとしてdeployする
- C. AWS resourceへ分割する
- D. package境界を無視して一つのserviceとする
- E. testだけをdeployable serviceとする
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。Bun-only monorepoと既存build projectionに一致する）

## Plan Approval

[Answer]: Approve Plan（E-OC1: full autonomy。8 unit、全unitがcanonical kindを1件持ち、dependency topologyだけを生成する）
