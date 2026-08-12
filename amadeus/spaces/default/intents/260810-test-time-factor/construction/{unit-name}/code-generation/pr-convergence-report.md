# PR Convergence Report — TEST_TIME_FACTOR

## 判定

- kind: `not-applicable-yet`
- converged: `false`
- pull request: `none`
- observed at: `2026-08-10T17:21:18Z`

## 根拠

- 本 Intent では Pull Request の作成を依頼されていない。
- base conflict、review thread、required check の PR 三面は観測対象が存在しないため、収束済みとは判定しない。
- この N/A は PASS の代用ではなく、PR boundary に未到達という事実の記録である。

## 現在の検証面

- focused tests: `55 pass / 2 live-skip / 0 fail`。
- final override / runner bypass focused tests: `31 pass / 0 fail`。
- typecheck / lint / source-only / timing guard / diff check: exit `0`。
- CI-equivalent full suite: 最終差分で `TEST_TIME_FACTOR=2 bun run test:ci` を単一実行し、`972` files / `13063` assertions / `0` failures、`RESULT: PASS`。
- stable unit tier: `407` files / `6203` assertions / `0` failures。
- guard bypass focused tests: `9 pass / 0 fail`。禁止sinkのallowlist登録、直接final override、二重係数適用をfail-closedに確認した。

## 次の境界

- Pull Request を作成する場合は、PR 作成後に mergeability、未解決 review thread、required checks を再観測して report を更新する。
