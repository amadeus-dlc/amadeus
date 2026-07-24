# Ideation Decision Log — mirror-auto-modes

> 上流入力（consumes 全数）: `intent-statement.md`、`scope-document.md`、`intent-backlog.md`、`feasibility-assessment.md`、`constraint-register.md`。`competitive-analysis.md`、`team-assessment.md`、`wireframes.md`はN/A。

## Product Contract Decisions

| ID | 決定 | 根拠・時刻 |
|---|---|---|
| D-01 | `auto-mirror`は`off | prompt | auto`の3値とする | Intent Captureの事前合意、2026-07-24 |
| D-02 | 旧booleanは受理せず、互換性を維持しない | Intent Capture Q1、2026-07-24T01:59:38Z |
| D-03 | 未指定時は`prompt` | Intent Capture Q2、2026-07-24T02:00:21Z |
| D-04 | `auto`のcreateはIntent Capture承認直後 | Intent Capture Q3、2026-07-24T02:04:15Z |
| D-05 | `auto`のsyncはphase完了・park・workflow完了時 | Intent Capture Q4、2026-07-24T02:05:03Z |
| D-06 | Amadeus作成Issueだけを最終sync成功後にauto close | Intent Capture Q5、2026-07-24T02:06:25Z |
| D-07 | GitHub操作失敗時もWorkflowを継続し、未同期を記録して再試行 | Intent Capture Q6、2026-07-24T02:07:01Z |

## Feasibility and Governance Decisions

| ID | 決定 | 根拠・時刻 |
|---|---|---|
| D-08 | 判定は条件付きGO。重複create防止とprovenance証明をhard conditionとする | `feasibility-assessment.md` |
| D-09 | `auto`をIntentミラーに限定した常任同意としてteam/project ruleを最小改定する | Feasibility Q1、2026-07-24T02:14:11Z |
| D-10 | AWS・新規規制・新規データ分類はN/A | `feasibility-assessment.md` |
| D-11 | `gh`はoptional dependency、credential store委譲、record→Issue一方向を維持 | `constraint-register.md` |

## Scope and Delivery Decisions

| ID | 決定 | 根拠・時刻 |
|---|---|---|
| D-12 | 4つのproto-UnitをすべてMustとし、部分リリースしない | `scope-document.md`、`intent-backlog.md` |
| D-13 | 最初のwalking skeletonは`auto`設定→create→provenance→重複なし再試行 | Scope Definition Q1、2026-07-24T02:19:40Z |
| D-14 | 順序はrisk-firstでPU-01→PU-02→PU-03→PU-04 | `intent-backlog.md` |
| D-15 | 固定deadlineを置かず、安全条件を日程のために削らない | `scope-document.md` |
| D-16 | ConstructionのstaffingとscheduleはUnits Generation・Delivery Planning後に承認する | Team Formation SKIP時の既決project rule |

## Rejected or Deferred Alternatives

| ID | 選択しなかった案 | 理由 |
|---|---|---|
| A-01 | `auto`でもsyncだけ自動 | 名称と挙動が一致せず、本Intentの問題を解消しない |
| A-02 | boolean互換shim | ユーザーが互換維持を明示拒否し、team ruleも不要な互換層を禁止 |
| A-03 | `off`を未指定時の既定 | ミラー機能の案内を失うため、既定は安全な`prompt` |
| A-04 | stage完了ごとのsync | API呼出しと更新ノイズが増え、承認済み境界外 |
| A-05 | 外部作成Issueもauto close | ownershipを証明できず誤closeリスクがある |
| A-06 | 設定parserだけをwalking skeletonにする | 最大リスクとend-to-end価値を実証しない |
| A-07 | 既存Issueのsync/closeを先行 | auto createの欠落が一時的に残り、依存順序が逆になる |

## Non-Applicable Decisions

- `competitive-analysis.md`に相当する市場判断は行わない。
- `team-assessment.md`に相当するnamed team判断はInception後へ委ねる。
- `wireframes.md`に相当するUI判断は、UI非対象のため行わない。
