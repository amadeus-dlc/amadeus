# Business Logic Model — U6 activation-policy

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services
> ADR-1 案 A の 3 面: (1) `--single` 要求撤廃 (2) spec-hash 判定 (3) advisory 提示。story-map ジャーニー 1「使う」(`--single` 撤廃)とジャーニー 3「発動を設計する」に対応。services.md どおり常駐なし — 判定は engine 指令発行時・verdict 記録時の単発実行。

## フロー 1: 判定(決定的)

```
computeSpecHash(ActivationWatch.globs)
  → readActivationState(SpecHashState — 不在なら never-run)
  → 比較 → ActivationJudgment{changed | current | never-run}
```

## フロー 2: advisory 提示(engine 側パッチ — C6 の (ii) 面)

```
amadeus-orchestrate next が build-and-test 指令を発行する直前:
  compose 済み formal-model-check が composition record に存在?
    ──no→ 何もしない(plugin 未インストール時のゼロ影響 — 0-plugin 不変)
    └─yes→ フロー 1 → changed|never-run なら AdvisoryLine を stderr へ 1 行
                      → current なら無音
doctor(U5 の activation 行): 同じ ActivationJudgment を表示(spec-hash match|CHANGED)
```

## フロー 3: `--single` 撤廃(engine 側)

- compose 済み plugin stage への `--stage formal-model-check` は `--single` なしで single-stage 実行として受理(現行は `--single` 必須 — plugins/formal-model-check の condition 文)
- `scopes: []` は不変 — stock scope への編入はしない(FR-7(b)。scope-grid の冗長 SKIP セル非生成 = 既存 c9-tla-plugin-optin-grid 契約維持)
- plugin stage 側 frontmatter / condition 文の更新は中立正本 `plugins/formal-model-check/stages/formal-model-check.md` で行い、投影経由で配布(dist 手編集禁止)

## フロー 4: verdict 記録

```
run-model-check 実行完了(明示起動のみ)
  → writeActivationState({ lastVerdictHash: computeSpecHash(...), recordedAt })
```

advisory 発火では状態を書かない(発火の冪等性 — domain-entities 不変条件)。

## 実行順(Bolt 内リスク制御 — bolt-plan Bolt 5 行)

spec-hash 判定+テスト green を先に確定し、その後に `--single` 要求撤廃を適用する(撤廃先行による「ゲートなし到達可能」窓の防止)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T15:58:21Z
- **Iteration:** 1
- **Scope decision:** none

ADR-1 案 A を決定的判定・単方向 state・stderr-only advisory・0-plugin ゼロ影響として一貫設計。Minor 2 件(FR-7(d) の明示 trace 欠落、--single 撤廃の component-methods 上流未記載)は指摘直後に conductor が BR-U6-9 追加と上流伝播で是正済み。

### Findings

- [Minor] FR-7(d) の明示引用欠落 — BR-U6-9 追加で是正
- [Minor] --single 撤廃機構の component-methods C6 未記載 — 上流伝播是正
