# Pi Coding Agent対応 — Delivery Planning判断記録

## 質問判定

質問は0件である。Issue #2130と承認済み`requirements`、`components`、`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`により、walking-skeleton-first + risk-first、Pi TUIのhuman gate、全subagent経路、transaction安全性、二重配布、doctor、文書、正式適合証拠が既決である。`stories`と`mockups`はself-feature scopeで生成されず、`team-practices`はspace memoryのWalking Skeleton、TDD、並列実装規律を適用する。

ユーザーの訂正「Issueに書かれていることは質問せず、矛盾と抜け漏れだけ質問する」に従い、既決事項を再質問しない。Unitの数値LOC見積りとreuse inventoryの欠落は、Inception phase ruleに対する明確な抜けとして`unit-of-work.md`へ補正済みであり、裁定を要する選択肢ではない。未解決の矛盾・抜け漏れは0件である。

## 解決済み計画判断

| 論点 | 採用 | 根拠 |
|---|---|---|
| Sequencing heuristic | walking-skeleton-first + risk-first + dependency-first | scope-definitionの既決順序とproject/team practice |
| WSJF | 数値WSJFを使わない | business value / time criticalityの独立weightがなく、既決の安全順序を仮のscoreで上書きしない |
| Bolt granularity | 関連Unitを束ねる最小end-to-end slice + 以降は原則1 Unit / Bolt | Bolt 1でextension event→audit→human gate→continuation→subagentを横断し、その後は所有境界を維持 |
| Parallelism | Bolt 1は単独。以降はDAG上readyなBoltだけ最大4並行 | org/teamのwalking skeleton gateとfixed-width pool規律 |
| External dependencies | Pi 0.83.0以上、Bun、trust、provider/auth、macOS/Linux、Git接続、人間TUI確認 | requirementsのformal support条件 |
| Earliest risks | native event/presence、RPC child、transaction、distribution parity、formal live evidence | failureが後続全体を無効化する順 |

## Bolt別の回答

各BoltのUnit、walking-skeleton marker、Definition of Done、confidence hypothesis、ownerは`bolt-plan.md`と`team-allocation.md`に確定値として記録する。新しい判断を含まず、承認済み上流契約を実行可能な順へ投影する。

## 上流入力の扱い

- `requirements`: SCN-001〜009、FR/NFR、Pi 0.83.0以上、formal green条件を用いた。
- `components`: Pi Manifest、Lifecycle Extension、Child Driver、Setup Transaction、Distribution、Doctor、Conformanceの境界を用いた。
- `unit-of-work` / `unit-of-work-dependency` / `unit-of-work-story-map`: 8 Unitの責務、DAG、coverageを用いた。
- `stories` / `mockups`: scope上存在しないため、SCNとobservable demoを代替にした。
- `team-practices`: walking skeleton、TDD、worktree隔離、最大4並行、既存CI再利用を用いた。
