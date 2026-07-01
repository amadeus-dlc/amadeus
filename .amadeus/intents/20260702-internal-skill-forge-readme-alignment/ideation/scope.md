# スコープ

## 対象境界

### 対象

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-IN-001 | README の Phase Skills、Cross-Cutting Support Skills、Internal Skills の分類を確認する。 | [README.md](../../../../README.md) | 採用 |
| SC-IN-002 | `skills/amadeus-*` と `.agents/skills/amadeus-*` の対応を確認する。 | [steering/tech.md](../../../steering/tech.md) | 採用 |
| SC-IN-003 | `skill-forge` の観点で、`SKILL.md` の trigger description、本文構成、eval、Codex metadata を確認対象にする。 | [skill-forge](../../../../.agents/skills/skill-forge/SKILL.md) | 採用 |
| SC-IN-004 | 内部 skill を README にどう載せるか、または載せないかを判断する。 | [README.md](../../../../README.md) | 採用 |
| SC-IN-005 | source skill と昇格先成果物の同期手段、検証入口、provenance を確認する。 | [steering/policies.md](../../../steering/policies.md) | 採用 |
| SC-IN-006 | 互換性維持対象が明示されていない場合は、旧入口、旧名、alias、互換層を追加しない。 | [backward-compatibility.md](../../../../.agents/rules/backward-compatibility.md) | 採用 |

### 対象外

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-OUT-001 | `amadeus-*` skill を一括リライトする。 | 入力テーマ | 採用 |
| SC-OUT-002 | `skill-forge` 本体を変更する。 | 入力テーマ | 採用 |
| SC-OUT-003 | README 以外の docs を全面再構成する。 | [README.md](../../../../README.md) | 採用 |
| SC-OUT-004 | validator 契約を破壊的に変更する。 | [steering/policies.md](../../../steering/policies.md) | 採用 |
| SC-OUT-005 | example snapshot を一括再生成する。 | [steering/policies.md](../../../steering/policies.md) | 採用 |
| SC-OUT-006 | `docs/backward-compatibility.md` に未記録の互換性維持対象を追加せずに互換層を作る。 | [backward-compatibility.md](../../../../.agents/rules/backward-compatibility.md) | 採用 |
| SC-OUT-007 | 初期 Ideation で後続 phase の詳細成果物や実装を作る。 | [amadeus-ideation](../../../../.agents/skills/amadeus-ideation/SKILL.md) | 採用 |

## 実行制御

| 項目 | 値 | 理由 |
|---|---|---|
| 実行スコープ | refactor | 既存の skill、README、昇格先成果物の説明を整合させる作業であり、新しい機能価値の追加ではないため。 |
| 省略 stage | なし | README、skill 契約、eval、Codex metadata、昇格先成果物の確認を要求、Unit、Bolt に分解する必要があるため。 |

## 成果物深度

| 項目 | 値 | 理由 |
|---|---|---|
| 深度 | standard | 公開入口 skill と内部 skill の境界、互換性判断、検証入口を追跡できる粒度が必要であるため。 |

## 検証戦略

| 項目 | 値 | 理由 |
|---|---|---|
| 戦略 | standard | `skill-forge` の確認観点、README 差分、source skill と昇格先成果物、validator または text contract を確認する必要があるため。 |

## Inception への引き継ぎ

- README の skill 分類と、実際の `skills/amadeus-*`、`.agents/skills/amadeus-*` の一覧差分を確認する。
- 公開入口 skill、補助 skill、内部 skill の分類基準を要求化する。
- `skill-forge` で確認する観点を、trigger description、skill 本文、eval、Codex metadata、昇格先成果物に分ける。
- 互換性維持対象がない場合は、旧入口、旧名、alias、互換層を追加しない判断を受け入れ条件へ渡す。
- README を更新する場合は、skill 契約、validator、example とのずれが残らない検証を Construction へ渡す。
