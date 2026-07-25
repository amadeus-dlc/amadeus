# Unit Test Instructions — 260725-solo-standing-grants

上流入力（consumes 全数）: `construction/grant-authorization-domain/code-generation/code-generation-plan.md`、`construction/grant-authorization-domain/code-generation/code-summary.md`、`construction/solo-gate-transaction/code-generation/code-generation-plan.md`、`construction/solo-gate-transaction/code-generation/code-summary.md`、`construction/harness-contract-and-regression/code-generation/code-generation-plan.md`、`construction/harness-contract-and-regression/code-generation/code-summary.md`

- U1 の `code-summary.md` — `resolveOperatingMode`、`evaluateStandingGrantGateEligibility` を純関数として切り出した境界を引き、unit 層の対象を「実 FS に触れない判定ロジック」に限定した。
- U2 の `code-summary.md` — directive carrier の strict wire 検証と approval authority classifier が純判定であることを引き、carrier / classifier / process wire を unit 対象とした。
- U1 / U2 / U3 の `code-generation-plan.md` — 各 unit が宣言したテスト配置方針を引き、実 FS を使う検証を unit へ置かず integration へ送る配置根拠とした（`cid:code-generation:fs-tests-integration-first`）。

Test Strategy は `amadeus-state.md` の **Comprehensive**。

## 対象と配置方針

unit 層には純関数層のみを置く。audit shard の実ファイル走査、cursor 切替、lock を伴う transaction は integration 層が所有する。これは size purity ratchet の設計上の配置根拠であり、`project.md` の `cid:code-generation:c2-doctor-seam` に従う。

| ファイル | 所有する契約 | trace |
|---|---|---|
| `tests/unit/t-solo-standing-grant-domain.test.ts` | operating mode 解決、mode 別 query dispatch（team 側で solo scan を 0 回に保つ）、gate eligibility 判定行列（gate 不在 / per-unit 未完 / phase-boundary opt-in / walking-skeleton stance） | FR-06, FR-20, FR-21, FR-22, NFR-06 |
| `tests/unit/t-solo-gate-transaction.test.ts` | directive carrier の受理・拒否、非 run-stage directive への carrier 混入拒否、typed await-approval directive、approval authority classifier の排他性、strict single-line JSON wire、nonzero exit の fatal 維持 | FR-08, FR-10, FR-11, FR-15, NFR-04 |

## 実行方法

```
bun test tests/unit/t-solo-standing-grant-domain.test.ts tests/unit/t-solo-gate-transaction.test.ts
```

複数 path を列挙して実行する場合は、実行前に全 path の実在を機械確認し、実行後に runner の `Ran ... across M files` を期待ファイル数と照合する（`cid:build-and-test:test-path-set-completeness`）。bun は不存在 path を無音で除外したまま exit 0 になりうるため、green だけでは母集団の全数実行を保証しない。**zsh は未クォートのパラメータを単語分割しない**ため、path 集合は配列（`paths=(...)`）で保持して展開する。

## カバレッジ期待

Comprehensive 戦略の下でも、判定ロジックの分岐網羅を unit の責務とし、行カバレッジ数値は `bun tests/gen-coverage-registry.ts --check` の ratchet と patch gate に委ねる（本 intent で registry は exit 0）。unit 層は「1 FR につき最低1 trace」（NFR-07）を満たすことを合格条件とする。

## 実測結果

| ファイル | pass | fail | expect() | 所要 |
|---|---:|---:|---:|---:|
| `tests/unit/t-solo-standing-grant-domain.test.ts` | 14 | 0 | 19 | 60ms |
| `tests/unit/t-solo-gate-transaction.test.ts` | 27 | 0 | 31 | 48ms |

## テストデータ管理

fixture は各テストが自前で構成する synthetic audit event と固定 clock で、共有ミュータブル状態を持たない。TTL・expiry は固定値を注入し、実時間の経過待ちを行わない（`cid:build-and-test:wtfbt-c3`）。
