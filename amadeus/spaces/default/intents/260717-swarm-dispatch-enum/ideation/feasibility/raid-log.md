# RAID Log

## 上流入力と裁定

本 RAID Log は [`intent-statement.md`](../intent-capture/intent-statement.md)、[`feasibility-questions.md`](./feasibility-questions.md)、[Issue #1157](https://github.com/amadeus-dlc/amadeus/issues/1157) を根拠とする。

2026-07-17T22:01:28Z の裁定は Conditional GO である。open blocker は隠さず、指定した期限までに証拠が得られない場合は No-Go へ遷移する。

## Risks

| ID | Risk | Likelihood | Impact | Treatment | Owner / Due |
|---|---|---:|---:|---|---|
| R-01 | native child が prepared Bolt worktree へ安全に書き込めず、Unit isolation が成立しない | High | Critical | avoid: Requirements 確約前に live probe。失敗時は fallback せず停止 | Architect / Requirements 前 |
| R-02 | `ultra` request は受理されても actual effort が honor された証拠を取得できない | High | Medium | accept with disclosure: 指定受理と実適用を区別し、telemetry を成功条件に偽装しない | Product + Quality / Requirements |
| R-03 | env 解釈が conductor prose に残り、未知値が silent floor へ流れる | High | High | mitigate: machine-testable な最小 validation boundary と副作用ゼロ test | Architect + Developer / Design |
| R-04 | source、harness、onboarding、docs、dist の同期で変更範囲が再膨張する | Medium | High | mitigate: source ownership と generator を利用し、Unit ごとの概算行数レンジを gate | Delivery / Units Generation |
| R-05 | Kiro／Kiro IDE の旧 `1` no-op が新しい共通 env 契約と矛盾する | Medium | Medium | mitigate: Scope Definition で consumer inventory と対象外理由を確定 | Product + Architect / Scope Definition |
| R-06 | session concurrency slot が Unit 数より少なく、大規模 batch が同時起動できない | High | Low | accept: wave／逐次回収を正規動作にし、正しさを最大並列数に依存させない | Architect / Functional Design |
| R-07 | retry 時に Unit と native agent/result の対応を失い、誤った worktree を完了扱いにする | Medium | High | mitigate: session-local identity、Unit mapping、再検証を契約化 | Architect + Quality / Functional Design |
| R-08 | 旧 PR #982 の driver stack を再利用し、product 本体級の変更へ戻る | Medium | Critical | avoid: 汎用化・adapter 復活を禁止し、scope／units／approval gate で停止 | Intent owner / 全 gate |
| R-09 | `SubagentStart` と effort が監査されず、native 実行の開始証跡が弱い | High | Medium | mitigate: 既存 swarm lifecycle と completion evidence を正本にし、監査限界を明記 | Quality / Requirements |

## Assumptions

| ID | Assumption | Evidence | Validation / Expiry |
|---|---|---|---|
| A-01 | Codex native subagent tool は `reasoning_effort=ultra` request を child 実行へ渡す | API が指定を受理し、三 child が完了 | actual honor は非可観測。provider contract 変更時に再評価 |
| A-02 | Claude と Codex の通常 floor は同一セッション内 fan-out として利用者価値を満たす | Issue #1157 と live Codex parallel probe | Claude 側 contract test と Codex live acceptance で再確認 |
| A-03 | `prepare/check/finalize` は dispatch方式を知らず、driver 語彙以外の変更を必要としない | current core scan と t134／t135 の責務 | design diff で再確認 |
| A-04 | project minimum Codex CLI `0.139.0` は native role payload の前提を満たす | doctor pin、docs、現環境 `0.144.5` | lower-bound fixture は不足。必要なら Requirements で追加 |
| A-05 | AWS／regulated data の追加要件はない | Q2=A、Q6=A、repository-only change | Scope が infrastructure／data 処理へ広がった時点で失効 |
| A-06 | PR #1183 は swarm surface を変更せず、state tool の安全修正だけを追加する | changed-files review と rebase 後の clean conflict result | main 更新時に再確認 |

## Issues

| ID | Current issue | Severity | Evidence | Required action |
|---|---|---:|---|---|
| I-01 | native spawn API に child 固有 `cwd` がなく、prepared worktree isolation が未証明 | Blocker | live tool contract と code scan | Requirements 前に write-isolation probe |
| I-02 | `AMADEUS_USE_SWARM` を読む TypeScript boundary がなく、未知値 fail-closed は prose だけでは保証不能 | High | repository scan | 最小 validation boundary を requirements/design に固定 |
| I-03 | Codex `SubagentStart` は event 名のみで、hook registration／consumer／test がない | Medium | Codex emit・adapter・packaging scan | 監査要件との適合を Requirements で判断 |
| I-04 | audit payload に model／reasoning effort がなく、`ultra` honor を証明できない | Medium | live result、fixture、core hook scan | accepted limitation として文書化。成功証拠に含めない |
| I-05 | Codex swarm arm は依然として headless `codex exec` を prose で要求する | High | source／dist／self-promoted skill と docs | source 正本から置換し、生成物を同期 |
| I-06 | current driver enum は `subagent | ultracode` で新しい env 語彙と一致しない | High | `amadeus-swarm.ts` scan | 一対一語彙へ最小更新し negative tests を追加 |

## Dependencies

| ID | Dependency | Type | Failure mode | Response |
|---|---|---|---|---|
| D-01 | Codex session native subagent API | Platform | spawn／collection／effort request surface が変更される | minimum version と live acceptance を再検証 |
| D-02 | Git worktree と `amadeus-swarm prepare` | Internal | child が prepared path を書けない、または Unit isolation を破る | C-13 hard stop。fallback 禁止 |
| D-03 | `amadeus-swarm check/finalize` | Internal | native dispatch の結果を既存 referee が判定できない | referee semantics を変えず contract mismatch を修正 |
| D-04 | harness package／promote pipeline | Build | source と dist／self-promoted assets が drift する | dist:check、promote:self:check、packaging tests |
| D-05 | GitHub Issue #1157 と Intent Mirror #1182 | Governance | mirror が正本扱いになり裁定が分岐する | record→Mirror の一方向同期を維持 |
| D-06 | Kiro／Kiro IDE consumer inventory | Scope | 旧値 `1` または未知値の扱いが harness 間で silent divergence する | Scope Definition で明示裁定 |

## Escalation Thresholds

次のいずれかが発生した時点で自律的に先へ進まず、Intent owner へ差し戻す。

1. prepared Unit worktree への隔離書き込みが一つでも成立しない
2. `codex-ultra` の不成立を headless process または別 driver への fallback で隠す必要が生じる
3. 変更が referee semantics、汎用 driver stack、外部 messaging 基盤へ拡大する
4. Units Generation で adapter／contract だけが独立 Unit となり、実装＋配線と同じ Intent に揃わない
5. Kiro を含む既存 consumer の扱いを決めずに共通 env contract を確約しようとする
6. `ultra` honor の非可観測性を隠し、実測済みとして表現しようとする
