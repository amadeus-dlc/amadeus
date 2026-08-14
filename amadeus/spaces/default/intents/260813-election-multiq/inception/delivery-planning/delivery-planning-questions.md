# Delivery Planning 質問 — Election CLI 多問対応

## Context

[requirements](../requirements-analysis/requirements.md)、[components](../application-design/components.md)、[unit-of-work](../units-generation/unit-of-work.md)、[unit-of-work-dependency](../units-generation/unit-of-work-dependency.md)、[unit-of-work-story-map](../units-generation/unit-of-work-story-map.md) を入力とする。team-formation成果物とteam practicesのBranching/Walking Skeleton/Deployment節は存在しないため、self-featureの既定として単一AI mobと現行worktree/branchを使う。

## Q1: sequencing heuristic は何か？

- A. risk-first。schema/compatibilityを先に固定し、次にmixed CLI、migration/formal、最後に配布・全体検証を行う
- B. value-first
- C. walking-skeleton-first
- D. WSJFのみ
- E.任意順
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。legacy/newの信頼境界とestablished preservationが最大の技術リスク）

## Q2: WSJF scoring を使うか？

- A. 使わない。全unitが同一Issueの必須scopeで、精度のない点数化よりrisk registerとDAGを使う
- B. value/time/riskを等価重みで使う
- C. riskを2倍重みで使う
- D. job sizeだけで並べる
- E.外部チームが採点する
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。business value差が観測できず、擬似的な数値を作らない）

## Q3: Bolt granularity は何か？

- A. 5 Bolt。依存が密な関連unitをbundleし、各Boltに検証可能なDoDを持たせる
- B. 8 unitを1 unit/1 Boltにする
- C. 全unitを1 Boltにする
- D. thin sliceでunitを分割し直す
- E.テストだけ別Boltにする
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。U2/U3とU6/U7の独立性を活かしつつhandoff数を抑える）

## Q4: Boltを並行実行するか？

- A. Boltは直列。Bolt内の非交差unitだけ並行可とする
- B. 全Boltを並行する
- C. 全unitを完全直列にする
- D. dependencyを無視して並行する
- E.外部CIだけ並行する
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。単一worktree/branchとcore共有ファイルのcollisionを避け、DAG上の独立作業だけを許す）

## Q5: external dependencies は何か？

- A. 外部API/チーム/データ待ちはなし。Bun、Java/TLC、GitHub/CI availabilityのみをtooling dependencyとして追跡する
- B. 新規AWS accountが必要
- C. 外部databaseが必要
- D.別チームschema承認が必要
- E.顧客データwindowが必要
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。repository内のself-featureで外部integrationを追加しない）

## Q6: 最初に低減するriskは何か？

- A. legacy canonical identity、mixed lifecycle、append-only repairの3点
- B. UI usability
- C. cloud cost
- D. network latency
- E. multi-region failover
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。FR-COMP、FR-RER、NFR-3/4に直結する）

## Q7: Bolt bundle / DoD / confidence / mob は承認できるか？

| Bolt | Units | DoD要約 | Confidence hypothesis | Mob |
|---|---|---|---|---|
| B1 | U1 | v2/legacy codecとPBT | canonical identityが全後続境界の安定基盤になる | AI Core Mob |
| B2 | U2,U3 | mixed tally + dual-read/store history | question別集計とrepairが既存blind storeを壊さない | AI Core Mob |
| B3 | U4,U5 | end-to-end mixed/rerun CLI | directiveだけでheld-only loopを完走できる | AI Integration Mob |
| B4 | U6,U7 | migration fidelity + TLC/model-map | legacy意味互換と形式不変量が独立証拠で成立する | AI Verification Mob |
| B5 | U8 | skill/build/full gates/norm | 配布面と単問回帰を含めIssueを完了可能にする | AI Release Mob |

[Answer]: Approve（E-OC1: full autonomy。DAGを満たし、全unitとstoryを被覆する）
