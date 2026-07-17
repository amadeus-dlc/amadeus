# Scope Document

## 上流入力

本 Scope は [`intent-statement.md`](../intent-capture/intent-statement.md)、[`feasibility-assessment.md`](../feasibility/feasibility-assessment.md)、[`constraint-register.md`](../feasibility/constraint-register.md) を消費し、[Issue #1157](https://github.com/amadeus-dlc/amadeus/issues/1157) と [`scope-definition-questions.md`](./scope-definition-questions.md) のユーザー裁定で境界を確定する。

- **Workflow scope**: `amadeus`
- **Initiative type**: Brownfield feature
- **Depth / test strategy**: Standard / Comprehensive
- **Feasibility**: Conditional GO
- **Sequencing**: Risk-first

## Scope Statement

`AMADEUS_USE_SWARM` を unset、`claude-ultra`、`codex-ultra` のハーネス相対 enum として決定的に解釈し、Claude と Codex の通常経路を同一セッション内 native subagent fan-out に揃える。

利用者が指定値から実際の実行方式を予測でき、旧値・未知値は副作用前に失敗し、他ハーネス専用値の降格は利用者表示と監査で追跡できる状態を、実装・配線・test・文書・生成物まで同じ Intent 内で完成させる。

## Minimum Viable Outcome

次の条件がすべて満たされたときだけ、本 Initiative は最小価値を届けたとみなす。

1. unset、`claude-ultra`、`codex-ultra` の選択結果が harness 別 decision table と一致する。
2. 旧値 `1` と未知値が dispatch／worktree／worker／`SWARM_STARTED` より前に fail-closed する。
3. 他ハーネス専用値が session 内 native floor へ loud-degrade し、`SWARM_DEGRADED` に同じ requested driver が残る。
4. Codex の通常 floor が headless `codex exec` を使わず、native subagent を spawn・回収する。
5. prepared Unit worktree への隔離書き込みが実証される。
6. `prepare`、`check`、`finalize` の既存意味論が回帰しない。
7. source、harness、tests、docs、dist、self-promoted assets が同じ契約へ同期する。

## In Scope

| Scope ID | Capability | Boundary | Priority |
|---|---|---|---|
| S-01 | Worktree isolation evidence | native child が prepared Unit worktree へ隔離書き込みできることを実証。失敗時は Initiative を停止 | Must |
| S-02 | Deterministic enum validation | raw env と実行 harness から、selected driver／degraded-from／error を決定し、未知値を副作用前に拒否 | Must |
| S-03 | Claude conductor wiring | unset の native floor、`claude-ultra` の Dynamic Workflow、`codex-ultra` の loud-degrade、`1`／未知値の fail-closed | Must |
| S-04 | Codex conductor wiring | unset の native floor、`codex-ultra` の ultra request、`claude-ultra` の loud-degrade、headless floor の撤去、spawn／回収／retry | Must |
| S-05 | Kiro consumer synchronization | unset の既存 native floorを維持し、両 ultra 値を loud-degrade、`1`／未知値を fail-closed。新 driver は追加しない | Must |
| S-06 | Referee vocabulary and audit | driver 語彙を一対一に揃え、`--degraded-from` と `SWARM_DEGRADED` を同期。三サブコマンド意味論は維持 | Must |
| S-07 | Contract and live verification | decision matrix、invalid-value side-effect zero、degradation audit、referee regression、Codex native live evidence | Must |
| S-08 | Documentation and onboarding | 新しい値、breaking removal、harness 相対 semantics、Codex floor、既知の effort evidence 制約を正本へ反映 | Must |
| S-09 | Generated-asset parity | source から dist／self-promoted skill／root onboarding を既存生成経路で同期し drift をゼロにする | Must |

Must が多いのは、単一の breaking contract を利用可能な状態で着地させるために各面が不可分だからである。Must を削って adapter／契約／文書だけを先行させることは許可しない。軽量性は Must の省略ではなく、後述の Won’t を厳格に保つことで確保する。

## Out of Scope / Won't Have

- provider 内部の actual reasoning effort telemetry の新設
- `SubagentStart` を含む汎用 subagent observability 基盤の新設
- 汎用 driver registry、adapter hierarchy、複数設定体系
- 旧値 `1` の互換シム、deprecation 期間、二重読み
- headless `codex exec` を fallback として残すこと
- Herdr または別 messaging／agent orchestration 基盤との統合
- Kiro／Kiro IDE 向けの新しい ultra driver
- referee `prepare`、`check`、`finalize` の意味論変更
- upstream v2.3.0 の referee 設計変更
- AWS account／service／resource／IaC の変更
- 固定の行数、費用、納期を合否 budget とすること

## Conditional Boundary

S-01 は Requirements で Codex floor を確約する前の hard stop である。

| 結果 | Scope action |
|---|---|
| Unit worktree への隔離書き込みが成立 | S-02 以降を確約し、risk-first sequence を継続 |
| writable-root／cwd 制約で不成立 | fallback を追加せず No-Go。Intent owner へ再裁定を依頼 |
| `ultra` request が API に拒否される | `codex-ultra` を確約せず No-Go |
| request は受理されるが actual honor telemetry がない | 既知制約として開示し、受理＋child completion を現在の証拠限界とする |

## Capability Dependencies

| Predecessor | Successor | Dependency reason |
|---|---|---|
| S-01 | S-02〜S-09 | native floor 自体が不成立なら後続投資を止める |
| S-02 | S-03〜S-06 | harness wiring と audit は一つの decision contract に従う |
| S-03〜S-06 | S-07 | wired behavior が揃ってから end-to-end matrix を検証する |
| S-07 | S-08〜S-09 | 検証済み契約だけを文書・生成物へ確定する |

各能力は dependency 上は分けて扱うが、公開契約・実装・配線が揃う前に独立リリースまたは契約だけの PR として着地させない。

## Value Stream Map

| Step | 利用者価値 | 主な能力 | Evidence |
|---|---|---|---|
| 1. 値を選ぶ | 三つの入力状態だけを理解すればよい | S-02、S-08 | decision table、runtime help |
| 2. dispatch を決定する | 同じ入力と harness から同じ結果を得る | S-02〜S-05 | matrix tests、invalid-value tests |
| 3. session 内で実行する | 外部 worker を使わず native fan-out の結果を回収する | S-01、S-03、S-04 | live spawn／collection／worktree evidence |
| 4. 収束を判定する | 既存の安全な referee lifecycle を維持する | S-06、S-07 | prepare/check/finalize regression |
| 5. 結果を監査する | 降格と実 driver を再現できる | S-06、S-07 | `SWARM_DEGRADED`／`SWARM_*` audit |
| 6. 配布後も同じ挙動を得る | source と installed harness の drift がない | S-08、S-09 | dist／promote／packaging checks |

Text fallback: **select → validate → native session execution → referee convergence → auditable result → generated parity**。

## Delivery Strategy

Risk-first を採用し、価値公開より先に不確実性を閉じる。

1. worktree isolation を live evidence で判定
2. enum validation と driver／audit 語彙を一つの契約として固定
3. Claude／Codex／Kiro consumer を同じ契約へ配線
4. matrix／negative／referee／live tests で振る舞いを確認
5. docs／onboarding／生成物を同期して一つの完結した変更として着地

hard deadline、固定費用、固定 LOC cap はない。Units Generation では各 Unit に概算行数レンジを必須とし、凝集性と伝播面から過大化を審査する。

## Acceptance Boundary

完了判定には次をすべて要求する。

- S-01〜S-09 が受け入れ証拠へ trace する
- `1` と未知値の全ケースで副作用がゼロ
- mismatch の全ケースで user-facing message と audit が一致
- Codex の source／dist／installed guidance に headless swarm floor が残らない
- `prepare`、`check`、`finalize` の既存回帰が green
- Kiro 系に旧 `1` no-op が残らない
- actual ultra honor が非可観測であることを、実測済みと誤表現しない
- adapter／contract／docs だけの未配線成果がない

## Change Control

次の提案は scope change として Intent owner の再承認を必要とする。

- actual effort telemetry、汎用 driver stack、外部 messaging、新 Kiro driver の追加
- referee 意味論または worktree lifecycle の再設計
- 旧値互換期間の導入
- S-01 不成立時の fallback 追加
- Units Generation で旧 driver stack に相当する広範な adapter 群が必要と判明した場合
