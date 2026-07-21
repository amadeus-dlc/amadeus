# Business Logic Model — verification-and-ledger-closure

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## 目的と境界

U12はC7 closure面として、各Unitが残したtest/docs/evidenceを全24 itemへtraceし、必須verificationと最終SHAが揃った場合だけledgerをidempotentに`APPLIED`へ進める。機能実装は持たない。

```ts
function traceCoverage(items: readonly UpstreamItem[], evidence: readonly EvidenceRef[]): TraceResult;
function assertPhaseVerification(result: VerificationRun): VerificationResult;
function planLedgerTransition(ledger: Ledger, evidence: CompletionEvidence): LedgerTransitionResult;
```

`classifyDisposition(item: UpstreamItem, evidence: VerificationEvidence): DispositionVerdict`はE-OC1裁定AによりC7内部helperである。

## Upstream input traceability

| Input | 採用制約 | 設計箇所 |
|---|---|---|
| `unit-of-work.md` | 3 public seam、24 evidence、full CI/coverage、SHA、idempotent closure | Trace/Verify/Ledger |
| `unit-of-work-story-map.md` | 全U01–U11 evidence consumer、U12だけがclosure owner | Trace |
| `requirements.md` | EQUIVALENT厳格性、FR23/24、三条件APPLIED、二重履歴0 | 全workflow |
| `components.md` | C7 tests/docs/ledger owner、既存CI/coverage/ledger再利用 | 境界 |
| `component-methods.md` | 4関数正準signature、EQUIVALENT/APPLIED規則 | Public/Internal seam |
| `services.md` | evidence集約、ledger writeは最終のみ、DB/networkなし | Ledger workflow |

## Coverage trace workflow

1. 内部`classifyDisposition`が各itemのapproved dispositionとevidenceを照合する。
2. EQUIVALENTはcharacterizationがupstream contract全体を満たす場合だけ返す。不足contractを部分evidenceで同等扱いしない。
3. `traceCoverage`が24 itemすべてを最低1つの自動testまたは明示docs検査へ対応付ける。
4. FR23は採用contractだけをunit/integration/e2eへ再著作し、filesystemを触る検査はintegration-firstとする。SKIP項目testを持ち込まない。
5. FR24は英語正本/日本語pair、Amadeus path/namespace、6 harness、generated/hand-edit境界、legacy path 0を検査する。

## Phase verification workflow

`assertPhaseVerification`はtargeted evidenceに加え、typecheck、lint、dist check、promote-self check、full CI、local coverageの必須結果を検査する。patch追加行の未カバーは0を必須とし、waiverは既決条件を満たす明示証拠がある場合だけ受理する。未実施、非0、古いSHAの結果をgreenへ読み替えない。

## Ledger transition workflow

1. `planLedgerTransition`は24 disposition、全必須gate green、最終比較SHAの三条件を同時に検査する。
2. 単なる未完了または三条件欠落は`APPLIED`を拒否し、ledger bytesとbaselineを変更しない。進行中を`BLOCKED`へ分類しない。
3. accepted terminal evidenceは構造化された`verification-failure`または`abandon`だけである。前者は失敗gate/command、観測結果、対象SHAを、後者は明示的放棄の主体・理由・対象SHAを持つ。曖昧な自由文や条件欠落だけをterminal evidenceにしない。
4. terminal evidenceがある場合はbaselineを前進させず、反証可能根拠付き`BLOCKED`を既存ledger writerで冪等に計画する。
5. 全条件成立時だけ最終SHA付き`APPLIED` transitionを計画する。
6. 同じBLOCKED/APPLIED transitionの再実行はno-opとし、二重履歴を作らない。両方とも既存atomic write境界を再利用する。
7. ledger writeは最終operationであり、U12は機能成果物を変更しない。

判定順や新しいfailure policyは追加せず、正準`LedgerTransitionResult`へ既決結果を閉じる。

## Verification scenarios

- 24/24、23/24、evidenceなし、部分EQUIVALENTを対照し、欠落を拒否する。
- 各必須gateの単独failure/未実施/古いSHAをgreenへしない。
- final SHAなし、24 disposition欠落、gate result未提出の各々でledger bytes不変を確認する。
- 単なる進行中/条件欠落と、構造化`verification-failure`/`abandon`を対照し、前者は不変、後者だけがBLOCKEDになることを確認する。
- 同じBLOCKED evidenceを二回適用し、履歴一件・baseline不変を確認する。
- valid completionを二回適用し、APPLIED履歴が一件だけであることを確認する。
- filesystem testがintegration層にあり、patch追加行未カバー0または既決waiver証拠を満たすことを検査する。
- docs pair/legacy path/aidlc namespace片面欠落を既存gateで検出する。

## Review — Iteration 1

Reviewer: `amadeus-architecture-reviewer-agent` / UTC: `2026-07-20T14:41:38Z`

**判定: NOT-READY**

### Findings

1. **BLOCKER — failure policy / ledger atomicity が正本どおり閉じていない。** `requirements.md` FR-8 は途中失敗・放棄を反証可能な根拠付き `BLOCKED` とし、比較baselineだけを前進させない。一方、3成果物は `LedgerTransitionResult` を拒否・`APPLIED`計画・既存transition no-opに限定し、本モデルのverification scenarioはgate failure時にもledger bytes不変を要求する。これは `BLOCKED` transitionを欠落させるか、新しいfailure policyを暗黙採用する。questionsの停止・再付議条件に該当するため、正準result variantと「APPLIED不成立」と「失敗・放棄」の境界を再付議し、3成果物を同じ契約へ揃えること。
2. **MAJOR — FR23の必須test配置規則が欠落している。** 採用contractをunit/integration/e2eへ再著作しSKIP testを除外する点はあるが、`requirements.md` FR-7が要求する「filesystemを触る検査はintegration-first」がrule・workflow・scenarioのいずれにもない。明示的な配置ruleと反証scenarioを追加すること。
3. **MAJOR — coverage gateが緩い。** 必須gate集合にlocal coverageは含まれるが、`requirements.md` NFR-6の「patch追加行の未カバー0」とwaiverの既決条件がmodel/rules/scenarioにない。genericなcoverage成功だけでgreenにできないよう、既決条件をそのまま明示すること。

### 確認済み事項

- E-OC1 Aどおり、public seamは `traceCoverage`、`assertPhaseVerification`、`planLedgerTransition` の3つで、`classifyDisposition` は内部helper。4関数のsignatureは `component-methods.md` と完全一致する。
- EQUIVALENTはupstream contract全体のcharacterization evidenceに限定され、部分evidenceによる緩和はない。
- `APPLIED` は24 disposition・全必須gate green・最終比較SHAの三条件を要求し、同一transition再実行はno-opで二重履歴を作らない。
- U12はtest/docs/evidence集約とledger closureに限定され、機能実装、DB/network/AWS/UIを追加しない。
- FR24の英語正本/日本語pair、Amadeus path/namespace、6 harness、生成/手編集境界、legacy path検査は成果物間で整合する。
- directiveの6 consumesは各成果物のtraceabilityと設計判断へ実質利用され、questions・3成果物の記述も上記findings以外は整合する。

### Sensor評価

- `required-sections`: **PASS** — 3成果物はいずれもH2を2つ以上持つ。
- `upstream-coverage`: **PASS** — `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services` の全6入力を明記し、実質利用を説明している。
- `linter`: **N/A** — 対象のTypeScript/JavaScript成果物はなく、Markdown内はsignature宣言のみ。
- `type-check`: **N/A** — 対象のTypeScript/TSX成果物はない。
- `answer-evidence`: **PASS** — questionsにE-OC1 A、UTC裁定時刻、正準seam、停止条件を含む回答証跡がある。ただし停止条件の適用漏れはFinding 1として差し戻す。

## Review — Iteration 2

Reviewer: `amadeus-architecture-reviewer-agent` / UTC: `2026-07-20T14:45:52Z`

**判定: READY**

### Findings

BLOCKER、MAJOR、MINORの新規findingはない。

### Iteration 1 findingsの解消確認

1. **BLOCKER解消 — E-OC1再裁定Aのledger境界がclosed unionとして統一された。** questionsの再裁定証跡に基づき、3成果物は次の三分岐を同じ契約として表現している。(a) 単なる未完了または24 disposition・必須gate green・最終比較SHAのいずれか欠落は`APPLIED`を拒否し、ledger bytesとbaselineを不変にする。(b) 構造化された`verification-failure`または`abandon`だけを、対象SHAと反証可能根拠を伴う`BLOCKED`計画とし、baselineを前進させない。(c) 三条件成立時だけ最終SHA付き`APPLIED`を計画する。進行中や曖昧な自由文は`BLOCKED`にならない。`BLOCKED`と`APPLIED`はいずれも既存atomic ledger writerを再利用し、同一transition再実行はno-opで履歴を増殖させない。
2. **MAJOR解消 — FR-7 item 23のfilesystem integration-firstが設計・規則・反証scenarioへ入った。** `business-rules.md`のBR-U12-05、Coverage trace workflowのstep 4、Verification scenariosが、filesystemを触る検査をintegration層へ置き、SKIP項目testを持ち込まないことを明示する。
3. **MAJOR解消 — NFR-6のpatch coverage gateが具体化された。** `domain-entities.md`、`business-rules.md`のBR-U12-12、Phase verification workflow、Verification scenariosは、patch追加行の未カバー0を必須とし、waiverを既決条件の明示証拠がある場合だけに限定する。genericなcoverage成功だけではgreenにならない。

### 成果物・consumes整合性

- `business-logic-model.md`、`business-rules.md`、`domain-entities.md`の3必須成果物は存在し、questionsの再裁定A、U12のclosure-only責務、C7 owner、正準3 public seam＋内部`classifyDisposition`、EQUIVALENT厳格性、FR23/24、FR-8、NFR-5/6と整合する。UIを含まないためoptionalな`frontend-components.md`の不在は妥当である。
- directiveの6 consumes（`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`）は、各成果物のtraceability表と本文判断へ実質利用されている。U12の24 item evidence集約、C7境界、関数signature、verification batch、ledger最終writeに未追跡の入力はない。

### Sensor評価

- `required-sections`: **PASS** — 3成果物はいずれもH2を2つ以上持つ。
- `upstream-coverage`: **PASS** — 6 consumesを全て明記し、それぞれの実質利用箇所を説明している。
- `linter`: **N/A** — 対象のTypeScript/JavaScript成果物はなく、Markdown内のTypeScriptはsignature宣言のみである。
- `type-check`: **N/A** — 対象のTypeScript/TSX成果物はない。
- `answer-evidence`: **PASS** — questionsにE-OC1 Aの初回裁定と`2026-07-20T14:43:50Z`の再裁定、closed union、既存writer、両transitionの冪等性、進行中非BLOCKEDの回答証跡がある。
