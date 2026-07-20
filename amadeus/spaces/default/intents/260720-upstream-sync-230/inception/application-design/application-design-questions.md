# Application Design 質問票 — 260720-upstream-sync-230

> 上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md。user-stories は本 scope で SKIP 済み。

> E-OC1 判定案: 質問0問。component boundary は承認済み one-core-many-harnesses、canonical source / 6 harness projection / 4 self-install、既存 choke point 再利用で既決。architectural style は Bun/TypeScript の repository-local modular monolith と class-free functional domain style で既決。communication は既存 CLI の同期 in-process 呼出しと filesystem/Git artifact で既決し、network service は scope 外。data ownership は core source、harness source、generated dist、intent state/audit の現行所有境界で既決。integration は NFR-2/NFR-7 により既存 schema・engine・packager・hook adapter の seam へ fail-closed/atomic に追加する一案だけが viable。plugin marketplace/lockfile、AWS service、user-facing UI は明示的 scope 外。ADR ではこれらの既決制約から不採用となる代替案を記録し、新規仕様判断は行わない。

> 承認: leader E-OC1 承認 2026-07-20T07:38:30Z。質問0問、新規仕様判断なし。
