# Unit Test Instructions — formal-verif-value-chain

上流入力(consumes 全数): requirements, code-generation(各 unit の code-summary), unit-of-work

unit 層(純関数)は `bun test tests/unit/` — 本 intent の新設・改修分:

- `t-formal-verif-model-map-v2.test.ts`(u7 — 20 tests): v2 parse/validate(v1 loud 拒否含む)・FormalElection 機械移行の等価性・canonical/plugin 両複製への同一受理拒否テーブル(describe.each)。
- `t379-plugin-tools-distribution.test.ts`(u4): parseTools の正常・不正パス拒否・欠落時 []。
- u1 移設分の既存 unit テスト群(`t-formal-verif-canonical` / `t-formal-verif-tlc-toolchain` 等)は移設後パスで green 維持(21 pass 実測)。
- u2 削除分: D 専用 unit テスト 18 件を削除(3値判定 (i))、barrel 経由テスト 1 件を直 import へ書換((ii))。

実行形: `bash tests/run-tests.sh --ci` が smoke/unit/integration を統括(結果は build-test-results.md)。TDD の Red 実文は各 unit の code-summary.md に記録済み。
