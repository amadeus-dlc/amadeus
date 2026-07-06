# Unit of Work Dependency — 260706-installer-versioning（Issue #543）

上流入力: [unit-of-work.md](unit-of-work.md)

単一 Unit のため Unit 間依存は存在しない。

外部依存（Unit 外）:

- #577（merge 済み）= Construction 前提。解消済み。
- #572（skills/ restructure）= 接触薄。skills/ に触れる変更が出たら leader へ一報（requirements 制約）。
