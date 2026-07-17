# Feasibility Assessment

## 結論

本 Initiative の Feasibility は **Conditional GO** と判定する。

`AMADEUS_USE_SWARM` の三状態化、driver 語彙の置換、未知値の fail-closed、他ハーネス専用値の loud-degrade、Codex floor の session 内 native subagent 化は、現在の conductor と referee の責務境界を保ったまま実現できる見込みがある。

ただし、Codex native subagent が `amadeus-swarm prepare` で作成した unit 別 worktree へ隔離して書き込めることは未実測である。この条件を **Requirements で floor を確約する前の hard stop** とする。成立しない場合は、別方式へ黙って fallback せず Intent owner へ差し戻す。

## 上流入力と評価基準

本評価が直接消費する上流成果物は [`intent-statement.md`](../intent-capture/intent-statement.md) である。市場調査ステージは scope により skip されているため、`competitive-analysis`、`market-trends`、`build-vs-buy` は入力に存在しない。

判断根拠は次のとおりである。

- [Issue #1157](https://github.com/amadeus-dlc/amadeus/issues/1157) の 2026-07-17 改訂済み契約
- [`feasibility-questions.md`](./feasibility-questions.md) の Q1〜Q7 と、2026-07-17T22:01:28Z の Conditional GO 承認
- 現在の source、生成物、tests、Codex tool surface に対する三つの read-only native subagent probe
- 旧 [PR #982](https://github.com/amadeus-dlc/amadeus/pull/982) の過大化を示す対照証拠
- [PR #1183](https://github.com/amadeus-dlc/amadeus/pull/1183) を含む `origin/main` へ rebase した後の作業ツリー

Issue #1157 が示す「プロダクト増分 25 ファイル・18,342 行」は driver stack 部分の規模信号として扱う。GitHub 上の PR #982 全体は 2026-07-17 の確認時点で 365 changed files、+211,408 / -1,832 であり、Intent record や生成物を含む全体値と、プロダクト変更の信号を混同しない。

## 実測環境

| 項目 | 実測値 | 判定への意味 |
|---|---|---|
| 実測開始 | 2026-07-17T21:54:35Z | Q7 の evidence timestamp |
| Git HEAD | `cf7b75b4ca5fb487a6aaad6239242b91d0739eb0` | PR #1183 merge commit を含む |
| Codex CLI | `0.144.5` | project minimum `0.139.0` 以上 |
| Bun | `1.3.13` | 現行 TypeScript toolchain を利用可能 |
| `AMADEUS_USE_SWARM` | unset | 通常 floor の session 状態 |
| Operating mode | unset | solo mode。team-only coordination 規則は非適用 |

## Native Subagent Probe

reasoning effort に `ultra` を指定し、三つの read-only explorer を同一セッションから起動した。各 explorer は別のコード面を調査し、成果物編集は行っていない。

| Probe | 観測 | 判定 |
|---|---|---|
| Parallel spawn | root と三つの child が同時に `running` となった | 成立 |
| Collection | 三つすべての final result を親セッションで回収した | 成立 |
| Effort request | `reasoning_effort=ultra` を API が受理し、各 child が完了した | 指定面は成立 |
| Effort honor | `list_agents`、hook payload、監査のいずれにも実適用 effort が露出しない | 独立検証不能 |
| Unit cwd isolation | native spawn API に child 固有の `cwd` がなく、prepared Bolt worktree への書き込みは未実測 | open blocker |

この結果から、`codex-ultra` は「ultra を指定して child を完了できる」とまでは確認できるが、「provider が実際に ultra を honor したことを repository の証跡から立証できる」とは主張しない。

## 現行境界の成立性

### Conductor と環境変数

現行 `AMADEUS_USE_SWARM` の解釈は TypeScript ではなく各 harness の conductor skill に記述されている。Claude では `1` が Dynamic Workflow を選び、Codex では `1` が `ultracode` から headless `codex exec` floor への降格を指示する。このまま文言だけを置換すると、未知値を dispatch 前に必ず拒否することを機械検証できない。

三状態を一度だけ検証し、raw env、driver 型、監査語彙を同じ値で扱う決定的な validation boundary が必要である。これは汎用 driver stack や値の写像層ではなく、許可値と harness 相対の結果を閉じるための最小境界とする。

### Codex floor

Codex floor の `codex exec` は TypeScript launcher ではない。Codex conductor skill が live session に shell 起動を指示する prose 契約であり、core は worker process を起動しない。したがって floor 置換の中心は Codex conductor の正本と関連する onboarding・docs・contract tests である。

通常の Codex `mode: subagent` はすでに named native subagent spawn を要求しているため、同じ session 内 primitive を swarm arm でも利用すること自体は成立する。

### Referee

`amadeus-swarm.ts` は `prepare`、`check`、`finalize` と worktree／監査 lifecycle を担い、worker の起動方式を所有しない。`check` と `finalize` は driver 非依存であるため意味論を維持できる。

必要な core 変更は、閉じた driver 語彙を `subagent | claude-ultra | codex-ultra` に揃え、`--degraded-from` と `SWARM_DEGRADED` が同じ語彙を受けることに限定できる見込みである。

### Hooks と監査

Codex harness は `SubagentStop` を登録し、`agent_type` と `agent_id` を core audit hook へ渡す。一方、`SubagentStart` は event 名の定義だけで、登録・consumer・test がなく、監査にも model／effort は残らない。

この不足は parallel fan-out 自体を妨げないが、開始と effort の監査可能性を制限する。Initiative の成功条件は、既存の `SWARM_STARTED`／`SWARM_DEGRADED`／`SWARM_*` lifecycle と child completion を主要証跡とし、effort honor の非可観測性を既知制約として開示する。

## 評価サマリー

| 評価軸 | 判定 | 根拠 |
|---|---|---|
| 技術成立性 | Conditional GO | native parallel spawn・collection・ultra request は成立。unit cwd isolation は未証明 |
| 変更境界 | GO | conductor 正本、最小 validation、driver 語彙、tests・docs・生成同期に限定可能 |
| Referee 回帰 | GO | prepare/check/finalize は worker dispatch から独立 |
| 運用・監査 | Conditional GO | loud-degrade は既存 seam を利用可能。effort honor と SubagentStart は非可観測 |
| セキュリティ | GO with existing controls | 新しい credential、network、外部 service を導入しない。sandbox／worktree 権限は検証対象 |
| コンプライアンス | GO | 新しい PII、PHI、cardholder data、residency 対象を導入しない |
| AWS landscape | N/A | AWS account／service／resource の追加・変更なし |
| 費用・期間 | GO with scope control | 固定予算・期限なし。Units Generation の概算行数レンジと凝集性で審査 |

## AWS・Compliance Perspective

AWS Platform 観点では、本変更は repository 内の harness／conductor 契約で完結し、AWS service、account、region、IaC、cloud cost を変更しない。Infrastructure Design を追加実行する根拠はない。

Compliance 観点では、新しい個人データ・決済データ・医療データを処理せず、PCI-DSS、HIPAA、GDPR、data residency の追加適用はない。既存の監査完全性、append-only audit、意図しない credential 出力の禁止を維持する。

## GO Conditions

1. Requirements で Codex floor を確約する前に、native child が prepared unit worktree へ隔離書き込みできることを実証する。
2. 実証できない場合は fallback を追加せず、Initiative を停止して Intent owner へ差し戻す。
3. 旧値 `1` と未知値を、worker 起動・worktree 作成・`SWARM_STARTED` より前に fail-closed させる機械検証可能な境界を持つ。
4. 他ハーネス専用値は floor へ loud-degrade し、利用者表示と `SWARM_DEGRADED` の双方へ同じ値を残す。
5. `prepare`、`check`、`finalize` の意味論を変えず、既存回帰を維持する。
6. source を編集し、dist・self-promoted harness・root onboarding は既存 generator／promotion 経路で同期する。
7. Units Generation で全 Unit に概算行数レンジを付け、旧 driver stack 規模へ再膨張する場合は承認ゲートで停止する。

## No-Go Triggers

- prepared unit worktree への安全な隔離書き込みを native child で実証できない
- 未知値を prose だけで扱い、fail-closed を自動検証できない
- `codex-ultra` の不成立時に headless process や別 driver へ silent fallback する
- referee 意味論、汎用 adapter stack、外部 messaging 基盤へスコープが拡大する
- 実装・配線を伴わない契約または adapter だけの先行着地になる

## User Ruling

2026-07-17T22:01:28Z、Intent owner は Conditional GO を選択した。`ultra` は指定受理までを現在の証拠限界として明記し、prepared Bolt worktree の隔離書き込みを Requirements 確約前の停止条件とする。
