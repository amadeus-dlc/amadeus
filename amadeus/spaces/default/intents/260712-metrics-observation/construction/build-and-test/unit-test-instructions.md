# 単体テスト手順

## 対象と上流追跡

Standard戦略として、各 `code-generation-plan.md` と `code-summary.md` が定義するpure契約を検証する。FS/process境界はunitへ持ち込まずintegrationで検証する。

- U1: totalsの4キー写像。
- U2: snapshot core、CLI verdict、LOC/CCN集計、6 collectorの注入契約。
- U3: NFF分類・retry制御、固定文字列fixtureによるworkflow配線契約。

## 実行方法

```sh
bun tests/run-tests.ts --unit --filter 't220-run-tests-totals|t221-metrics-snapshot|t222-ci-snapshot'
bun tests/run-tests.ts --unit --filter t-test-size-drift
```

追加fixtureやproduction dataは不要である。各testが自身の固定値を所有し、共有可変状態を使わない。

## 合格基準

- 対象unitが全件passし、failed file/assertionが0であること。
- `t-test-size-drift` が16/16 passし、unit×Small ratchetおよびallowlist縮小契約を維持すること。
- coverage率だけを目標にせず、A/B/Cの受入契約とNFR数値境界を直接assertすること。
