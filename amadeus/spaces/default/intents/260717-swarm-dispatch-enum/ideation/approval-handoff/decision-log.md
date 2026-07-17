# Ideation Decision Log

## Inputs and Coverage

本 log は [`intent-statement.md`](../intent-capture/intent-statement.md)、[`scope-document.md`](../scope-definition/scope-document.md)、[`intent-backlog.md`](../scope-definition/intent-backlog.md)、[`feasibility-assessment.md`](../feasibility/feasibility-assessment.md)、[`constraint-register.md`](../feasibility/constraint-register.md) と各 stage questions のユーザー回答を正本として、Ideation 中の裁定を時系列に集約する。

`competitive-analysis`、`team-assessment`、`wireframes` は対応 stage が scope により skip されたため存在しない。非適用事項を決定済み成果物として扱わない。

## Decisions

| ID | Date | Decision | Rationale / Evidence | Consequence |
|---|---|---|---|---|
| D-01 | 2026-07-17 | 新規 Intent 名を `swarm-dispatch-enum` とする | `issue-mirror` は `amadeus-mirror.ts` の意味であり Intent 名には使わないという Intent owner の指示 | record と branch の識別名を確定 |
| D-02 | 2026-07-17 | Workflow scope は `amadeus`、Brownfield、Standard、Comprehensive | Issue #1157 は self-hosted framework の公開契約変更 | Ideation では Market Research、Team Formation、Rough Mockups を skip |
| D-03 | 2026-07-17 | `AMADEUS_USE_SWARM` は unset、`claude-ultra`、`codex-ultra` の三状態に閉じる | 利用者の選択予測性と監査再現性 | 旧値 `1` と未知値は許可しない |
| D-04 | 2026-07-17 | Claude／Codex の unset は同一 session 内 native subagent fan-out | harness 間の通常 floor を同型化 | Codex headless `codex exec` floor を撤去 |
| D-05 | 2026-07-17 | 他ハーネス専用 ultra 値は native floor へ loud-degrade | 利用可能性を保ちつつ silent fallback を禁止 | user message と `SWARM_DEGRADED` の両方に requested value を残す |
| D-06 | 2026-07-17 | 旧 `1` と未知値は dispatch、worktree、worker、`SWARM_STARTED` より前に fail-closed | 互換シムは曖昧な二重契約を残す | side-effect-zero negative test が必須 |
| D-07 | 2026-07-17 | env、code type、audit driver を `subagent | claude-ultra | codex-ultra` に統一 | 追加の写像層を避ける | `ultracode` を廃止し、一対一語彙にする |
| D-08 | 2026-07-17 | referee の `prepare`、`check`、`finalize` 意味論を変更しない | 現行 referee は dispatch method を所有しない | driver 語彙以外の redesign は Won't |
| D-09 | 2026-07-17 | Feasibility は Conditional GO | native parallel spawn、collection、ultra request は成立。actual honor と worktree isolation は未証明 | 証拠限界を開示して進む |
| D-10 | 2026-07-17 | prepared Unit worktree isolation を Requirements 確約前の hard stop とする | native spawn API に child 固有 `cwd` がなく、隔離書き込みが未実測 | 不成立時は fallback せず No-Go |
| D-11 | 2026-07-17 | Kiro／Kiro IDE は共通 enum consumer として最小同期 | 旧 `1` no-op を残すと共通契約が分岐する | unset floor 維持、両 ultra は loud-degrade、未知値は fail-closed。新 driver は作らない |
| D-12 | 2026-07-17 | 六つの proto-capability はすべて Must | 契約、配線、検証、文書、生成同期のいずれかだけでは利用可能な変更にならない | Should／Could は置かず、軽量性は Won't 境界で確保 |
| D-13 | 2026-07-17 | dependency／risk-first を raw WSJF より優先 | 未証明基盤へ価値面を積み上げない | IB-01→IB-06 の順序を採用 |
| D-14 | 2026-07-17 | 固定 LOC、費用、期限 cap を設けない | 行数だけでは変更の凝集性を判定できない | Units Generation で各 Unit の概算行数レンジを審査 |
| D-15 | 2026-07-17 | telemetry、汎用 adapter、外部 messaging、新 Kiro driver、referee redesign は Won't | 旧 PR #982 の過大化を再発させない | 追加提案は scope change gate が必要 |
| D-16 | 2026-07-17 | source から dist、self-promoted harness、root onboarding を生成する | 生成物の直接編集は drift を生む | dist／promote／packaging parity checks を必須化 |
| D-17 | 2026-07-17 | Market Research、Team Formation、Rough Mockups の成果物は非適用 | 内部 framework 契約で visual UX を持たず、named mob は Unit 確定後に決める | `competitive-analysis`、`team-assessment`、`wireframes` を捏造しない |
| D-18 | 2026-07-17 | PR #1183 の main 更新を rebase で取り込む | active state tool への変更が含まれ影響あり | HEAD `cf7b75b4` 上で成果物と状態を維持 |
| D-19 | 2026-07-17 | Intent record を正本、Issue #1182 を一方向 mirror とする | 状態と裁定の二重管理を避ける | `amadeus-mirror.ts` で gate／stage boundary を同期 |
| D-20 | 2026-07-17 | Ideation の推奨は Conditional GO | 全 scope item は trace 済みだが C-13／C-14 は未充足 | Phase gate の承認後も hard stop は解除されない |

## Deferred Decisions

| ID | Decision point | Due | Owner | Stop condition |
|---|---|---|---|---|
| DD-01 | prepared worktree への child write mechanism と writable-root | Requirements で Codex floor を確約する前 | Architect + Developer | 隔離が証明できなければ No-Go |
| DD-02 | retry 時の Unit／agent／result identity | Functional Design 前 | Architect + Quality | 誤った Unit を完了扱いにする可能性が残れば承認しない |
| DD-03 | Unit 分割と概算行数レンジ | Units Generation | Architect + Delivery | 旧 driver stack 規模への再膨張、契約だけの Unit を拒否 |
| DD-04 | named mob、Bolt sequence、Construction schedule | Delivery Planning | Delivery + Intent owner | resource commitment なしに Construction を開始しない |

## Superseded or Rejected Alternatives

- 旧 PR #982 の driver stack を再利用する案は、過大化と未配線成果の再発リスクにより棄却した。
- `ultra` honor telemetry を本 Intent で新設する案は、公開契約の最小着地を超えるため棄却した。
- worktree proof 失敗時に headless `codex exec` へ戻す案は silent fallback になるため棄却した。
- Kiro 系へ新 ultra driver を実装する案は共通 consumer 同期を超えるため棄却した。
- adapter／contract／docs の先行 PR は完結した利用者価値を届けないため棄却した。
