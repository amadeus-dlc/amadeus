# External Dependency Map

> 上流入力（consumes 全数）: `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`

## Dependency Policy

`requirements.md`は`gh`を任意依存とし、GitHub failureでworkflowを止めない。`components.md`のC5だけがGitHub process境界を所有し、`unit-of-work.md`と`unit-of-work-dependency.md`ではGatewayとstateを分離する。`unit-of-work-story-map.md`のAS-05／AS-08と`team-practices.md`のfake／integration test姿勢に従い、live GitHubはsmokeだけのgated dependencyとする。

## Gated Items

| ID | Dependency | Owner | Lead time | Blocks | Gate／evidence | Mitigation |
|---|---|---|---|---|---|---|
| EXT-01 | `gh` CLI availability | 実行環境owner | 即時〜環境準備 | Bolt 1 live smokeのみ | `gh --version`、readiness outcome | fake runnerで全通常testを実行 |
| EXT-02 | GitHub authentication | repository maintainer | 認証操作の時間 | Bolt 1 live smokeのみ | `gh auth status`相当のredacted判定 | 未認証をtyped pendingとして扱う |
| EXT-03 | Issue read／write／close permission | repository maintainer | 権限付与まで | Bolt 1 mutation smoke | dedicated test Issueまたは明示承認済みrepository | fake runnerでcreate／edit／close contractを検証 |
| EXT-04 | GitHub API／network availability | GitHub／network owner | 外部復旧次第 | live smokeのみ | retryable failure classification | workflowを継続し次boundaryでretry |
| EXT-05 | Walking skeleton approval | Intent owner | review時間 | Bolt 2開始 | Bolt 1 gate approval | worktreeとevidenceを保持してpark可能 |

外部team hand-off、data availability window、AWS resource、database、queue、webhookはない。新しいGitHub Appと専用credentialは作らない。

## Bolt Impact

### Bolt 1

EXT-01〜04はlive smokeへだけ影響する。unit、integration、failure-injection、root resolution testはfake runnerとlocal filesystemで完結する。live smokeを実行できない場合もBolt成果物とworkflowは保持し、未実施evidenceを明示する。

EXT-05は`team-practices.md`とorg walking-skeleton policyによる人間gateであり、技術failureではない。承認前にBolt 2へ進めない。

### Bolt 2

Bolt 2はlocal package／promote／docs生成が中心で、GitHub APIを必要としない。npm publish、GitHub Release、version bumpは本Intentのscope外であり、Bolt 2のexternal dependencyに含めない。

## Escalation and Workaround

| Condition | Action |
|---|---|
| `gh`不在／未認証 | typed diagnosticを保存し、install／auth手順を提示。fake suiteを継続 |
| permission不足 | repository identityと必要scopeだけを提示。token値を出力しない |
| rate limit／network | retryable warningを保持し、silent background retryを行わない |
| live Issue候補が曖昧 | 自動採用・create・edit・closeを禁止しhuman repairへ送る |
| walking skeleton未承認 | Bolt 1をparkし、Bolt 2を開始しない |

すべてのworkaroundは外部mutationを増やさず、Intent recordを正本として維持する。
