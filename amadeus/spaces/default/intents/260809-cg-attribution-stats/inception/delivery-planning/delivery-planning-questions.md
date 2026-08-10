# Delivery Planning Questions — CG 観測可能区間と帰属不能残余

## 質問方針

Depth Standard の総質問予算は最大8問である。semi autonomy の質問モード裁定は `Guide me`（AUTO_DECIDED `auto-decision-a3514ae45a0ce52dc6f582cf24851f53`）となった。

上流入力は `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md` である。Issue #2695 のFR 25件、NFR 7件、完了条件1〜10はすでに全数mappingされているため、ここではスコープを再選別せず、deployable Bolt境界だけをmaterial decisionとして裁定する。

## Q1. Bolt granularity and sequencing

U-04がU-01〜U-03すべてに依存し、4 Unitを合わせて初めて既存CLIから3 renderer・pipe検証までを貫くdeployable sliceになる。このDAGとteamのwalking-skeleton-first規則を同時に満たすBolt境界をどれにしますか。

A. U-01〜U-04を1つのwalking-skeleton Boltへ束ね、Bolt内で`U-01 → {U-02,U-03} → U-04`の依存順とUnit別source/test ownershipを守る（推奨）
B. 1 Unit = 1 Boltとして4 Boltへ分け、U-04を最後に置く
C. U-01〜U-03をfoundation Bolt、U-04をintegration Boltとして2 Boltへ分ける
X. Other (please specify)

[Answer]: A — U-01〜U-04を1つのwalking-skeleton Boltへ束ね、Bolt内で依存順とUnit別ownershipを守る（E-AUTO-DP-2695-Q1、AUTO_DECIDED `auto-decision-02b6d9296cf150d926ed2c55dce97f91`）。

## Q2. Sequencing heuristic and WSJF

[Answer]: walking-skeleton-firstとrisk-firstのhybrid。Bolt候補が1件だけなのでWSJF scoreは使わず、Bolt内の実装順をDAGと最大リスクで決める。U-01でclosed contract、U-02/U-03でevidence/interval risk、U-04でcompatibility/renderer/pipe integrationを閉じる（E-DP-2695-Q2、根拠: `unit-of-work-dependency.md`、team `Walking Skeleton`）。

## Q3. Parallelism policy

[Answer]: Bolt間並行は行わない。単一Bolt内ではU-01完了後のU-02/U-03だけがDAG上並行可能だが、同一worktreeでcoverageを競合実行せず、Unit別source/test ownershipと依存contractを維持する（E-DP-2695-Q3、根拠: `unit-of-work-dependency.md`のparallel development opportunities）。

## Q4. External dependencies

[Answer]: 外部API、data availability window、外部team hand-off、application deploymentは0件。Constructionが消費するのはrepository内の既存journal/Event Set contracts、Bun toolchain、既存test runnerだけである。version bump、tag、GitHub Release、npm publishは本IntentのBoltに含めない（E-DP-2695-Q4、根拠: team `Deployment`、`unit-of-work.md` Shared Definition of Done）。

## Q5. Risk priority

[Answer]: 最優先は (1) measured population非退行、(2) candidate primary reasonの一意性、(3) population-wide interval会計恒等式、(4) 3format semantic parityとoversized pipe完全性。各リスクを対応UnitのTDD/PBT/integration evidenceでBolt gate前に閉じる（E-DP-2695-Q5、根拠: `requirements.md` FR-POP-3、FR-EVT-5、FR-INT-4、FR-OUT-4、FR-TEST-3）。

## Q6. Bolt ownership and confidence hypothesis

[Answer]: team-formationはSKIPのため、唯一のBoltを`amadeus-developer-agent`が所有する。出荷仮説は「同じcorpusとargvから、既存measured統計を変えず、明示evidenceだけのobservable/unattributable会計をMarkdown/CSV/JSONで決定的に再現し、各formatの65,536 bytes超pipeを完全にdrainできる」である（E-DP-2695-Q6、根拠: `requirements.md`と`unit-of-work-story-map.md`）。

## Ambiguity analysis

- 「単一Bolt」は単一Unitへの再統合ではない。U-01〜U-04の変更理由、public contract、source/test ownershipは維持し、Construction gateだけをdeployable slice単位へ束ねる。
- user-storiesとmockupsはscopeでSKIPされている。要件→設計→Unitのdirect traceを使い、未生成artifactを推定作成しない。
- Bolt候補が1件なので経済的な相対順位は存在しない。WSJFの架空scoreを作らず、Bolt内部のtopological/risk orderを明示する。
- Q1はAUTO_DECIDEDで解消し、未解消のmaterial ambiguityはない。

## 裁定の記録

Q1はE-AUTO-DP-2695-Q1として採用した。artifact生成後のplan approvalをここへ追記する。

## Delivery plan approval

B-01を唯一のwalking-skeleton Boltとし、U-01〜U-04を内部DAG順に実行するDelivery Planを承認しますか。

A. Approve Plan（推奨）
B. Revise Plan
X. Other (please specify)

[Answer]: A — Approve Plan（E-AUTO-DP-2695-PLAN、AUTO_DECIDED `auto-decision-e0698305b31a6d7f0f43e01980e38c7c`）。
