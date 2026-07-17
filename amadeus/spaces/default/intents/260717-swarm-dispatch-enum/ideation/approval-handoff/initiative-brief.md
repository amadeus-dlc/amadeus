# Initiative Brief

## Initiative Summary

| 項目 | 内容 |
|---|---|
| Intent | `swarm-dispatch-enum` |
| Source | [Issue #1157](https://github.com/amadeus-dlc/amadeus/issues/1157) |
| Mirror | [Issue #1182](https://github.com/amadeus-dlc/amadeus/issues/1182) — record からの一方向 mirror |
| Workflow scope | `amadeus` |
| Initiative type | Brownfield feature |
| Depth / test strategy | Standard / Comprehensive |
| Recommendation | **Conditional GO** |

本 brief は [`intent-statement.md`](../intent-capture/intent-statement.md)、[`scope-document.md`](../scope-definition/scope-document.md)、[`intent-backlog.md`](../scope-definition/intent-backlog.md)、[`feasibility-assessment.md`](../feasibility/feasibility-assessment.md)、[`constraint-register.md`](../feasibility/constraint-register.md) を統合する。

`competitive-analysis`、`team-assessment`、`wireframes` は、それぞれ Market Research、Team Formation、Rough Mockups が scope により skip されたため存在しない。市場・人員・visual design を推測で補完せず、非適用理由と後続の決定点を明示する。

## Intent and Problem

`AMADEUS_USE_SWARM` の旧 boolean 契約とハーネスごとに異なる worker 経路により、設定値から実際の dispatch、停止、降格を一貫して予測できず、監査証跡から選択結果を再現しにくい。

本 Initiative は、入力状態を unset、`claude-ultra`、`codex-ultra` の三つに閉じ、Claude／Codex の通常経路を同一セッション内 native subagent fan-out に揃える。旧値 `1` と未知値は副作用前に fail-closed、他ハーネス専用値は native floor へ loud-degrade させ、env・code type・audit driver の語彙を一対一にする。

主な受益者は Amadeus 利用者、framework／harness maintainers、quality・CI maintainers、documentation・release maintainers である。最終決定権は Intent owner と Amadeus maintainers が持つ。

## Validation and Evidence

外部市場を対象にした製品投資ではないため Market Research は非適用である。投資根拠は次の内部証拠に置く。

- Issue #1157 で確定した harness-relative enum 契約
- 旧 PR #982 が driver stack と未配線 adapter により過大化した実績
- 現行 conductor、referee、hook、audit、生成経路の repository scan
- 同一 Codex session で三 child を並列 spawn・回収し、`reasoning_effort=ultra` request が受理された live probe
- actual effort honor と prepared worktree isolation は未証明であるという明示的な証拠限界

## Scope Boundary

### Must

1. prepared Unit worktree への native child 隔離書き込み実証
2. harness-relative enum validation と副作用前 fail-closed
3. Claude、Codex、Kiro／Kiro IDE の最小 conductor 同期
4. `subagent | claude-ultra | codex-ultra` の referee／audit 語彙整合
5. decision matrix、negative、referee regression、live execution の検証
6. documentation、onboarding、dist、self-promoted assets の parity

### Won't

- actual effort telemetry や汎用 `SubagentStart` observability の新設
- 汎用 driver registry／adapter hierarchy
- legacy `1` compatibility、headless `codex exec` fallback
- 外部 messaging／agent orchestration、新 Kiro ultra driver
- referee `prepare`／`check`／`finalize` の意味論変更
- AWS infrastructure 変更、固定 LOC／費用／納期 cap

## Feasibility and Risk Highlights

総合判定は **Conditional GO** である。

| Risk / Constraint | 影響 | 合意済み対応 |
|---|---|---|
| R-01／C-13／C-14: prepared worktree isolation 未実証 | Critical | Requirements で Codex floor を確約する前に live proof。不成立なら fallback せず No-Go |
| C-15／R-02: actual `ultra` honor 非可観測 | Medium | request 受理と実適用を区別し、成功証拠を誇張しない |
| C-16／R-03: env 解釈が prose のみ | High | dispatch・worktree・audit より前の機械検証可能な最小境界を要求 |
| R-04: source／dist／docs の伝播で再膨張 | High | source ownership、既存 generator、Unit ごとの概算行数レンジで制御 |
| R-05〜R-07: Kiro drift、slot 制限、retry identity | Medium〜High | 最小 consumer 同期、wave 実行許容、Unit identity の契約化 |
| R-08: 旧 driver stack への回帰 | Critical | Won't 境界と各 gate の changed-files review で回避 |

代替緩和策は、未証明の native floor を headless process へ戻すことではない。proof が失敗した場合は Initiative を停止し、公開契約を再裁定する。

## Concept and Delivery Flow

```text
設定値
  → 副作用前の enum 検証
  → harness-relative driver 選択／明示的降格
  → 同一 session 内 native fan-out
  → 既存 referee の prepare／check／finalize
  → 利用者表示と audit
  → source／generated assets parity
```

Risk-first の実施順は次のとおりである。

1. IB-01: worktree isolation proof。失敗時は停止
2. IB-02: enum validation と decision matrix
3. IB-03: referee vocabulary と loud-degrade audit
4. IB-04: Claude／Codex／Kiro conductor wiring
5. IB-05: contract、negative、referee、live verification
6. IB-06: documentation、onboarding、generated parity

## Team and Resource Plan

Team Formation は skip されており、named human mob や calendar schedule は未定である。これは欠落を意味せず、Unit と依存が確定する前に人員を捏造しないための段階的決定である。

- Delivery Agent: dependency／risk-first sequence、Unit 規模、phase handoff
- Product Agent: requirements、scope、acceptance traceability
- Architect Agent: worktree isolation proof、decision boundary、Unit decomposition
- Developer Agent: conductor／referee／generator 実装
- Quality Agent: negative、matrix、live、regression、parity evidence
- Intent owner: hard stop、scope change、phase gate の最終裁定

Construction の mob composition、Bolt sequence、schedule は Inception の Units Generation と Delivery Planning で確定し、別の人間ゲートで承認する。固定の費用、期限、LOC cap は置かない。

## Handoff Contract

Ideation から Inception への handoff は、次の条件付きで成立する。

1. Reverse Engineering では現行 conductor、referee、harness source、tests、生成経路を差分 scan する。
2. Codex floor を Requirements で確約する前に、2 Unit 以上の prepared worktree で native child の隔離書き込み、親による結果回収、main／兄弟 Unit 非変更を実証する。
3. proof が不成立なら Requirement を弱めたり fallback を追加したりせず、No-Go として Intent owner へ戻す。
4. proof 成立後にのみ、三モード matrix、retry identity、wave behavior、audit evidence を testable requirement として固定する。
5. Units Generation では全 Unit に概算行数レンジを付け、契約／adapter だけの先行 Unit を作らない。
6. scope change は `scope-document.md` の Change Control に従い再承認する。

## Recommendation

**Conditional GO — Ideation の成果物は Inception 開始に十分である。**

Intent、Scope、Intent Backlog は整合し、全 scope item に feasibility backing がある。ただし worktree isolation は未達の成功条件であり、Inception の hard stop を通過するまで無条件 GO または実装可能性確定とは表現しない。
