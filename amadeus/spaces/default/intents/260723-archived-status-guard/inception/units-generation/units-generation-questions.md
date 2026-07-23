# Units Generation の確認事項 — 260723-archived-status-guard

Leader approval evidence: ユーザー承認 2026-07-23T07:36:11Z

## Q1. Unit境界

実装Unitをどの境界で分けますか。

A. capability単位の3 Unit（status/migration、lifecycle transaction、guard/integration）（推奨）
B.変更対象toolごとに5 Unit
C. 1 Unitへ統合
D. core実装とtestsの2 Unit
E. journal機構だけ独立させた4 Unit
X. Other (please specify)

[Answer]: A — capability単位の3 Unit（status/migration、lifecycle transaction、guard/integration）（2026-07-23T07:33:23Z、Mode: guided）

## Q2. Unit粒度

各Unitはどの粒度で完成させますか。

A. 実装・unit/integration test・配布同期を含むvertical slice（推奨）
B. 実装だけをUnitとしtestsを後段へ集約
C. 型/APIと実装を別Unitに分離
D. 各tool変更をさらに細分化
E. 全変更を単一atomic Unitにする
X. Other (please specify)

[Answer]: A — 実装・unit/integration test・配布同期を含むvertical slice（2026-07-23T07:33:51Z、Mode: guided）

## Q3. DAG依存

3 Unit間の直接依存をどう定義しますか。

A. lifecycleはstatus/migrationに依存し、guard/integrationは両方に依存する（推奨）
B. lifecycleとguardはstatus/migrationにだけ依存し、相互独立
C. 3 Unitを完全に独立とする
D. guardを先行基盤とし、他2 Unitが依存する
E. すべてを直列依存にするが別の辺構成にする
X. Other (please specify)

[Answer]: A — lifecycleはstatus/migrationに依存し、guard/integrationは両方に依存する（2026-07-23T07:34:31Z、Mode: guided）

## Q4. Unit間契約

Unit間の統合契約を何で固定しますか。

A. TypeScript export、typed error、CLI exit/stdout、audit payload、journal schemaをcontract testで固定（推奨）
B. TypeScript型だけで固定
C. CLI end-to-end testだけで固定
D. 文書契約だけにする
E. snapshotだけで固定
X. Other (please specify)

[Answer]: A — TypeScript export、typed error、CLI、audit payload、journal schemaをcontract testで固定する（2026-07-23T07:35:09Z、Mode: guided）

## Q5. Deployment model

各Unitの成果物をどう配布しますか。

A. 同一framework releaseへ統合し、Unit単独deployはしない（推奨）
B. Unitごとに独立release可能にする
C. coreとharnessを別releaseにする
D. feature flagで段階配布する
E. migrationだけ先行releaseする
X. Other (please specify)

[Answer]: A — 3 Unitを同一framework releaseへ統合し、Unit単独deployは行わない（2026-07-23T07:35:36Z、Mode: guided）

## Q6. Decomposition planの承認

3 Unitの境界とDAGで成果物を生成してよいですか。

A. Approve Plan
B. Revise Plan
X. Other (please specify)

[Answer]: A — Approve Plan（2026-07-23T07:36:11Z、Mode: guided）

## Q7. 次回へ残す学び

このステージから、今後のAI-DLC実行へ永続化する学びはありますか。

A. 追加なし（推奨）
X. Other (please specify)

[Answer]: A — 追加なし（2026-07-23T07:41:09Z、Mode: guided）
