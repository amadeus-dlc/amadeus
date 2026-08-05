# Component Methods — semi 再定義と `--autonomy` 起動宣言(#2253)

上流入力(consumes 全数): requirements.md, architecture.md, component-inventory.md

本文書は上記3成果物を次のとおり実参照する。`requirements.md` の各 FR の**受け入れ基準**を各メソッドの契約・エラー分岐へ写像し(各節の「充足 AC」)、NFR-1(fail-closed の実証可能性)・NFR-2(監査追跡性)・NFR-6(provenance の偽装不能性)を戻り型の設計制約とする。`architecture.md` 現在節「無人裁定梯子は5段(4段ではない)」の段表(basisKind 別 reviewState)を §梯子の段別戻り値表の根拠とし、同節「`--autonomy` 起動フラグの結線余地」の `--report` consume コメント(`:1068-1069`)を §C12 の様式引用元とする。`component-inventory.md` 現在節「焦点コンポーネント」表の所在(core/tools・core/hooks の別)を各メソッドの配置根拠とする。

測定 ref: worktree HEAD `974dbf9bcce117a510605b12c20c50e317883566`。引用規律は components.md §測定 ref と引用規律 に従う。

---

## 型シグネチャの規約

`amadeus/spaces/default/knowledge/amadeus-shared/software-design/functional-domain-modeling-ts/`(project.md DECIDED)に従う。

- class を使わない。ドメイン型は `type` + コンパニオンオブジェクト。
- 検証は**スマートコンストラクタ**で行い、検証済みであることを型で運ぶ(parse, don't validate)。
- 失敗は例外でなく**判別ユニオン Result** で返す。ただし**呼び出し側の誤配線(プログラミング誤り)は throw** とする — これは既存 `createGateAutoDecision:667`(verbatim `  if (input.occurrence.kind === "question") throw new Error("gate-decision-requires-gate-occurrence");`)の様式であり、本設計もこれに倣う。
- 命名は既存の `amadeus-` プレフィクスとモジュール境界(core 中立層 / harness 表層)を守る(project.md § Code Style)。

> **引用の意味論適合の照合**(`cid:application-design:citation-semantics-check`): 本モジュールには**エラー様式が3つ**実在する — (i) 判別ユニオン Result(`AutoDecisionResolution:577-580`、`EffectAuthorization:746-748`)、(ii) `throw`(`createGateAutoDecision:667-673`、`normalizeDecisionPolicies:112`)、(iii) `human-required` へのフォールバック(`authorizeInteraction`)。本設計は **(i) を新設 API の既定**、**(ii) を誤配線検出のみ**、**(iii) を第1関門のみ**に割り当てる。これは引用元の使い分けと同一であり、意図的相違はない。

---

## C1 `SemiAuthority`(`packages/framework/core/tools/amadeus-intent-autonomy.ts`)

```
export const SEMI_ROUTINE_INTERACTIONS: readonly InteractionKind[] = ["stage-gate", "question"];

export type SemiAuthorityScope = {
  readonly intentUuid: string;
  readonly scopeId: string;
  readonly scopeFingerprint: string;   // SHA256
  readonly normFingerprint: string;    // SHA256
  readonly allowedInteractionKinds: readonly InteractionKind[];
};

export type SemiAuthority = {
  readonly kind: "semi-authority";
  readonly intentUuid: string;
  readonly scope: SemiAuthorityScope;
  readonly policies: readonly DecisionPolicy[];
  readonly authorityFingerprint: string; // SHA256
};
```

| メソッド | シグネチャ | 目的 | エラー処理 | 充足 AC |
| --- | --- | --- | --- | --- |
| `SemiAuthority.of` | `(projection: AutonomyProjection, scope: SemiAuthorityScope) => SemiAuthority \| null` | スマートコンストラクタ。`mode === "semi"` かつ `modeProvenance.kind === "human-command"` かつ scope の fingerprint が `SHA256.test` を満たすときのみ生成 | 条件不成立は `null`(例外でも `human-required` でもない — 呼び出し側が第1関門の語彙へ翻訳する) | FR-AUTH-1(1)(型が3責務のみ)/ FR-LAD-1(provenance 要求の維持) |
| `SemiAuthority.allowsOccurrence` | `(authority: SemiAuthority, occurrence: InteractionOccurrence) => boolean` | (a) scope 認可。`scope.intentUuid` 一致 かつ `allowedInteractionKinds.includes(occurrence.kind)` かつ `occurrence.phase !== "phase-boundary"` | 真偽値のみ(理由は呼び出し側が付ける — `scopeAllows:496-499` と同じ責務分割) | FR-LAD-1 / FR-LAD-5 |
| `SemiAuthority.authorizeEffect` | `(authority: SemiAuthority, effect: DecisionOptionEffect \| null, currentNormFingerprint: string) => { readonly ok: true; readonly effect: DecisionOptionEffect } \| { readonly ok: false; readonly reason: "semi-gate-effect-not-authorized" }` | (b) effect 認可。`effect !== null` かつ `classification === "workflow-reversible"` かつ `applicableNormFingerprint === currentNormFingerprint` | 判別ユニオン Result(`EffectAuthorization` の様式に倣う) | FR-LAD-5(不可逆効果が `semi-gate-effect-not-authorized`) |
| `SemiAuthority.fingerprint` | `(input: { modeProvenance: ModeProvenance; scopeFingerprint: string; policies: readonly DecisionPolicy[] }) => string` | (c) basisFingerprint 供給。`autonomyDigest({ modeProvenance, scopeFingerprint, policySetDigest })` | 入力不正は `autonomyDigest` の既存挙動に従う(純関数) | FR-AUTH-1(2) |

**型に持たせない**(FR-AUTH-1 の受け入れ基準(1)の検査対象): `expiresAt` / `state` / `principalId` の発行儀式 / `issuanceDigest` / `grantId`。型定義の直読で 4 つ目の責務が無いことを確認できる。

**`assertLegalAutonomyProjection` への追加不変条件**(FR-AUTH-1(3)):

```
if (projection.semiPolicies !== undefined && projection.mode !== "semi") {
  throw new Error("ILLEGAL_STATE:semi-policies-mode-combination");
}
```

replay(`amadeus-intent-autonomy-replay.ts:34-45` の `transactionShape` が `assertLegalAutonomyProjection` を呼ぶ)はこの不変条件を経由して不正 projection を fail-closed で拒否する。**逆向き(semi なら `semiPolicies` が存在)は要求しない** — 理由は decisions.md ADR-4。

---

## C2 `DecisionAuthority`(同ファイル)

```
export type DecisionAuthority =
  | { readonly kind: "grant"; readonly grantId: string; readonly scope: GrantScopeDescriptor;
      readonly policies: readonly DecisionPolicy[]; readonly authorityFingerprint: string }
  | { readonly kind: "semi"; readonly scope: SemiAuthorityScope;
      readonly policies: readonly DecisionPolicy[]; readonly authorityFingerprint: string };
```

| メソッド | シグネチャ | 目的 | エラー処理 |
| --- | --- | --- | --- |
| `decisionAuthorityOf` | `(authorization: DecisionAuthorization) => DecisionAuthority \| null` | 第1関門の結果を梯子入口の入力へ射影する純関数。`full-grant` → `kind: "grant"`、`semi-authority` → `kind: "semi"`、`human-required` → `null` | `null` を返すだけ(throw しない)。`null` は「認可基体が解決できなかった」の唯一の表現 |

`full-grant` 認可は現在 `grantId` と `scopeFingerprint` しか運ばない(`amadeus-intent-autonomy.ts:483-489`)。`decisionAuthorityOf` が policies と scope 全体を必要とするため、**`full-grant` 認可の payload に `scope: GrantScopeDescriptor` と `policies` を追加する**(認可 1 回あたり参照コピー 2 個の追加。projection を再度読み直す実装より参照透明)。

**充足 AC**: FR-AUTH-2(改訂後の `resolveAutoDecision` 入口に `mode !== "full"` の直接比較が存在しない)。

---

## C3 `authorizeInteraction`(改訂)

```
export function authorizeInteraction(
  projection: AutonomyProjection,
  occurrence: InteractionOccurrence,
): DecisionAuthorization;
```

戻り型の union が変わる(`semi-mode-gate` を削除し `semi-authority` を追加):

```
export type DecisionAuthorization =
  | { readonly kind: "semi-authority"; readonly occurrence: InteractionOccurrence;
      readonly authority: SemiAuthority; readonly projectionRevision: number }
  | { readonly kind: "full-grant"; readonly occurrence: InteractionOccurrence; readonly grantId: string;
      readonly scope: GrantScopeDescriptor; readonly policies: readonly DecisionPolicy[];
      readonly scopeFingerprint: string; readonly projectionRevision: number }
  | { readonly kind: "human-required"; readonly occurrence: InteractionOccurrence;
      readonly reason: "MODE_REQUIRES_HUMAN" | "SCOPE_OUT" | "AUTHORITY_BOUNDARY" };
```

| 入力 | 戻り |
| --- | --- |
| mode `none` / 任意 occurrence | `human-required: MODE_REQUIRES_HUMAN`(**不変**) |
| mode `semi` / `modeProvenance.kind !== "human-command"` | `human-required: MODE_REQUIRES_HUMAN`(**不変** — FR-LAD-1) |
| mode `semi` / `question` | `semi-authority` |
| mode `semi` / `stage-gate`(非 phase 境界) | `semi-authority` |
| mode `semi` / `walking-skeleton` | `human-required: SCOPE_OUT`(scope 集合に含まないため) |
| mode `semi` / `phase-gate` | `human-required: SCOPE_OUT`(同上) |
| mode `full` / scope 内 | `full-grant`(**不変**) |

> **理由コードの変化に関する注記**: 現行の semi 非 internalGate は `MODE_REQUIRES_HUMAN` を返す(`:513`)。改訂後は scope 集合による拒否になるため理由コードが `SCOPE_OUT` へ変わる。FR-LAD-5 の受け入れ基準は「`human-required` を返すこと」を要求し理由コードを固定しないため契約違反ではないが、**理由コードを assert している既存テストがあれば同期対象**である。functional-design で `grep -rn "MODE_REQUIRES_HUMAN" tests` の全数棚卸しを行うこと(2キー棚卸し: 定数名 `MODE_REQUIRES_HUMAN` と展開後リテラル `"MODE_REQUIRES_HUMAN"` — `cid:application-design:dual-key-consumer-inventory`)。本設計段では棚卸しを実行していない(⚠ 実装時実測が確定条件)。

**充足 AC**: FR-LAD-1(semi + question が認可済み、semi + walking-skeleton が `human-required` の2 assert が同時 green)。

---

## C4 `resolveAutoDecision` / `resolveConfirmedPolicy`(改訂)

```
interface ResolveAutoDecisionInput {
  readonly projection: AutonomyProjection;
  readonly occurrence: InteractionOccurrence;
  readonly authority: DecisionAuthority | null;   // ← 追加(grant の内部取得を置換)
  readonly actorId: string;
  readonly scopeLineageFingerprint: string;
  readonly currentNormFingerprint: string;
  readonly applicableNormFacts: readonly DecisionFact[];
  readonly pastHumanRulings: readonly DecisionFact[];
  readonly capability: DecisionCapabilityPort;
}
```

入口の改訂(FR-AUTH-2 の単一述語):

| 現行(`:701-702`) | 改訂後 |
| --- | --- |
| `const grant = projection.currentGrant;`<br>`if (projection.mode !== "full" \|\| grant === null) return { kind: "invalid", reason: "full-grant-required" };` | `if (input.authority === null) return { kind: "invalid", reason: "authorization-required" };` |

`resolveConfirmedPolicy` の引数を差し替える:

```
function resolveConfirmedPolicy(input: {
  readonly projection: AutonomyProjection;
  readonly occurrence: InteractionOccurrence;
  readonly authority: DecisionAuthority;   // ← grant: IntentGrant を置換
  readonly actorId: string;
}): AutoDecisionResolution | null;
```

本体の照合条件は**同値**を保つ(`:638-642` の3条件のうち `policy.scopeFingerprint === input.grant.scope.scopeFingerprint` が `=== input.authority.scope.scopeFingerprint` へ変わるのみ)。

### 梯子の段別戻り値表(`architecture.md` 現在節の表と1:1)

| 順 | 段 | 実測 file:line | decider | basisFingerprint の出所 | reviewState | 失敗・競合時 |
| --- | --- | --- | --- | --- | --- | --- |
| — | 入口 | `:702`(改訂) | — | — | — | `{kind:"invalid", reason:"authorization-required"}` |
| — | 文脈検査 | `:703-705` | — | — | — | `{kind:"invalid", reason:"invalid-decision-context"}`(**不変**) |
| 0 | confirmed-policy | `:706-707` | `deterministic-engine` | `autonomyDigest(policyIds)` | `not-applicable` | `confirmed-policy-conflict` |
| 1 | norm | `:708-717` | `deterministic-engine` | `norm.evidenceFingerprint` | `not-applicable` | `{kind:"park", reason:"NORM_CONFLICT"}` |
| 2 | history | `:718-725` | `deterministic-engine` | `history.evidenceFingerprint` | `not-applicable` | 不採用(次段へ) |
| 3 | solo-election | `:726-735` | `solo-election` | `elected.evidenceFingerprint` | **`unreviewed`** | `invalid-election-result` |
| 4 | agent-recommendation | `:736-744` | `agent-recommendation` | `recommended.evidenceFingerprint` | **`unreviewed`** | `invalid-recommendation-result`(fail-closed) |

`reviewState` の分岐(`:605-607`)は**無改変**。semi の裁定も同じ表に従う(FR-LAD-4)。

**充足 AC**: FR-AUTH-2 / FR-LAD-4(5段を順に降り、後段2段が `Unreviewed:` 行へ計上される)。

---

## C5 `createGateAutoDecision`(改訂)

```
interface CreateGateAutoDecisionInput {
  readonly projection: AutonomyProjection;
  readonly occurrence: InteractionOccurrence;
  readonly authority: DecisionAuthority;   // ← 追加
  readonly actorId: string;
  readonly selectedOptionId: string;
  readonly basisKind: "mode-semi" | "grant-gate";
}
```

| ガード | 現行 | 改訂後 | 理由 |
| --- | --- | --- | --- |
| question 誤配線 | `:667` throw `gate-decision-requires-gate-occurrence` | **維持**(1文字も変えない) | FR-LAD-3(throw を単純除去してはならない)。梯子経由の question はこの関数を通らないため、throw は誤配線検出器として意味を保つ |
| mode-semi の mode 一致 | `:668-670` throw `semi-gate-requires-semi-mode` | **維持** | fail-closed の維持 |
| grant-gate の grant 実在 | `:671-674` throw `grant-gate-requires-full-grant` | **維持** | 同上 |
| basisFingerprint | `:686-688` `autonomyDigest(modeProvenance \| currentGrant)` | `input.authority.authorityFingerprint` | 2 分岐の三項演算子が単一参照になる(C-7 の置換) |

**充足 AC**: FR-LAD-3(梯子経由でない question に対する throw が維持されることを assert するテストが green)。

---

## C6 `selectDecision` / `decide`(`amadeus-intent-autonomy-runtime.ts`、改訂)

```
function selectDecision(
  projection: AutonomyProjection,
  input: AutonomyDecisionInput,
  authorization: DecisionAuthorization,
): { readonly kind: "selected"; readonly decision: AutoDecisionRecord } | AutonomyDecisionResult;
```

改訂後の分岐(3行、現行と同じ行数):

```
const authority = decisionAuthorityOf(authorization);
if (input.occurrence.kind !== "question") return createSelectedGateDecision(projection, input, authority);
const resolved = resolveAutoDecision({ ...input, projection, authority });
```

`createSelectedGateDecision` は `basisKind` を `authority.kind === "semi" ? "mode-semi" : "grant-gate"` から導く(現行は呼び出し側が文字列リテラルで渡していた — `:522-523`)。

`decide`(`:603-615`)の効果適用の振り分け:

| 認可 | 効果適用 | 理由 |
| --- | --- | --- |
| `semi-authority` | `applySemiDecision` | grant を要求しない単相コミット |
| `full-grant` | `reserveFullDecision` | `:574` verbatim `    if (grant === null) return { kind: "conflict", reason: "full-grant-missing" };` が grant を構造的に要求する |

`decide:606-608` の `human-required` 時の分岐(verbatim `      if (projection.mode !== "full") return { kind: "human-required", reason: authorization.reason, result: null };`)は**不変**とする。semi の `human-required` は park せず即座に人間へ返る — これは FR-LAD-5(節目は人間裁定)と整合する。

**充足 AC**: FR-LAD-2(semi の question が `createSelectedGateDecision` を経由せず梯子の basisKind を記録する)。

---

## C7 `applySemiDecision`(改訂)

```
function applySemiDecision(
  projection: AutonomyProjection,
  input: AutonomyDecisionInput,
  authority: Extract<DecisionAuthority, { kind: "semi" }>,
  decision: AutoDecisionRecord,
): AutonomyDecisionResult;
```

`:552-554` の inline 述語を `SemiAuthority.authorizeEffect` の呼び出しへ置換する。**述語は同値**(components.md §C1)。戻り値 `{ kind: "human-required", reason: "semi-gate-effect-not-authorized", result: null }` の**文字列も維持**する(既存テストの資産を無為に壊さない)。

コミットするイベント列(`:558-561`)は**無改変** — `AUTO_DECIDED` + `WORKFLOW_EFFECT_APPLIED` の2件。NFR-2(監査追跡性)はこの経路で満たされる。

**充足 AC**: FR-LAD-5(不可逆効果が `semi-gate-effect-not-authorized` を返す。反転で赤になることを実証)。

---

## C8 方針の担体(`HumanAutonomyCommand` / `planHumanAutonomyCommand`)

```
export type HumanAutonomyCommand =
  | { readonly kind: "set-mode"; readonly mode: "none" | "semi"; readonly policies: readonly DecisionPolicy[] }
  | { readonly kind: "issue-full" | "replace-full"; readonly scope: GrantScopeDescriptor; readonly policies: readonly DecisionPolicy[] }
  | { readonly kind: "revoke-full"; readonly targetMode: "none" | "semi"; readonly policies: readonly DecisionPolicy[] };

export interface AutonomyProjection {
  // ... 既存 13 フィールド ...
  readonly semiPolicies?: readonly DecisionPolicy[];   // ← 追加(任意)
}
```

| 入力 | `after.semiPolicies` |
| --- | --- |
| `set-mode` mode `semi`、policies 非空 | 正規化済み policies |
| `set-mode` mode `semi`、policies 空 | **未設定**(`undefined`)— 「方針ゼロ」と「フィールド不在」を同一視する(ADR-4) |
| `set-mode` mode `none` | 未設定 |
| `revoke-full` targetMode `semi` | 同 `set-mode` semi と同じ規則 |
| `issue-full` / `replace-full` | 未設定(方針は `grant.policies` が持つ) |

policies の正規化は既存 `normalizeDecisionPolicies`(`:106-133`)を再利用する。semi では `grantIdentitySeed` に相当する識別子が無いため、`context.commandOccurrenceId` を seed として渡す(`SAFE_ID.test` を満たす — `validHumanContext` が既に検査済み)。

**エラー処理**: 正規化失敗(`invalid-decision-policy` / `duplicate-decision-policy` の throw)は `planHumanAutonomyCommand:394` の既存 `catch` が受けて `{ ok: false, code: "INVALID_COMMAND" }` を返す(**現行の様式をそのまま利用** — 新しいエラー経路を作らない)。

**充足 AC**: FR-POL-1 / FR-AUTH-3(`--mode semi` 後の `currentGrant === null`)。

---

## C9 `prepareNonFullCommand` / 確認 digest(`amadeus-intent-autonomy-production.ts`)

```
function prepareNonFullCommand(
  before: AutonomyProjection,
  mode: Exclude<AutonomyMode, "full">,
  policies: readonly DecisionPolicy[],          // ← 追加
): { readonly command: HumanAutonomyCommand; readonly displayDigest: string };

export function nonFullCommandDisplayDigest(input: {
  readonly intentUuid: string;
  readonly mode: Exclude<AutonomyMode, "full">;
  readonly revokedGrantId: string | null;
  readonly policies: readonly DecisionPolicy[];
}): string;   // autonomyDigest({ ...input, policySetDigest: autonomyDigest(input.policies) })
```

現行の2つの digest 生成(`:387` の revoke 版、`:394` verbatim `    displayDigest: autonomyDigest({ intentUuid: before.intentUuid, mode }),`)を `nonFullCommandDisplayDigest` の**1 定義**へ寄せる(`revokedGrantId` の有無で分岐)。これは full 側 `grantIssuanceDisplayDigest`(`:334-336`、verbatim `  return autonomyDigest({ ...input, policySetDigest: autonomyDigest(input.policies) });`)と**同形**である。

> **引用の意味論適合の照合**: `grantIssuanceDisplayDigest` は `principalId` と `scope` を digest の合成対象に含む。semi は grant scope を持たない(C-1)ため、`nonFullCommandDisplayDigest` は `principalId` / `scope` を**含めない**。これは**意図的相違**であり、FR-POL-2 の受け入れ基準(同一 mode・異なる policy 集合で digest が異なり、同一 policy 集合では安定)は `policySetDigest` の合成だけで満たされる。

`applyProductionAutonomyMode:417` の分岐(verbatim `  if (input.mode === "full") {`)は不変。else 側が `prepareNonFullCommand(before, input.mode, normalized)` を呼ぶ。

**エラー処理**: `confirmedDisplayDigest` 不一致は `planHumanAutonomyCommand` の既存 `validHumanContext:285`(verbatim `  if (!SHA256.test(context.confirmedDisplayDigest)) return { ok: false, code: "INVALID_COMMAND" };`)と `issueGrant` の照合と同じ位置で扱う。**非 full 側に digest 照合が現状無い**ため、FR-POL-2 の「digest が方針込みで変わる」を実効あるものにするには照合点の追加が要る — この照合を `planHumanAutonomyCommand` の `set-mode` / `revoke-full` 分岐へ加えるか否かは **functional-design の設計事項**とする(⚠ 未確定。decisions.md §未確定事項)。

**充足 AC**: FR-POL-2(digest の差異と安定性、replay での復元)。

---

## C10 `handleSetAutonomy`(`amadeus-bolt.ts`)

```
if (flags.mode === "none" && flags["policies-file"] !== undefined) {
  error("--policies-file is not accepted with --mode none (policies have no carrier in mode none).");
}
```

`error()` は既存のヘルパ(非 0 exit + stderr 出力)。**新しいエラー経路を作らない**。`readDecisionPolicyInputs(flags["policies-file"])`(`:1067`)の呼び出しはこのガードの**後**に置く(不正ファイルより mode 不整合を先に報告する)。

**充足 AC**: FR-POL-3(非 0 exit + stderr の理由。loud 化を外すと赤になる落ちる実証)。

---

## C11 stop hook の述語(`amadeus-stop.ts`)

```
// full 限定(現行 isFullyAutonomousIntent と完全同値)
function <full 限定述語>(stateContent: string, resolvedProjectDir?: string): boolean;

// 質問 carve-out(semi + full)
function <carve-out 述語>(stateContent: string, resolvedProjectDir?: string): boolean;
```

命名の最終形は OQ-3 のとおり functional-design へ委譲する(components.md §C11)。契約は次のとおり確定する。

| 述語 | 判定 | 例外時 |
| --- | --- | --- |
| full 限定 | `intentAutonomyMode(stateContent) === "full"` かつ `projection?.mode === "full"` かつ `projection.currentGrant?.state === "active"` | `catch` → `false`(**現行 `:175-177` と同じ**) |
| carve-out | mode が `semi` → projection の `mode === "semi"` かつ `modeProvenance.kind === "human-command"`。mode が `full` → full 限定述語と同じ。それ以外 → `false` | `catch` → `false` |

呼び出し点の割当(FR-STOP-1 の表と1:1):

| file:line | 関数 | 使う述語 |
| --- | --- | --- |
| `:422` | `isPendingQuestionStop` | carve-out |
| `:457` | `isPendingComposeStop` | full 限定 |
| `:716` | `isConversationalStop` | full 限定 |

**充足 AC**: FR-STOP-1(1)(semi で `:422` が carve-out を得る)/ (2)(semi で `:457` と `:716` が carve-out を得ない。無条件共有へ戻すと赤になる落ちる実証)。

---

## C12 `--autonomy` parser(`amadeus-orchestrate.ts`)

`parseNextFlags` の if/else ladder に 1 分岐を足す。`--report`(`:1067-1070`)と同形:

```
} else if (a === "--autonomy" && i + 1 < args.length) {
  // CONSUME the value (same reason as --report: an unrecognized valued flag
  // would leak its value into the freeform intent text).
  flags.autonomy = args[i + 1];
  i++;
}
```

`ParsedFlags` に `readonly autonomy?: string` と `readonly autonomyMissingValue?: boolean` を追加する(**値域検査はここで行わない** — parse 段は文字列を運ぶだけ。値域の loud 化は C13 が担う。理由: `--scope` も同様に parser では検査せず Branch 3b で検査している `:2632-2638`)。

**値域は3値**(`none` / `semi` / `full`)であり `AutonomyMode`(`amadeus-intent-autonomy.ts:11`、verbatim `export type AutonomyMode = "none" | "semi" | "full";`)と一致させる(FR-CLI-1、ユーザー裁定 2026-08-05)。parser は値域を知らないため、3値化そのものは parser の実装を変えない — 変わるのは C13 の受理集合である。

> **引用の意味論適合の照合**: `--report` は「値を consume する」点のみを引用する。`--report` は値域を持たないが `--autonomy` は 2 値の値域を持つため、値域検査の所在は `--scope` の様式(parser 外の Branch で `errorDirective`)に倣う。**2 つの様式から責務ごとに別々の引用元を選んでいる**ことを明示する。

**値省略時の挙動**: `--autonomy` が argv 末尾にある場合 `i + 1 < args.length` が false になり、この分岐は成立せず `!a.startsWith("--")` にも当たらないため**黙って落ちる**。FR-CLI-2 は値省略も loud を要求するため、**ladder の末尾に `--autonomy` の値なしを捕捉する専用分岐**を置く:

```
} else if (a === "--autonomy") {
  flags.autonomyMissingValue = true;
}
```

NFR-3(parse 段の FS I/O ゼロ)は両分岐とも満たす(文字列操作のみ)。

**充足 AC**: FR-CLI-1(3値それぞれで値が `flags.intent` に混入しない。分岐を外すと赤)/ FR-CLI-2(3)(値省略が loud)/ NFR-3。

---

## C13 `--autonomy` 適用ハンドラ(`amadeus-orchestrate.ts`、新規)

```
function applyLaunchAutonomyDeclaration(
  projectDir: string,
  stateContent: string | null,
  flags: ParsedFlags,
): { readonly kind: "continue" } | { readonly kind: "error"; readonly message: string };
```

**受理する値域は3値**(`none` / `semi` / `full`、FR-CLI-1)。判定順(先に落ちるものから):

| # | 条件 | 戻り | 充足 AC |
| --- | --- | --- | --- |
| 1 | `flags.autonomyMissingValue` | `error`「`--autonomy` requires a value: none, semi, or full.」 | FR-CLI-2(3) |
| 2 | 値が3値以外 | `error`「Invalid --autonomy "<v>". Valid values: none, semi, full.」 | FR-CLI-2(3) |
| 3 | state の `Intent Autonomy Mode` が宣言値と同値 | `continue`(**監査イベントを増やさない**) | FR-CLI-2(1) の「既に `none` なら no-op」/ FR-CLI-3(1) |
| 4 | state の mode が設定済みかつ異値 | `error`「Intent autonomy is already <cur>. Use `amadeus-bolt set-autonomy --mode <v>` to change it.」 | FR-CLI-3(2)(3) |
| 5 | 値 `none` かつ grant 状態が `"present"` または `"unreadable"` | `error`「Intent has an active grant. Use `amadeus-bolt set-autonomy --mode none` to revoke it explicitly.」 | FR-CLI-2(2) |
| 6 | 値 `full` かつ grant 状態が `"present"` 以外 | `error` + preview(発行に必要な内容)を stderr へ | FR-CLI-4 |
| 7 | 上記以外 | `applyProductionAutonomyMode({ projectDir, stateContent, mode, ... })` を呼び、`ok: false` はその `error` 文字列を relay | FR-CLI-2(1)/ FR-CLI-5(HUMAN_TURN 不在は `PROVENANCE_REQUIRED` で停止) |

**grant 実在チェックの述語**(判定 5・6 が共有する)— **真偽値ではなく3値**を返す(所有者と3値化の裁定は decisions.md ADR-12):

```
function activeGrantState(projectDir: string): "present" | "absent" | "unreadable";
//  present    : readProductionAutonomyProjection が currentGrant.state === "active" を返した
//  absent     : projection は読めたが active grant が無い
//  unreadable : projection の読取が throw した / null だった
```

- 判定 5(`--autonomy none`): `"present"` または `"unreadable"` → `error`(fail-closed)
- 判定 6(`--autonomy full`): `"present"` のみ通す。`"absent"` / `"unreadable"` → `error` + preview(既に fail-closed)

`readProductionAutonomyProjection`(`amadeus-intent-autonomy-production.ts:133`)は**読み取り専用**であり、監査イベントを生まない。

> **引用の意味論適合の照合**(`cid:application-design:citation-semantics-check`): 近傍の既習様式は `isFullyAutonomousIntent:175-177`(verbatim `  } catch {` / `    return false;` / `  }`)の `catch → false` である。しかしその `false` は「carve-out を与えない = **保守側へ倒す**」意味であり、判定 5 で同じ形を使うと「grant 不明なら `--autonomy none` を通す」= **緩和側**へ反転する。読取に失敗したまま `applyProductionAutonomyMode` が走ると、grant 実在時に `prepareNonFullCommand:385-390` の `revoke-full` が起動しうるためである。**したがって本設計は引用元の `catch → false` 様式を意図的に採らず**、読取失敗を `"unreadable"` として明示し拒否側へ倒す。これは意図的相違である。

判定 4 が判定 5・6・7 より**先**であることが FR-CLI-3(3)(`revoke-full` 経路が起動フラグから到達不能)の構造的保証である — `prepareNonFullCommand:385-390` の `revoke-full` 分岐は `before.currentGrant !== null` のときに走るが、grant がある = mode `full` なので、`--autonomy semi` は判定 4 で、`--autonomy none` は判定 4 または 5 で**先に**停止する。判定 4 と判定 5 は二重の防壁であり、**判定 5 は state ファイルの mode 表示が projection と乖離した場合(state 手術・部分書込)にも grant を守る**。これが判定 5 を state 読取ではなく projection 読取で行う理由である。

**directive 値域との非同一視**(C-3): C13 は `directive.intent_autonomy_mode` へ**一切書き込まない**。directive への射影は `routeMainWorkflowDirective:2192`(verbatim `  if (autonomy.mode === "semi" || autonomy.mode === "full") {`)が独占し、この 1 行が `none` の搬送を構造的に排除する。`amadeus-directive.ts:97` / `:606` は本 intent の diff に現れない。

`READ_ONLY_FLAGS` へは追加しない(C-6)。`error` の描画は既存 `errorDirective` を使う(新しい directive 種別を作らない)。

**充足 AC**: FR-CLI-2(1)(2)(4)(grant 実在判定を無条件 false に差し替えると判定 5 のテストが赤)/ FR-CLI-3 / FR-CLI-4(fail-closed を反転すると赤)/ FR-CLI-5 / C-3 / NFR-6(1)。

---

## C14 statusline の Autonomy セグメント(`amadeus-statusline.ts`)

```
function autonomySegment(stateContent: string): string;   // "" | "semi" | "full" | "none"
```

`main()` が既に読んでいる `state` 文字列に `extractField(state, "Intent Autonomy Mode")` を適用する。**audit projection を読まない**(ADR-10)。出力は既存の連結様式へ 1 セグメント追加:

```
if (autonomy) output += ` @${autonomy}`;
```

| mode | 出力 |
| --- | --- |
| `none` | ` @none` |
| `semi` | ` @semi` |
| `full` | ` @full` |
| フィールド不在 / 不正値 | 出力しない(空文字。既存の「フィールドが無ければ足さない」様式に倣う) |

幅制約下の省略規則(OQ-5)は既存 `printLine` の右寄せ処理(`:214-...`)が担い、本セグメントは**固定 5〜6 文字**なので追加の省略規則を設けない。語彙は `--status` の `Autonomy:` 行(`amadeus-utility.ts:341`)と同一の mode 名を使う(表示専用語彙を作らない)。

**充足 AC**: FR-DISP-1(3 mode それぞれで対応語彙が出るユニットテスト)。

---

## C15 `--status` の Policies 行

```
export interface IntentAutonomyStatusEnvelope {
  // ... 既存 ...
  readonly policyCount: number;   // ← 追加(grant 非依存)
}
```

```
policyCount: grant?.policies.length ?? projection.semiPolicies?.length ?? 0,
```

`amadeus-utility.ts:345` を `` `Policies:       ${autonomy.policyCount}`, `` へ差し替える。`grant.policyCount`(`:772` 相当)は grant 明細として**残す**(削除すると full の grant 表示が退行する)。

**エラー処理**: `readStatusAutonomy`(`amadeus-utility.ts:323-334`)の `catch` → `null` → `"Autonomy:       unavailable (audit projection unavailable)"` は**不変**。

**充足 AC**: FR-DISP-2(policies を設定した semi Intent が実数を表示)。

---

## C16 advisory の無人裁定 resolver(`amadeus-advisory-choice.ts`、新規)

```
export function resolveAdvisoryChoiceAutonomously(input: {
  readonly projectDir: string;
  readonly hold: Extract<AdvisoryChoiceGuardResult, { kind: "hold" }>;
  readonly phase: string;
  readonly graphRevision: string;
}): { readonly kind: "resolved"; readonly choice: AdvisoryChoice; readonly decision: AutoDecisionRecord }
 | { readonly kind: "human-required"; readonly reason: string };
```

処理の順序:

1. **occurrence 写像**(ADR-6): hold の各 advisory item から `InteractionOccurrence` を組む。
   - `kind: "question"`(Out により `InteractionKind` を増やさない)
   - `interactionId = advisory-<advisory_instance>`
   - `selector = advisory:<plugin>:<code>:<advisory_instance>`(FR-ADV-1 の逐語「`selector` に advisory instance を含めて一意化」に従う)
   - `optionIds` = `hold.runRequired ? ["run-now"] : ["run-now", "defer-with-risk"]`(**FR-ADV-4 の主機構**)
   - `phase` / `stage` は directive のものを使う
2. **effect registry の構築**: `run-now` → `classification: "workflow-reversible"`、`defer-with-risk` → `classification: "quality-waiver"`(`PROHIBITED_EFFECTS` 収載、`amadeus-intent-autonomy-production.ts:69-75`)。**FR-ADV-4 の従機構**(効果空間側の封鎖)。
3. **裁定**: 既存 `commitProductionQuestionDecision`(`amadeus-intent-autonomy-production.ts:524`)へ渡す。新しい裁定経路を作らない(Reuse Inventory)。
4. **結果の翻訳**: `decided` かつ `selectedOptionId === "run-now"` → `resolved`。それ以外(`human-required` / `parked` / `conflict` / `aborted` / `defer-with-risk` 選択)→ すべて `human-required`。

**SAFE_ID 適合の実測**(`cid:application-design:external-seam-vocab-measurement`):

| フィールド | 値の実体 | SAFE_ID `/^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/` |
| --- | --- | --- |
| `advisory_instance` | `randomUUID()`(`amadeus-advisory-choice.ts:374` verbatim `  instanceFactory: () => string = randomUUID,`) | ✅ 適合(hex + `-`、36 文字) |
| `plugin` | 現行の唯一の実体は `formal-model-check` | ✅ 適合 |
| `code` | `CODES = new Set<string>(["not-ready", "changed", "never-run"])`(`:113`、verbatim `const CODES = new Set<string>(["not-ready", "changed", "never-run"]);`) | ✅ 適合 |
| `selector` 全体 | `advisory:formal-model-check:changed:<uuid>` ≈ 60 文字 | ✅ 適合(192 文字上限内) |
| `optionIds` | `run-now` / `defer-with-risk`(`ADVISORY_CHOICE_OPTIONS:25-28`) | ✅ 適合(`nonEmptyUnique:47` の `SAFE_ID.test` を満たす) |
| `graphRevision` | `autonomyDigest(loadGraph())`(engine 側で既に `:2183` が生成) | ✅ 適合(SHA256 形) |

**充足 AC**: FR-ADV-1(full grant 下で pending advisory があっても `run-stage` が返り `AUTO_DECIDED` が記録される)/ FR-ADV-2(mode none・失効 grant・scope 不一致で `await-advisory-choice`。認可判定を無条件 true にすると赤)/ FR-ADV-4(無人経路が `defer-with-risk` を選べない)。

### `applyPendingAdvisoryGuard` の改訂(`amadeus-orchestrate.ts:781-800`)

```
if (guard.kind === "allow") return directive;
const auto = resolveAdvisoryChoiceAutonomously({ projectDir, hold: guard, phase: directive.phase, graphRevision });
if (auto.kind === "resolved") {
  recordAdvisoryChoice(projectDir, auto.choice, { kind: "auto-decision", ... });
  return directive;                      // ← run-stage をそのまま返す
}
const choiceDirective: AwaitAdvisoryChoiceDirective = { ... };   // 現行のまま
return choiceDirective;
```

`return directive` の 1 行が FR-ADV-1 の「`await-advisory-choice` ではなく `run-stage` を返す」に対応する。**`auto.kind !== "resolved"` の全経路が `await-advisory-choice` へ落ちる**ことが FR-ADV-2 の fail-closed であり、分岐が 2 つしかないことでそれを構造的に保証する。

---

## C17 advisory receipt の provenance(`amadeus-advisory-choice.ts`、改訂)

```
export type AdvisoryChoiceProvenance =
  | { readonly kind: "human-turn"; readonly timestamp: string; readonly shard: string; readonly eventIdentity: string }
  | { readonly kind: "auto-decision"; readonly decisionId: string; readonly basisKind: DecisionBasisKind;
      readonly basisFingerprint: string; readonly projectionRevision: number };

export type AdvisoryChoiceReceipt = {
  schema: 2;                                    // ← 1 から昇格
  identity: AdvisoryIdentity;
  choice: AdvisoryChoice;
  provenance: AdvisoryChoiceProvenance;         // ← humanTurn: HumanTurnProvenance を置換
  recordedAt: string;
  revokedAt?: string;
  revocationReason?: "misattributed-unpresented-choice";
};
```

`recordProtectedAdvisoryChoice`(`:864-900`)を `recordAdvisoryChoice(projectDir, choice, provenance, now?)` へ**置換**する(並存させない — FR-ADV-3、R5)。humanTurn 依存の受理3点を provenance 種別で分岐する単一関数にする:

| 受理点 | 現行 file:line | `human-turn` の判定 | `auto-decision` の判定 |
| --- | --- | --- | --- |
| grounding | `:877` verbatim `    if (!isGroundedHumanTurn(projectDir, humanTurn)) return false;` | **現行と同値**(監査シャードの実 `HUMAN_TURN` と timestamp・digest 照合) | 監査 journal に当該 `decisionId` の `AUTO_DECIDED` が実在すること(`readIntentAutonomyTransactionsFromAudit` で照会) |
| 重複排除キー | `:878-881` verbatim `    if (store.receipts.some((receipt) =>` / `      receipt.humanTurn.eventIdentity === humanTurn.eventIdentity` / `      && receipt.humanTurn.shard === humanTurn.shard` / `    )) return false;` | `(shard, eventIdentity)` の組 | `decisionId` の単独一意 |
| 提示照合 | `:889` verbatim `    if (!hasMatchingAdvisoryPresentation(projectDir, open, humanTurn)) return false;` | **現行と同値**(`DECISION_RECORDED` の Stage/Options/Rationale 照合) | occurrence の `selector` が open な pending の identity と一致すること |

**重複排除キーは provenance 種別を跨いで働く**(FR-ADV-3 の受け入れ基準)。同一 advisory identity に対して既に active な receipt があれば、provenance 種別に関わらず 2 件目を拒否する述語を追加する — 現行の `acceptsFreshChoice`(`:838-850`)が identity 単位で判定しているため、この述語を受理の前段へ引き上げるだけで足りる(新しい索引を作らない)。

**store schema の扱い**: `parseStore`(`:450-467`)の `value.schema !== 1` を `!== 2` へ変える。schema 1 の on-disk store は `{ ok: false }` となり、`guardAdvisoryChoicesLocked:743` の既存分岐(verbatim `  if (intentRun === null || !storeResult.ok) return fallbackAdvisoryHold(stage, advisories, intentRun);`)により **fail-closed の hold** になる。読替コードを書かない(ADR-9)。

**エラー処理の方針**: すべて `boolean` / `ParseResult<T>` の既存様式を維持する。**新しい例外経路を作らない**。

**充足 AC**: FR-ADV-3(受理関数が provenance を判別ユニオンで 1 本受け、並行実装が存在しない。provenance 種別を跨ぐ二重 receipt が防がれる)/ NFR-6(2)。

---

## C18 旧仕様ピンと文書(メソッド面なし)

| 対象 | 操作 | 充足 AC |
| --- | --- | --- |
| `tests/unit/t431-intent-autonomy.test.ts:307-313` | test を 2 分割。`:312`(walking-skeleton)を独立 test で保存、`:313`(質問封鎖)を反転 | FR-PIN-1 |
| `tests/integration/t121-stop-hook-enforce.test.ts:1138-1150` | 反転。test 名の理由句も改める | FR-PIN-2 |
| `docs/`(22 ファイル = 11 対訳ペア) | 旧 semi 定義の記述を改訂。日英を同一 PR で | FR-DOC-1 |
| `core/amadeus-common/protocols/stage-protocol.md`(9 行) | `:33` / `:131` を反転、`:125` を同期、`:105` / `:808` を**保存** | FR-DOC-2 |
| `tests/.coverage-patch-allowlist.json:5268` / `tests/unit/t147-kiro-hook-adapter.test.ts:723` | C11 の改名時の同期対象 | FR-STOP-1 §同期対象 |
