# Units Generation Questions — ハーネス横断 live E2E

参照入力: `components`、`component-methods`、`services`、`component-dependency`、`decisions`、`requirements`。`stories`は本scopeで生成されていない。

> **E-OC1 既決照合:** Issue #1717、Requirements FR-1〜FR-11、Application Design C1〜C9と依存行列がunit境界、共通contract、transport差分、adapter別完了条件を定義済みである。Stage 2.8に属する経済的実装順序は質問しない。
>
> **leader 承認:** 2026-08-03T12:05:41Z

## 質問選定基準

質問対象は、unit境界またはDAGを変える矛盾・欠落に限定する。上流成果物間にそのような矛盾・欠落はない。

## 明確化質問

なし。共通基盤を2 unit、外部substrate差をadapter別10 unitへ分解する案をStage 2.7のPlan Approvalで裁定する。

## Decomposition Plan Approval

A. 共通基盤2 unit + transport別10 unit、全unit `kind: library`のDAGを採用する
B. unit境界またはDAGを修正する
X. Other (please specify)

[Answer]: A — ユーザー回答`1`により承認（E-OC1 leader承認 2026-08-03T12:08:19Z）

## Artifact Re-use — 後方ジャンプ再実行

A. 既存成果物を出発点として、walking-skeleton規律に合わせてUnit境界を修正する
B. 既存成果物を破棄し、ゼロから再作成する
C. 既存成果物を変更せず維持する
X. Other (please specify)

[Answer]: A — 既存成果物を出発点として、walking-skeleton規律に合わせてUnit境界を修正する。（ユーザー回答: `1`）

## 再実行時の質問回答モード

A. Guide me
B. Grill me
C. I'll edit the file
D. Chat
X. Other (please specify)

[Answer]: A — Guide me。（ユーザー回答: `1`）

## 再分割Plan

明確化質問は追加しない。Delivery Planningで確定した回答Aを、承認済みApplication Designのcomponent境界へ次のように適用する。

| ID | Canonical name | kind | 直接依存 | 境界 |
|---|---|---|---|---|
| U01 | `codex-live-walking-skeleton` | `library` | なし | C1〜C9の最小で完全な共通production kernelとCodex C5/C6をend-to-endで所有 |
| U02 | `live-e2e-common-hardening` | `library` | U01 | 公開contractを変えないnegative/property/failure-injection検証と安全hardeningを所有 |
| U03 | `claude-print-live` | `library` | U01, U02 | Claude print C5/C6とClaude family config seam |
| U04 | `claude-sdk-live` | `library` | U01, U02, U03 | Claude SDK C5/C6 |
| U05 | `claude-tui-live` | `library` | U01, U02, U03 | Claude TUI C5/C6 |
| U06 | `kimi-print-live` | `library` | U01, U02, U04, U05 | Kimi print C5/C6とPhase 1完了証跡の消費 |
| U07 | `kiro-acp-live` | `library` | U01, U02, U04, U05 | Kiro ACP C5/C6とPhase 1完了証跡の消費 |
| U08 | `kiro-tui-live` | `library` | U01, U02, U04, U05 | Kiro TUI C5/C6とPhase 1完了証跡の消費 |
| U09 | `kiro-ide-live` | `library` | U01, U02, U04, U05 | Kiro IDE C5/C6とPhase 1完了証跡の消費 |
| U10 | `cursor-live-closure` | `library` | U01, U02, U06〜U09 | Cursor capability closure、Phase 2完了証跡の消費、成立時C5/C6 |
| U11 | `opencode-live-closure` | `library` | U01, U02, U06〜U09 | OpenCode capability closure、Phase 2完了証跡の消費、成立時C5/C6 |

U01は単独の1 Unit / 1 Bolt / 1 PRでwalking skeletonを形成する。U02はU01のproduction contractを再定義せず、共通基盤のadversarial verificationとadditive hardeningを独立成果物として追加する。transport UnitはU02を共通安全基盤として消費し、Claude SDK/TUIだけがClaude printのfamily seamにも依存する。全UnitはBun test processへembeddedされる`library`であり、新しいservice/UI/deployment targetは追加しない。

## Revised Decomposition Plan Approval

A. 11 Unitの再分割Planを承認する
B. Unit境界またはDAGを修正する
X. Other (please specify)

[Answer]: A — 11 Unitの再分割Planを承認する。（ユーザー回答: `1`）

## §13 Learnings — 追加確認

独立選挙E-HLE-UG13-R2は、新規c2/c3/c5をIntent固有の判断として保持し、project/team ruleまたはsensorへの永続化を0件とする裁定を2-0（GoA 1×2）で確立した。

A. 追加なし
B. 次回へ残す観察を追加する
X. Other (please specify)

[Answer]: A — 追加なし。（ユーザー回答: `１`、E-HLE-UG13-R2裁定）

## Artifact Re-use — Phase証跡バリア追加

A. 既存の11 Unit成果物を維持し、Issue #1717のPhase順序を保証する証跡バリアだけを追加する
B. 既存成果物を破棄し、ゼロから再作成する
C. 既存成果物を変更せず維持する
X. Other (please specify)

[Answer]: A — 既存の11 Unit成果物を維持し、Phase証跡バリアだけを追加する。（ユーザー回答: `1`）

## Phase証跡バリアPlan Approval

11 Unitの境界とownershipは変更しない。U06〜U09へU04/U05のPhase 1完了証跡依存、U10/U11へU06〜U09のPhase 2完了証跡依存を追加する。engineで検証済みのtopological batchは `U01` → `U02` → `U03` → `U04/U05` → `U06/U07/U08/U09` → `U10/U11` である。

A. Phase証跡バリアを追加した11 Unit DAGを承認する
B. Unit境界またはDAGを修正する
X. Other (please specify)

[Answer]: A — Phase証跡バリアを追加した11 Unit DAGを承認する。（ユーザー回答: `1`）

## §13 Learnings — 再々実行の追加確認

独立選挙E-HLE-UG13-R3は、surfaceされたc1〜c5が過去2回の裁定対象と同一で、Phase証跡バリア追加から新規diary candidateがないため、project/team ruleまたはsensorへの永続化を0件とする裁定を2-0（GoA 1×2）で確立した。

A. 追加なし
B. 次回へ残す観察を追加する
X. Other (please specify)

[Answer]: A — 追加なし。（ユーザー回答: `1`、E-HLE-UG13-R3裁定）
