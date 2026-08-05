# Business Logic Model — `semi-policy-carrier`(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

依拠箇所: `unit-of-work.md` §`semi-policy-carrier`(C8書⇄C15 の統合根拠)、`unit-of-work-story-map.md` §FR の割当(carrier 4 件)、`requirements.md` 領域 D(FR-POL-1〜3)と FR-DISP-2、`components.md` C8〜C10 / C15 行と ADR-4 / ADR-5、`component-methods.md` §C8 / §C9 / §C10 / §C15(逐語 — 本 FD の正本)、`services.md` §S5(engine)/ S10(表示)。

設計分岐の裁定は `functional-design-questions.md`(Q1 = U-1 の decide-question 裁定、D1〜D5 = 機械導出)。

---

## 処理シーケンス(方針が設定され confirmed-policy 段で効くまで)

```
amadeus-bolt set-autonomy --mode semi --policies-file <json>
  └─ handleSetAutonomy(C10)
       ├─ ガード: mode none ∧ policies-file → loud error(FR-POL-3。readDecisionPolicyInputs より先)
       ├─ readDecisionPolicyInputs(flags["policies-file"])   [既存 :1067]
       └─ applyProductionAutonomyMode({..., mode, policies})
            └─ prepareNonFullCommand(before, mode, policies)     [C9 — policies 引数追加。この時点では未正規化(raw)。
                                                                   正規化の呼び出しは planHumanAutonomyCommand 内の 1 箇所のみ — 二重化しない]
                 ├─ nonFullCommandDisplayDigest({intentUuid, mode, revokedGrantId, policies})  [1 定義化]
                 └─ command = {kind:"set-mode"|"revoke-full", mode/targetMode, policies}       [C8 書き側]
            └─ planHumanAutonomyCommand(before, command, context)
                 ├─ ★Q1 照合: policies 非空 ∧ confirmedDisplayDigest ≠ nonFullCommandDisplayDigest(...)
                 │    → { ok: false, code: "INVALID_COMMAND" }(policies 空は現行 1 段のまま)
                 ├─ normalizeDecisionPolicies(既存 :106-133、seed = commandOccurrenceId)
                 └─ after.semiPolicies を §C8 の表どおり設定(空 → 未設定 — ADR-4)
表示面:
amadeus-utility --status → policyCount: grant?.policies.length ?? semiPoliciesOf(projection).length  [C15]
```

テキスト代替: CLI(C10)が mode 不整合を最初に loud 化し、C9 が方針込みの確認 digest を 1 定義で生成、C8 書き側が `set-mode` / `revoke-full` コマンドへ policies を載せて `after.semiPolicies` を設定する。Q1 裁定により policies 非空のときのみ digest の等値照合が `planHumanAutonomyCommand` で必須になる。`--status` の `Policies:` 行は grant 非依存の `policyCount` を表示する。

## アルゴリズム 1 — C8 書き側(`after.semiPolicies` の設定規則)

`component-methods.md` §C8 の入力→`after.semiPolicies` 表を逐語採用(D1)。方針ゼロは未設定と同一視(D3 — ADR-4)。正規化は既存関数の再利用で seed は `commandOccurrenceId`(D2)。

## アルゴリズム 2 — C9 確認 digest の 1 定義化と照合点(Q1)

- `nonFullCommandDisplayDigest` は full 側 `grantIssuanceDisplayDigest:334-336` と同形(`policySetDigest` 合成)。**意図的相違**: semi は grant scope を持たないため `principalId` / `scope` を含めない(§C9 の照合注記の転記)。
- 現行 2 箇所の digest 生成(`:387` revoke 版 / `:394` set-mode 版)を 1 定義へ寄せ、`revokedGrantId` の有無で分岐。
- **照合点(Q1 裁定 A)**: `planHumanAutonomyCommand` の `set-mode` / `revoke-full` 分岐に「`command.policies` 非空のとき `context.confirmedDisplayDigest` と `nonFullCommandDisplayDigest(...)` の等値照合」を追加。不一致は既存様式 `{ ok: false, code: "INVALID_COMMAND" }`(新エラーコードを作らない)。policies 空は現行どおり形検査のみ(1 段 UX 維持 — stage-protocol の非 full CLI 契約を破らない)。

## アルゴリズム 3 — C10 ガードと C15 表示

- C10: `component-methods.md` §C10 の逐語ガード(mode none ∧ policies-file → `error(...)`)。`readDecisionPolicyInputs` 呼び出しの**前**に置く(不正ファイルより mode 不整合を先に報告)。
- C15: `IntentAutonomyStatusEnvelope.policyCount` を追加し、供給式は §C15 逐語(`grant?.policies.length ?? semiPoliciesOf(projection).length` — 直読禁止)。`amadeus-utility.ts:345` の表示行を `policyCount` へ差し替え。grant 明細の `policyCount` と `readStatusAutonomy` の catch → unavailable 表示は不変。

## データフロー

| 段 | データ | 供給元 | 消費先 |
| --- | --- | --- | --- |
| 1 | policies JSON(自然言語からの正規化は conductor 責務 — stage-protocol) | `--policies-file` | C10 → `readDecisionPolicyInputs` |
| 2 | `DecisionPolicy[]`(正規化済み) | `normalizeDecisionPolicies`(既存) | C8 書き側(command.policies) |
| 3 | displayDigest(方針込み) | `nonFullCommandDisplayDigest`(C9) | preview 表示 + Q1 照合 |
| 4 | `after.semiPolicies` | `planHumanAutonomyCommand`(C8 書き側) | projection → 読み手 `semiPoliciesOf`(core Unit)→ 梯子 0 段目 |
| 5 | `policyCount` | C15 供給式 | `--status` の `Policies:` 行(FR-DISP-2) |

## 検証シーケンス(t443 / t444)

- **t443(unit)**: C8 書き側の表 5 行(§C8)/ C9 digest の差異・安定(FR-POL-2 前半: 同一 mode・異 policy 集合で異なる digest、同一集合で安定)/ Q1 照合の 3 分岐(非空+一致 → ok、非空+不一致 → INVALID_COMMAND、空 → 照合なし ok)。落ちる実証: 照合を除去すると不一致ケースが赤。
- **t444(integration)**: FR-POL-1(`--mode semi --policies-file` 適用後、projection から policy が読め、semi の question 裁定が confirmed-policy 段 `:706-707` で解決 — core Unit 着地後の統合ケース)/ FR-POL-2 後半(replay が拡張 `set-mode` を復元し projection が書込前後で一致 — **NFR-2(監査追跡性)の本 Unit 配分面の検収**、`unit-of-work-story-map.md` §NFR の割当)/ FR-POL-3(`--mode none --policies-file` の非 0 exit + stderr。落ちる実証: loud 化を外すと赤)/ FR-DISP-2(policies 設定済み semi の `--status` が実数表示)。実 FS・CLI spawn のため integration 層。
- 落ちる実証はすべて「注入 → 赤の実測 → 復元 → 残渣ゼロ確認」の不可分 1 セット(NFR-1 — FR-POL-3 は story-map §NFR の割当で本 Unit の検収対象)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T11:05:57Z
- **Iteration:** 1
- **Scope decision:** none

semi-policy-carrier FD faithfully carries §C8-C10/§C15 verbatim, Q1 policies-conditional裁定を一貫転記し、FR-POL-1〜3/FR-DISP-2のACをP1〜P8で全数カバーしているが、シーケンス図の変数命名に軽微な不整合がある

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/semi-policy-carrier/functional-design/business-logic-model.md:19 — 処理シーケンス図で `prepareNonFullCommand(before, mode, normalized)` と変数名を `normalized` としているが、同ファイルおよび component-methods.md §C8(正規化失敗は `planHumanAutonomyCommand:394` の既存 catch が受ける、という記述)に従えば `normalizeDecisionPolicies` の呼び出しは `planHumanAutonomyCommand` 内の1箇所のみで、`prepareNonFullCommand` へ渡る時点の policies は未正規化(raw)である。この命名が実装者に『prepareNonFullCommand 呼び出し前に正規化が済んでいる』という誤解を与え、正規化呼び出しの二重化(digest 計算入力の不安定化のリスク)を招きうる。変数名を `policies`(未正規化であることが分かる名前)へ訂正するか、正規化呼び出し箇所が単一である旨を明示注記すること
- NIT | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/semi-policy-carrier/functional-design/business-logic-model.md:62 — unit-of-work-story-map.md:77 で NFR-2(監査追跡性・replay 復元)が本 Unit に配分されているが、FD 3成果物のいずれも NFR-2 を明示引用していない。内容的には P4(FR-POL-2 後半・replay 復元)が NFR-2 を実質充足しているため機能上のギャップではないが、上流入力ヘッダの完全性のため NFR-2 への明示 trace 行を1行足すと良い
