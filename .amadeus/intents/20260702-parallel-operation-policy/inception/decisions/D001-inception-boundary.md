# D001: Inception の所有境界

## 背景

Issue #351 は、並行運用の判断基準を steering policy として記録することを求める。
既存の steering には policy の記録構造（`policies.md` 索引、`policies/` 詳細、README の登録表）と、責務が隣接する Git Branching Policy がある。
判断基準の根拠になる並行運用の実例は、#334 と #350 の cycle 成果物として記録済みである。

## 判断

Inception の所有境界を brownfield（既存の steering policy 文書構造に載せる）として固定する。

対象は、`parallel-operation.md` の判断基準（並行可否、統合手順、承認運用、直列化）、索引登録、git-branching.md との責務分担の相互参照である。

対象外制約として次を固定する（scope.md の SC-OUT-001 から SC-OUT-004）。

- 新しい phase や人間ゲートの追加。
- 並行実行の他候補（ゲート待ちキューの可視化、Bolt の依存 wave 並行実行）。
- 複数人チームでの並行と複数 workspace での組織利用。
- 既存 Intent 20260701-git-branching-policy の lifecycle 再開。

## 理由

policy の記録構造と観察済みの実例がすべて既存成果物として揃っており、既存構造への追加として設計するのが最小であるため。

## 影響

Unit Design Brief は既存の記録構造の踏襲を前提に書かれ、Construction の Functional Design は policy 本文の見出し構成と文言の確定に集中できる。
