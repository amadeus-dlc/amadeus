# Unit Test Instructions — 260810-tla-applicability-wiring

上流入力（consumes 全数）: `code-generation-plan.md`（Step 1〜6 の TDD スライスとテスト番号予約 t524〜t529 を消費）、`code-summary.md`（Red/Green 証跡の正本として消費）

## 対象と実行

unit 層の患部テストは 2 本（実 FS 非依存の純関数検証は unit、実 FS を触る検証は integration へ — `cid:code-generation:fs-tests-integration-first`）:

```sh
bun test tests/unit/t436-tla-evidence-identity.test.ts tests/unit/t444-advisory-declaration.test.ts tests/unit/t113.test.ts --timeout=30000
```

- `t436` — stable-id 抽出文法（FR-2 の拡張後契約。旧3桁ピンの明示改訂 1 件は code-summary 申告済み）
- `t444` — advisory 宣言 parse（formalCheckArgv null/argv 両側 — 無改変ピン）
- `t113` — directive validator（`handoff_stage` の負側 assert を追加）

## 合否基準

全 pass / 0 fail。旧文法ピンの改訂は t436 の 1 箇所のみで、他の unit ピンは無改変で green であること。
