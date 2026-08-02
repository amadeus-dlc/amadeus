# Build and Test Summary — vocab-canonicalization

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

- `code-generation-plan.md` の実行形態・完了条件と `code-summary.md` の実測値(PR #2044、head b783fe45c、検証表)を本書の前提として参照した

## 総括

PR #2044(head `b783fe45c`、base = origin/main `bf8de21f7` へ再接地済み、未マージ)に対し、ローカル(builder+conductor 独立)とリモート CI の三系統で検証した。全系統 green。

- 検証済みの面: 型・lint・13面 drift(dist/self-install)・投影 drift(4面)・全テストスイート・patch coverage(332/332/0/0)・落ちる実証・リモート CI 全ジョブ
- **未検証の面の明示**(cid:build-and-test:verdict-names-unverified-facets): (a) PR マージ後の main 上での挙動(マージはユーザー承認待ち) (b) 他ハーネス実機での knowledge ロードの実挙動(投影 byte 同一性までを静的に保証 — FR-3 の検証形どおり)

## verdict

**READY(条件付き)** — 条件 = PR #2044 のマージ着地(ユーザー承認)。ステージ成果物としての検証は完了。
