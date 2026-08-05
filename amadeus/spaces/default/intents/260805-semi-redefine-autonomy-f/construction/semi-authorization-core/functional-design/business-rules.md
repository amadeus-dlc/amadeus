# Business Rules — `semi-authorization-core`(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

依拠箇所: `requirements.md` 領域 A / B(FR-AUTH / FR-LAD の受け入れ基準 — 全規則の trace 先)、`components.md` ADR-1〜5、`component-methods.md` §C1〜C8(逐語契約)、`services.md` §S1(純関数層の境界)、`unit-of-work.md` §`semi-authorization-core` 実装上の制約、`unit-of-work-story-map.md` §NFR の割当(NFR-1 の対象ゲート)。

---

## 決定規則と不変条件

| # | 規則 | 出所 |
| --- | --- | --- |
| R1 | **置換であり併存でない**: `semi-mode-gate` は型・生成・消費の全点(実測: `amadeus-intent-autonomy.ts:478` / `:516`、`amadeus-intent-autonomy-runtime.ts:522` / `:613`)から削除する。互換分岐・旧型の残置は禁止 | ADR-1 / C-7 |
| R2 | **3 責務限定**: `SemiAuthority` は (a) scope 認可 (b) effect 認可 (c) basisFingerprint 供給のみ。`expiresAt` / `state` / `principalId` 儀式 / `issuanceDigest` / `grantId` を持たない(型定義の直読で検査可能) | FR-AUTH-1 (1) |
| R3 | **grant 意味論の不侵入**: semi は `currentGrant === null` を維持。`set-mode` の値域へ `full` を追加しない | FR-AUTH-3 / FR-GRT-004 |
| R4 | **provenance 要求の維持**: `modeProvenance.kind !== "human-command"` の semi は認可しない(`:512` の要求を緩めない) | FR-LAD-1 |
| R5 | **理由コードの値域は 2 値のまま**: `MODE_REQUIRES_HUMAN` / `SCOPE_OUT` に第 3 の値を足さない(`AUTHORITY_BOUNDARY` は不採用済み — 生成点も消費点も無い) | `component-methods.md` §C3 / phases/construction.md(消費されないフィールド禁止) |
| R6 | **節目は人間裁定**: walking-skeleton / phase-gate / phase 境界 stage-gate は `human-required`(scope 集合 `SEMI_ROUTINE_INTERACTIONS` に含めない)。効果側は `workflow-reversible` のみ(`semi-gate-effect-not-authorized` の文字列維持) | FR-LAD-5 |
| R7 | **梯子は 5 段全部**: semi の質問裁定は confirmed-policy → norm → history → solo-election → agent-recommendation を降り、後段 2 段は `reviewState: "unreviewed"`(分岐 `:605-607` 無改変) | FR-LAD-4 |
| R8 | **入口は単一述語**: 梯子入口は「認可基体が解決できたか」のみ(`authority === null` → `invalid: "authorization-required"`)。mode 名の直接比較を残さない(検証: 関数本体 grep 0 hit — 記録面対象外) | FR-AUTH-2 |
| R9 | **throw ガード 3 点の保存**: C5 の `:667` / `:668-670` / `:671-674` は 1 文字も変えない | FR-LAD-3 / `unit-of-work.md` 実装上の制約 |
| R10 | **scope 供給は production 層**: 純関数層は fingerprint を生成しない。`fallbackFingerprints` を export し、供給が無い semi は fail-closed で `human-required` | ADR-3 / D3 |
| R11 | **片方向不変条件**: `semiPolicies` 存在 ∧ mode ≠ semi → `ILLEGAL_STATE`。逆向きは要求しない(方針ゼロ = 正規の縮退)。読み口は `semiPoliciesOf` の 1 本のみ | ADR-4 / FR-AUTH-1 (3) |
| R12 | **fingerprint 空間の共有**: semi の scope/norm fingerprint は既存 `fallbackFingerprints` と同一空間(専用 digest を新設しない — journal 焼付後の統合不能を避ける) | ADR-3(Option B 却下理由) |
| R13 | **走行単位の主張限定**: 本 Unit の成果を「phase 完走」と記述しない(質問で止まらない、まで) | FR-LAD-6 |

## バリデーション論理

- `SemiAuthority.of` の生成条件: `mode === "semi"` ∧ `modeProvenance.kind === "human-command"` ∧ scope の両 fingerprint が `SHA256.test` を満たす。不成立は `null`(throw でも human-required でもない — 翻訳は呼び出し側)。
- `allowsOccurrence`: `scope.intentUuid === occurrence.intentUuid` ∧ `allowedInteractionKinds.includes(occurrence.kind)` ∧ `occurrence.phase !== "phase-boundary"`。真偽値のみ返し理由は付けない(`scopeAllows:496-499` と同じ責務分割)。
- `authorizeEffect`: `effect !== null` ∧ `classification === "workflow-reversible"` ∧ `applicableNormFingerprint === currentNormFingerprint`。不成立は `{ ok: false, reason: "semi-gate-effect-not-authorized" }`。
- 文脈検査(`:703-705` の `invalid-decision-context`)は無改変。

## テスト固定(受け入れ基準 → ケース対応)

| ケース群 | 対象 | 期待 |
| --- | --- | --- |
| A1(t451) | 型の責務検査 | `SemiAuthority` 型に 4 つ目の責務フィールドが無い(FR-AUTH-1 (1)) |
| A2(t452) | 第1関門判定表 8 行 | business-logic-model.md §第1関門 の表どおり(FR-LAD-1: semi+question 認可 ∧ semi+walking-skeleton human-required の同時 green) |
| A3(t452) | 不変条件 | 不正 projection(semiPolicies ∧ mode≠semi)が replay 経由で fail-closed 拒否。落ちる実証: 不変条件除去で赤(FR-AUTH-1 (3)) |
| A4(t453, integration) | AUTO_DECIDED 記録 | semi 裁定 1 件が `SemiAuthority.fingerprint` 由来の basisFingerprint で記録(FR-AUTH-1 (2)) |
| A5(直接呼び出し) | 梯子入口 | `authority: null` → `invalid: "authorization-required"`。落ちる実証: ガード除去で赤(FR-AUTH-2 — `decide` 経由不可、引き取り B) |
| A6(t453) | 梯子 5 段 | confirmed-policy 不在時に norm→history→solo-election→agent-recommendation の順降下、後段 2 段が `Unreviewed:` 行へ計上(FR-LAD-4) |
| A7(t452/t453) | 節目と効果 | walking-skeleton / phase 境界 stage-gate が `human-required`、不可逆効果が `semi-gate-effect-not-authorized`。3 点とも反転で赤(FR-LAD-5) |
| A8(t453) | grant 不在維持 | `--mode semi` 後 `currentGrant === null`(FR-AUTH-3) |
| A9(t431 分割) | FR-PIN-1 | 保存ピン(walking-skeleton)維持+反転ピン(stage-gate → `semi-authority`、question → 認可)— questions D5。あわせて `tests/.coverage-patch-allowlist.json` の行ピン同期(drift 無し)を確認する — 本 Unit は U-6(横断・行ピン機械 remap、`unit-of-work.md` §未確定事項の引き取り)の対象 4 Unit の 1 つであり、自 PR で `cid:code-generation:c1-allowlist-mechanical-remap` の機械 remap+`cid:code-generation:cg-allowlist-straddle-swell` の span 検査を実施する |
| A10(t452) | C5 ガード | 梯子経由でない question への throw 維持(FR-LAD-3) |
| A11(t453) | FR-LAD-2(第2関門ルーティング) | semi の `question` が `createSelectedGateDecision` を経由せず `resolveAutoDecision` に到達することを、梯子段の basisKind(`confirmed-policy` / `norm` / `history` / `solo-election` / `agent-recommendation` のいずれか)の記録で確認 |

落ちる実証はすべて「注入 → 赤の実測 → 復元 → 残渣ゼロ確認」の不可分 1 セット(NFR-1、`cid:code-generation:falling-proof-injection-one-set`)。

## 本 Unit が守らない(守る必要がない)規則の明示

- stop hook の述語分割(FR-STOP-1/2)は `stop-question-carveout` の所有。`amadeus-stop.ts` は本 Unit の diff に現れない。
- `set-mode` への `policies` 追加・`planHumanAutonomyCommand` の `after.semiPolicies` 設定(C8 書き側、FR-POL 系)は `semi-policy-carrier` の所有。
- 表示(FR-DISP 系)・advisory(FR-ADV 系)・docs(FR-DOC 系)は各所有 Unit の検収。
