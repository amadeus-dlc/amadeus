# Intent Backlog — mirror-auto-modes

> 上流入力（consumes 全数）: `intent-statement.md`、`feasibility-assessment.md`、`constraint-register.md`

## Prioritization Method

MoSCoWでは4件すべてをMustとする。順位は数値を捏造するWSJFではなく、依存関係と`feasibility-assessment.md`で特定した重大リスクを先に閉じるrisk-first方式で決める。

## Prioritized Proto-Units

| 順位 | ID | Proto-Unit | Priority | 依存 | 完了時に得られる価値・確信 |
|---:|---|---|---|---|---|
| 1 | PU-01 | Safe Auto-Create Walking Skeleton | Must | なし | `auto`設定からIntent Capture承認後のcreate、provenance保存、部分失敗後の重複なし再試行までをend-to-endで実証する |
| 2 | PU-02 | Three-Mode Lifecycle Policy | Must | PU-01 | `off`・`prompt`・`auto`をcreate・sync・closeへ一貫適用し、phase・park・complete境界を固定する |
| 3 | PU-03 | Non-Blocking Reconciliation | Must | PU-01、PU-02 | create・sync・closeの全失敗でWorkflow継続、未同期可視化、冪等再試行、成功後の収束を実証する |
| 4 | PU-04 | Productization Closure | Must | PU-01〜PU-03 | 規範、全harness配布、日英文書、回帰・drift guardを同期し、利用者が安全に導入できる状態にする |

## Proto-Unit Details

### PU-01 — Safe Auto-Create Walking Skeleton

**Outcome:** `auto-mirror: auto`を設定したIntentが、Intent Capture承認後に1つだけMirror Issueを作成し、そのIssueがAmadeus作成であることを永続的に証明できる。

**Includes:**

- 3値config parse、既定値`prompt`、boolean拒否
- `auto`でのIntent Capture承認後create seam
- duplicate guardとprovenance
- 「Issue作成成功・ローカル記録失敗」のfailure injectionと重複なし再試行
- 最小end-to-endテスト

**Does not yet claim:** phase/park/completeの全同期、close、全harness文書化。

### PU-02 — Three-Mode Lifecycle Policy

**Outcome:** 3モードがcreate・sync・closeの全操作で同じ意味を持つ。

**Includes:**

- `off`の完全抑止
- `prompt`の操作前確認
- `auto`のphase完了・park・workflow完了sync
- ownership、最終sync、着地確認を満たすauto close
- mode×operation×boundaryの決定表テスト

### PU-03 — Non-Blocking Reconciliation

**Outcome:** GitHub障害がWorkflowを停止させず、共有面の不整合も不可視にしない。

**Includes:**

- create・sync・close失敗の未同期状態
- warning/status表示
- 次の適格境界での再試行
- receiptとprovenanceを用いた冪等性
- 未認証、API失敗、部分成功、再入のfailure injection

### PU-04 — Productization Closure

**Outcome:** 3モード契約が規範、配布物、文書、検証で一致する。

**Includes:**

- team/project ruleの限定改定
- coreから各harness、`dist/`、self-installへの生成
- 日英のguide/reference更新
- unit/integration/e2e、typecheck、lint、dist/self-install drift guard
- boolean設定から3値への明示更新例

## Dependency Flow

`PU-01 → PU-02 → PU-03 → PU-04`

PU-03の状態表現はPU-01/PU-02の実行結果を統合するため後続とする。PU-04の文書起草は並行可能だが、最終契約と生成物を実測して閉じる作業はPU-01〜PU-03の後に行う。

## Deferred Backlog

| ID | 項目 | 分類 | 理由 |
|---|---|---|---|
| D-01 | GitHub以外のtracker対応 | Won’t | 現行の利用者価値に不要で、transport abstractionを増やす |
| D-02 | stage完了ごとのsync | Won’t | 更新ノイズとAPI呼出しを増やし、ユーザー裁定の境界外 |
| D-03 | boolean互換shim | Won’t | 明示的に非互換と裁定済みで、team ruleも不要な互換層を禁止 |
| D-04 | 外部Issueのauto close | Won’t | ownershipを証明できず、誤closeリスクがある |
| D-05 | Web UI・常駐scheduler | Won’t | Workflow境界のengine指令で価値を満たせる |

## Release Boundary

PU-01だけの出荷はしない。PU-01はwalking skeletonの検証ゲートであり、PU-01〜PU-04がすべて完了して初めて`auto-mirror`の3モード変更を利用者向け機能としてリリース可能とする。
