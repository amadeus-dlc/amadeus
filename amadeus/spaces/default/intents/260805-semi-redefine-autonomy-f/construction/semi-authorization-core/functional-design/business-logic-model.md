# Business Logic Model — `semi-authorization-core`(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

依拠箇所: `unit-of-work.md` §`semi-authorization-core`(所有物と分割不能の根拠)、`unit-of-work-story-map.md` §FR の割当(core 9 件)、`requirements.md` 領域 A / B(FR-AUTH-1〜3 / FR-LAD-1〜6 の受け入れ基準と現行 verbatim)、`components.md` C1〜C8 行と ADR-1〜5、`component-methods.md` §C1〜C8(シグネチャ・判定表・梯子表の逐語 — 本 FD の正本)、`services.md` §論理サービス S1(純関数層)/ S5(engine)。

設計分岐の裁定は `functional-design-questions.md` D1〜D7(すべて機械導出)。本 FD は §C1〜C8 の逐語契約を**改変せず**、実装順序・結線・検証面を確定する。

---

## 3 層置換の全体像

ADR-1(置換 — `semi-mode-gate` を削除し併存させない)に従い、次の 3 層を一体で置き換える:

```
第1関門  authorizeInteraction(C3)
  semi 分岐: internalGate 限定 → SEMI_ROUTINE_INTERACTIONS(stage-gate + question)+ scope 供給
  戻り: semi-mode-gate(削除)→ semi-authority(新設、SemiAuthority を運ぶ)
       ↓ DecisionAuthorization
第2関門  decide / selectDecision(C6)
  human-required の早期 return(:607-610 不変)→ decisionAuthorityOf(C2)で DecisionAuthority へ射影
  question → resolveAutoDecision(C4 — 梯子 5 段)/ gate → createSelectedGateDecision(C5)
       ↓ AutoDecisionRecord
効果適用  applySemiDecision(C7)
  inline 述語 → SemiAuthority.authorizeEffect(C1)へ置換(述語同値・文字列維持)
  AUTO_DECIDED + WORKFLOW_EFFECT_APPLIED のイベント列は無改変
```

テキスト代替: 第1関門が semi の question / 非 phase 境界 stage-gate を `semi-authority`(SemiAuthority 同梱)として認可し、第2関門が `decisionAuthorityOf` で梯子入口の `DecisionAuthority` へ射影して質問は梯子 5 段・gate は既存 gate 裁定へ振り分け、効果適用は `SemiAuthority.authorizeEffect` が workflow-reversible のみ通す。3 層の型は同時にしか通らない(`unit-of-work.md` §境界の根拠)。

## 第1関門 — `authorizeInteraction` の改訂(C3 + D3 結線)

判定表(`component-methods.md` §C3 の逐語。理由コードの値域は現行 2 値 `MODE_REQUIRES_HUMAN` / `SCOPE_OUT` のまま拡張しない):

| 入力 | 戻り |
| --- | --- |
| mode `none` / 任意 | `human-required: MODE_REQUIRES_HUMAN`(不変) |
| mode `semi` / `modeProvenance.kind !== "human-command"` | `human-required: MODE_REQUIRES_HUMAN`(不変 — FR-LAD-1) |
| mode `semi` / `semiScope` 未供給(`null`) | `human-required: MODE_REQUIRES_HUMAN`(D3 の fail-closed) |
| mode `semi` / `question` | `semi-authority` |
| mode `semi` / `stage-gate`(非 phase 境界) | `semi-authority` |
| mode `semi` / `walking-skeleton` | `human-required: SCOPE_OUT` |
| mode `semi` / `phase-gate` | `human-required: SCOPE_OUT` |
| mode `full` / scope 内 | `full-grant`(不変。ただし payload に `scope` / `policies` を追加 — §C2) |

**結線(D3 — 3 点 specify、測定 ref: worktree HEAD `6191bbfc104282fd329d89392c40264b2cef3661`)**:

1. **純関数層**: シグネチャを `authorizeInteraction(projection, occurrence, semiScope?: SemiAuthorityScope | null)` へ拡張。`semiScope` 未供給(`null`)の semi は `human-required: MODE_REQUIRES_HUMAN`(fail-closed)。
2. **runtime 層**: `AutonomyDecisionInput`(`amadeus-intent-autonomy-runtime.ts:228-239`)へ任意フィールド `readonly semiScope?: SemiAuthorityScope` を追加(申告付き拡張 — §C4 の `ResolveAutoDecisionInput` への `authority` 追加と同じ様式)。`decide` の呼び出し行(`:607` verbatim `const authorization = authorizeInteraction(projection, input.occurrence);`)を `authorizeInteraction(projection, input.occurrence, input.semiScope ?? null)` へ改訂。`decide(input: AutonomyDecisionInput)` の外形シグネチャは不変(§C6 の「3 行差分」契約と両立)。
3. **production 層**: `fallbackFingerprints`(`:281-289`、純粋な digest 計算)を export。`commitProductionQuestionDecision` が既存 fallback 分岐(`:541-543`)と同じ材料から `{ intentUuid, scopeId, scopeFingerprint, normFingerprint, allowedInteractionKinds: SEMI_ROUTINE_INTERACTIONS }` を組み立て、decide の input(`semiScope`)へ渡す。`authorizeProductionOccurrence`(`:226-234` — 内部 `:230` が直呼び)は第 3 引数へ同じ scope を渡す。

純関数層は `SHA256.test` の形検査のみ行う(ADR-3 Decision の逐語)。semi-authority 生成時に `SemiAuthority.of(projection, scope)` が `null` を返した場合(mode / provenance / fingerprint 形の不成立)は `human-required: MODE_REQUIRES_HUMAN` へ翻訳する(§C1 のエラー処理)。

## 第2関門 — `decide` / `selectDecision`(C6)と梯子入口(C4)

- `decide:607-610` の human-required 早期 return は**不変**(semi の human-required は park せず即返る — FR-LAD-5 整合。`component-methods.md` §C6 の verbatim 表)。
- `selectDecision` の引数型を `Exclude<DecisionAuthorization, { kind: "human-required" }>` へ絞り、`decisionAuthorityOf` オーバーロード (i) で非 null の `DecisionAuthority` を得る(到達不能な null 分岐は書かない)。
- 梯子入口(C4): `:702` の `projection.mode !== "full" || grant === null` → `input.authority === null` の単一述語へ(`invalid: "authorization-required"`)。文脈検査(`:703-705`)・梯子 5 段・reviewState 分岐(`:605-607`)は無改変。梯子の段別戻り値表は `component-methods.md` §C4 の表を正本とする。
- `resolveConfirmedPolicy` は `grant: IntentGrant` → `authority: DecisionAuthority` へ引数差し替え(照合条件は同値 — `policy.scopeFingerprint === authority.scope.scopeFingerprint`)。
- 効果適用の振り分け(§C6 の表): `semi-authority` → `applySemiDecision`(grant 不要の単相コミット)/ `full-grant` → `reserveFullDecision`(不変)。
- `createSelectedGateDecision` の basisKind は `authority.kind === "semi" ? "mode-semi" : "grant-gate"` から導出(呼び出し側リテラル渡しを置換)。

## 効果適用 — `applySemiDecision`(C7)と `createGateAutoDecision`(C5)

- C7: `:552-554` の inline 述語を `SemiAuthority.authorizeEffect` 呼び出しへ置換。述語は同値、戻り文字列 `"semi-gate-effect-not-authorized"` は維持。コミットイベント列(`AUTO_DECIDED` + `WORKFLOW_EFFECT_APPLIED`、`:558-561`)は無改変(NFR-2)。
- C5: 3 つの throw ガード(`:667` question 誤配線 / `:668-670` mode 一致 / `:671-674` grant 実在)は**1 文字も変えない**(FR-LAD-3)。basisFingerprint のみ `input.authority.authorityFingerprint` の単一参照へ(2 分岐三項演算子の置換)。

## C8 読み側 — `semiPoliciesOf` と片方向不変条件

- `AutonomyProjection.semiPolicies?: readonly DecisionPolicy[]` の**フィールド宣言**と総関数 `semiPoliciesOf(projection): readonly DecisionPolicy[]`(不在 → `[]`)を本 Unit が持つ。`projection.semiPolicies` の直読は作らない(ADR-4 Consequences)。
- `assertLegalAutonomyProjection` へ片方向不変条件を追加(§C1 逐語): `semiPolicies !== undefined && mode !== "semi"` → throw `ILLEGAL_STATE:semi-policies-mode-combination`。逆向き(semi なら存在)は要求しない(ADR-4 — 方針ゼロは正規のドメイン状態)。replay(`amadeus-intent-autonomy-replay.ts:34-45`)はこの不変条件経由で不正 projection を fail-closed 拒否する(FR-AUTH-1 (3))。
- 書き手(`set-mode` の `policies` / `planHumanAutonomyCommand` の `after.semiPolicies`)は `semi-policy-carrier` の所有であり本 Unit の diff に現れない。本 Unit のみ着地時は `semiPoliciesOf` が常に `[]` を返し梯子 0 段目が空振りする「方針ゼロ縮退」が正規状態(`unit-of-work.md` §方針ゼロでの縮退)。

## データフロー(semi の question 1 件が AUTO_DECIDED になるまで)

| 段 | データ | 供給元 | 消費先 |
| --- | --- | --- | --- |
| 1 | `InteractionOccurrence`(kind: question) | production(`commitProductionQuestionDecision:541-543` 付近で組み立て、事前検査は `authorizeProductionOccurrence:230`) | 第1関門 |
| 2 | `SemiAuthorityScope`(fallback fingerprints + `SEMI_ROUTINE_INTERACTIONS`) | production が組み立て(D3) | 第1関門の semi-authority 生成 |
| 3 | `DecisionAuthorization`(semi-authority) | 第1関門 | `decide` → `decisionAuthorityOf` |
| 4 | `DecisionAuthority`(kind: semi、policies = `semiPoliciesOf(projection)`) | C2 射影 | 梯子入口(C4)+ C5/C7 の authorityFingerprint |
| 5 | `AutoDecisionRecord`(梯子 5 段のいずれかで決定) | C4 | C7 → `AUTO_DECIDED` + `WORKFLOW_EFFECT_APPLIED` |

## 検証シーケンス(t440〜t442 + FR-PIN-1)

- **t440(unit)**: C1/C2 純関数 — `SemiAuthority.of` の生成条件(mode / provenance / SHA256 形)、`allowsOccurrence` の 3 条件、`authorizeEffect` の 3 条件、`decisionAuthorityOf` の 3 射影、型に 4 つ目の責務が無いこと(FR-AUTH-1 (1))。
- **t441(unit)**: 第1関門の判定表全行(上表 8 行)+ D3 fail-closed(scope 未供給)+ `assertLegalAutonomyProjection` の片方向不変条件(落ちる実証: 不変条件を除去すると赤 — FR-AUTH-1 (3))。
- **t442(integration)**: FR-AUTH-1 (2)(semi 裁定 1 件が新設型由来 basisFingerprint で `AUTO_DECIDED` 記録)/ FR-LAD-2(梯子 basisKind 記録)/ FR-LAD-4(5 段降下と `Unreviewed:` 計上)/ FR-AUTH-3(`--mode semi` 後 `currentGrant === null`)。実 FS(journal)を使うため integration 層。
- **FR-AUTH-2 の落ちる実証**: `resolveAutoDecision` の**直接呼び出し**で `authority: null` → `invalid: "authorization-required"` を assert し、入口ガードを除去すると赤(D7 — `decide` 経由では到達不能)。加えて改訂後の関数本体 grep で `mode !== "full"` 直接比較 0 hit(AC の grep 面 — 対象は当該関数本体のみ)。
- **FR-PIN-1(t431 分割)**: D5 のとおり保存ピン(walking-skeleton)と反転ピン(stage-gate → `semi-authority`、question → 認可済み)へ分割。既存 t431 のその他のテストは無改変で green を維持(FR-PIN-3 の射程限定 — 保護対象はピン対象箇所のみ)。
- **FR-LAD-5 / FR-STOP 境界**: walking-skeleton / phase-gate の `human-required` 維持と `semi-gate-effect-not-authorized`(反転で赤)は t441/t442 に含める。`AUTONOMOUS_BLOCK_CAP` / `stopBudgetMode` は本 Unit の diff に現れない(FR-STOP-2 — stop hook 面は `stop-question-carveout` の所有)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T10:43:22Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER(D3 未 specify)は 3 点 specify で 3 成果物とも一貫して閉包され、FOLLOW-UP 4 件も確認できたため READY(新規 FOLLOW-UP 1 件は非ブロッキング)

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/semi-authorization-core/functional-design/business-logic-model.md:78 — データフロー表 1 行目「production(`commitProductionQuestionDecision:230` 付近)」は関数名と行番号が不整合。`:230` は D3 点 3 で明記された `authorizeProductionOccurrence` 内の直呼び行であり、`commitProductionQuestionDecision` 自身は同ドキュメント内(D3 点 3、functional-design-questions.md D3)で `:541-543` と特定されている。同一成果物内での自己矛盾のため、実装者が誤誘導される前に修正を推奨する(D3 本文の specify は正しく、実装可否には影響しない)
