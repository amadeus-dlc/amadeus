# Bolt Plan: Solo Standing Grant

## 計画入力と実行方針

本計画は `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md` を入力とする。optional inputの`stories.md`と`mockups.md`は本scopeでは存在しない。DAGの `grant-authorization-domain → solo-gate-transaction → harness-contract-and-regression` を守り、2 Boltを逐次実行する。

`team-practices.md`のWalking Skeleton規則により、`amadeus-feature`の最初のConstruction Boltはhuman-only gateとする。Standing grantはこのgateを認可しない。ブランチは最新`origin/main`から作成済みの`codex/solo-standing-grants`を使い、短命branchとPull Requestで`main`へ統合する。

## Bolt 1: safe-solo-grant-skeleton

- Units: `grant-authorization-domain`、`solo-gate-transaction`
- Walking Skeleton: Yes
- 実行形態: 依存順を守って同一Bolt内で統合する
- 担当: amadeus-developer-agent

### Proves

監査ledger、directive carrier、route receipt、report transport、state approval lockを端から端まで接続し、solo modeの通常gateを有効grantで承認できることを証明する。同時にroute後のexpiry/revoke/substitutionではstageを完了せず、error auditなしでhuman gateへ戻ることを証明する。

### Definition of Done

- solo modeで既存TTL/取消契約を保ったgrant発行・取消ができる。
- routeでexact Grant IdとRoute Idを持つprotected receiptが記録される。
- commit lock内で同じreceiptとgrantを再検証する。
- successの`GATE_APPROVED`に正確なGrant Idが記録される。
- expected invalidityで`GATE_APPROVED`、`STAGE_COMPLETED`、`ERROR_LOGGED`、state advanceが0件となる。
- reject、Request Changes、halt-and-askをgrantが認可しない。
- phase-boundary、walking-skeleton、per-unit all-covered policyの関連testがgreenになる。
- stage body、reviewer、sensor、§13 learningsが初回だけ実行され、fallbackでは再実行されない。

### Expected Demo

決定的clockを使った統合fixtureで、grant-backed successとroute後revoke fallbackを連続実行し、directive、state、audit deltaを比較する。Bolt 1自身のConstruction gateはhuman approvalで通過する。

## Bolt 2: harness-compatibility-and-convergence

- Unit: `harness-contract-and-regression`
- Walking Skeleton: No
- 実行形態: Bolt 1の公開契約を入力として逐次実行する
- 担当: amadeus-developer-agent

### Proves

canonical conductor contractがClaude、Codex、Cursor、Kiro、Kiro IDE、OpenCodeへ同一意味論で投影され、team modeのleader/delegationと既存human approvalを回帰させないことを証明する。

### Definition of Done

- 全6 harnessがgrant-backed route→report→typed fallback→human再開を同じ意味で記述する。
- team modeのdirective、state、audit、leader/delegation fixtureが変更前と一致する。
- `amadeus-feature`のwalking-skeleton分類、phase-boundary、per-unit最終gateの回帰testがgreenになる。
- help、doctor、state-machine referenceの公開契約が実装と一致する。
- type check、関連test、全test、`dist:check`、`promote:self:check`がすべてexit 0になる。

### Expected Demo

全harness生成後のdrift 0、team/solo integration suite、全testの結果を提示し、frozen [PR #1468](https://github.com/amadeus-dlc/amadeus/pull/1468) に依存していないdiffを確認する。

## 完了境界

Bolt 1は安全なcore transactionを実証し、Bolt 2は配布・互換性・repository全体の収束を実証する。release、version bump、npm publish、外部service導入は含めない。
