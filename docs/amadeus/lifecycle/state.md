# State Reference

## AI-DLC v2 Reference

- [AI-DLC v2 State Machine](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/reference/12-state-machine.md)

## 責務

`state.json` は、Intent の scope、depth、phase、ステージ進行状態、承認記録を機械可読に保持する。

単一入口は `state.json` を読んで次に実行するステージを解決する。
`amadeus-validator` は `state.json` と成果物の整合を検証する。

状態の更新は、判断を skill が行い、記録の形式をこの契約が固定する。

## `state.json` スキーマ

```json
{
  "schemaVersion": 2,
  "intentId": "20260715-inventory-api",
  "scope": "feature",
  "depth": "Standard",
  "status": "in_progress",
  "phase": "inception",
  "currentStage": "requirements-analysis",
  "stages": {
    "intent-capture": {
      "state": "completed",
      "approval": {
        "approvedAt": "2026-07-15T10:30:00+09:00",
        "via": "conversation"
      }
    },
    "market-research": {
      "state": "skipped",
      "reason": "社内ツールであり外部市場の位置づけがない"
    },
    "requirements-analysis": {
      "state": "active"
    }
  },
  "phaseGates": {
    "ideation": {
      "approvedAt": "2026-07-16T09:00:00+09:00",
      "via": "pr",
      "reference": "https://github.com/<org>/<repo>/pull/123"
    }
  }
}
```

| フィールド | 説明 |
|---|---|
| `schemaVersion` | このスキーマの版。本契約は `2` を使う。 |
| `intentId` | Intent の識別子。`<YYYYMMDD>-<slug>` 形式。 |
| `scope` | 9 scope のいずれか。Intake の birth 提案で確定した値。 |
| `depth` | `Minimal`、`Standard`、`Comprehensive` のいずれか。既定値は scope が決める。 |
| `status` | Intent 全体の状態。`in_progress`、`parked`、`completed` のいずれか。 |
| `phase` | 現在の phase。`ideation`、`inception`、`construction`、`completed` のいずれか。 |
| `currentStage` | 実行中または次に実行するステージの slug。 |
| `stages` | ステージ slug からステージ状態への対応。scope が実行対象にするステージだけを持つ。 |
| `phaseGates` | phase 境界の承認記録。phase 名から approval evidence への対応。全ステージが SKIP の phase は approval evidence の代わりに `{"skipped": true}` を記録する。 |

Unit 単位ステージ（Construction 3.1〜3.5）は、`stages` の値を Unit 単位の対応に拡張する。

```json
{
  "stages": {
    "functional-design": {
      "units": {
        "U001-checkout": { "state": "completed" },
        "U002-inventory": { "state": "pending" }
      }
    }
  }
}
```

Bolt の実行状態は `bolts` に持つ。

```json
{
  "bolts": {
    "B001-walking-skeleton": {
      "state": "completed",
      "units": ["U001-checkout"],
      "gate": {
        "approvedAt": "2026-07-20T15:00:00+09:00",
        "via": "pr",
        "reference": "https://github.com/<org>/<repo>/pull/130"
      }
    },
    "B002-inventory": {
      "state": "active",
      "units": ["U002-inventory"]
    }
  },
  "autonomy": "gate_every_bolt"
}
```

`autonomy` は ladder 提案の結果であり、`continue_autonomously` または `gate_every_bolt` のいずれかを持つ。
walking skeleton の承認までは存在しない。

## ステージ状態

ステージ状態は v2 の 6 状態に対応する。

| state | v2 表記 | 意味 |
|---|---|---|
| `pending` | `[ ]` | 未着手。 |
| `active` | `[-]` | 実行中。 |
| `awaiting_approval` | `[?]` | 作業完了、ゲート待ち。人間の応答が唯一のブロッカー。 |
| `revising` | `[R]` | ゲートで差し戻され、修正中。 |
| `completed` | `[x]` | 承認済みで完了。 |
| `skipped` | `[S]` | scope または Condition により実行対象外。 |

状態遷移は次に限る。

- `pending` から `active`。ステージ開始。
- `active` から `awaiting_approval`。成果物を作りゲートを提示。
- `awaiting_approval` から `completed`。人間が承認。
- `awaiting_approval` から `revising`。人間が差し戻し。
- `revising` から `awaiting_approval`。修正後に再提示。
- `pending`、`active`、`revising` から `skipped`。Condition の判定または人間の指示。

`awaiting_approval` と `revising` を分けることで、再開時の挙動を区別する。
`revising` で再開した場合は、ステージを最初からやり直さず、前回の成果物と差し戻し理由を提示してから修正に入る。

## approval evidence

承認記録は次の形式で書く。

| フィールド | 説明 |
|---|---|
| `approvedAt` | 承認時刻。ISO 8601 形式。 |
| `via` | `conversation`（会話内ゲート）または `pr`（PR と人間 merge）。 |
| `reference` | `via` が `pr` の場合は PR の URL。`conversation` の場合は省略できる。 |

ステージゲートは `conversation`、phase ゲートと Bolt ゲートの確定は `pr` を基本にする。
Request Changes が 3 回続いた後の Accept as-is による完了は、`approval` に `"acceptedAsIs": true` を追記し、判断を phase の `decisions.md` に記録する。

## phase 遷移

phase は `ideation`、`inception`、`construction` の順に進む。

実行したステージが 1 つ以上ある phase は、実行対象ステージがすべて `completed` または `skipped` になり、phase PR が merge された時点で、次の phase へ遷移する。

scope が phase 内の全ステージを SKIP にする場合、その phase は成果物と phase PR を作らずに通過し、`phaseGates` に `{"skipped": true}` を記録する。
例として bugfix は Ideation の全ステージが SKIP であり、Intake の birth 承認を根拠に `"ideation": {"skipped": true}` を記録して、直接 Inception のステージへ進む。

`status` が `parked` の Intent は、単一入口の次の呼び出しで `currentStage` から再開する。

## カーソルとレジストリ

**active-intent カーソル**：`.amadeus/active-intent` に、現在作業中の Intent の識別子を置く。
カーソルは作業者ローカルの状態であり、gitignore にする。
Intake の継続判定は、まずカーソルの指す Intent と入力を照合する。

**レジストリ**：`.amadeus/intents.md` は全 Intent の一覧と依存を持つ生成物である。
識別子は `<YYYYMMDD>-<slug>` を使い、同日同名の衝突は末尾の連番（`-2`、`-3`）で区別する。
v2 の UUIDv7 は採用しない。

## 検証

`amadeus-validator` は少なくとも次を検証する。

- `state.json` が本スキーマに適合する。
- `completed` のステージに、契約が必須とする成果物が存在する。
- 必須入力の供給ステージが `skipped` の場合、後続ステージが [scopes.md](scopes.md) の縮退時の入力代替に従っている。
- `scope` の実行対象と `stages` のキー集合が一致する。
- 実行したステージが 1 つ以上ある phase の遷移が、`phaseGates` の approval evidence を持つ。
- 全ステージが SKIP の phase の遷移が、`phaseGates` の `{"skipped": true}` を持つ。
