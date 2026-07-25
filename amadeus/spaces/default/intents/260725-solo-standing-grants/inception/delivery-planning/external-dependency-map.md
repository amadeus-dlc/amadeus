# External Dependency Map

## 計画入力と結論

`requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md` を確認した。optional inputの`stories.md`と`mockups.md`は本scopeでは存在しない。その結果、Bolt 1またはBolt 2をblockする外部API、外部data availability window、外部team hand-off、規制承認はない。

## Gated Items

| Item | Type | Owner | Lead time | Blocks | Mitigation |
|---|---|---|---|---|---|
| Bolt 1 Walking Skeleton approval | Internal human gate | Repository maintainer | Interactive turn | Bolt 1 completion | 現行human gateを使用し、standing grantで自動承認しない |
| Pull Request review and CI | Repository integration | Repository maintainer / GitHub Actions | PR lifecycle | `main` integration | branch上で全checkを先に通し、review可能なdiffを作る |

## Non-blocking Dependencies

- Bun、TypeScript、既存test harnessはrepository内の既存toolchainを使用する。
- GitHub Release、npm publish、version bumpは本Issueの完了境界外であり、どのBoltもblockしない。
- frozen [PR #1468](https://github.com/amadeus-dlc/amadeus/pull/1468) は設計参考に限り、コード依存・merge・cherry-pickを行わない。

## Escalation Boundary

新しい外部service、credential、network dependencyが必要と判明した場合はscope expansionとして停止し、ユーザー承認を得る。現時点では該当なし。
