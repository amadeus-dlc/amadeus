# Scope Definition Questions

**Mode:** Chat

**ユーザー承認**: 2026-07-17T22:11:24Z — Q1〜Q6 の A と Q7 の統合 Scope を Confirm

**上流入力:** [`intent-statement.md`](../intent-capture/intent-statement.md)、[`feasibility-assessment.md`](../feasibility/feasibility-assessment.md)、[`constraint-register.md`](../feasibility/constraint-register.md)

## Q1. Minimum Viable Scope

利用者価値を届ける最小範囲をどこに置くか。

- A. 三モード契約、Codex native floor、機械的 validation、監査語彙、必要 tests・docs・生成同期を一つの完結した Intent とする
- B. 環境変数の名前変更と文書更新だけに限定する
- C. Codex floor 置換だけに限定する
- D. 汎用 driver stack まで含める
- E. 旧 PR #982 の全構想を再開する
- X. Other（自由記述）

[Answer]: A. 三モード契約、Codex native floor、機械的 validation、監査語彙、必要 tests・docs・生成同期を一つの完結した Intent とする — User input: `1` — 2026-07-17T22:11:24Z — Mode: Chat

## Q2. Must／Should／Won't

Must-have と明示的な対象外をどう分けるか。

- A. Issue #1157 の hard constraints と Conditional GO の停止条件を Must、telemetry 新設・汎用 adapter・外部 messaging・referee 再設計を Won't とする
- B. actual ultra honor telemetry の新設も Must とする
- C. 後方互換シムを Should とする
- D. adapter／contract の先行着地を許可する
- E. すべてを Must とし、Won't を設けない
- X. Other（自由記述）

[Answer]: A. Issue #1157 の hard constraints と Conditional GO の停止条件を Must、telemetry 新設・汎用 adapter・外部 messaging・referee 再設計を Won't とする — User input: `1` — 2026-07-17T22:11:24Z — Mode: Chat

## Q3. Capability Dependencies

能力間の依存をどう扱うか。

- A. worktree 隔離実証 → 三モード validation／referee 語彙 → harness wiring → tests・docs・生成同期の依存として扱う
- B. docs を実装より先に着地させる
- C. harness wiring を validation より先に着地させる
- D. 各能力を依存なしで並行着地させる
- E. Units Generation まで依存を定義しない
- X. Other（自由記述）

[Answer]: A. worktree 隔離実証 → 三モード validation／referee 語彙 → harness wiring → tests・docs・生成同期の依存として扱う — User input: `1` — 2026-07-17T22:11:24Z — Mode: Chat

## Q4. Sequencing Preference

後続の build sequence で何を優先するか。

- A. Risk-first。worktree isolation と fail-closed 境界を先に証明し、成立後に利用者価値を接続する
- B. Value-first。利用者向け文書と新しい値を先に公開する
- C. Dependency-first だけで並べ、リスクを評価しない
- D. 変更量の多いものから着手する
- E. 順序を設けない
- X. Other（自由記述）

[Answer]: A. Risk-first。worktree isolation と fail-closed 境界を先に証明し、成立後に利用者価値を接続する — User input: `1` — 2026-07-17T22:11:24Z — Mode: Chat

## Q5. Deadline and Budget

能力に紐づく hard deadline／予算上限があるか。

- A. なし。固定行数・金額・期限を設けず、各 gate で証拠と規模を審査する
- B. hard deadline がある
- C. 固定の最大行数がある
- D. 固定の費用上限がある
- E. すべての制約を後続へ先送りする
- X. Other（自由記述）

[Answer]: A. なし。固定行数・金額・期限を設けず、各 gate で証拠と規模を審査する — User input: `1` — 2026-07-17T22:11:24Z — Mode: Chat

## Q6. Kiro／Kiro IDE の共通 env 消費面

現在 `AMADEUS_USE_SWARM=1` を loud no-op とする Kiro 系をどう扱うか。

- A. 共通 enum の consumer として最小同期する。unset は native floor、`claude-ultra`／`codex-ultra` は loud-degrade、`1`／未知値は fail-closed とし、Kiro worker architecture は変更しない
- B. Kiro 系は対象外とし、旧 `1` no-op を残す
- C. Kiro にも新しい ultra driver を実装する
- D. Kiro の swarm 対応を削除する
- E. Requirements まで未決定にする
- X. Other（自由記述）

[Answer]: A. 共通 enum の consumer として最小同期する。unset は native floor、`claude-ultra`／`codex-ultra` は loud-degrade、`1`／未知値は fail-closed とし、Kiro worker architecture は変更しない — User input: `1` — 2026-07-17T22:11:24Z — Mode: Chat

## Q7. 統合 Scope の確認

上流成果物と Issue #1157 を照合した結果、Q1〜Q6 はすべて A を選ぶことで次の境界が成立する。

- 三モード契約から実装・配線・test・docs・生成同期までを同じ Intent で完結させる
- worktree isolation を Requirements 確約前の hard stop とする
- risk-first で進め、固定の行数・費用・期限上限は設けない
- Kiro 系は共通 env consumer として値検証・降格だけを同期し、新しい driver は追加しない
- provider telemetry、汎用 adapter、外部 messaging、referee 再設計は対象外とする

この統合 scope を成果物生成の基準として確定するか。

- A. Confirm（Q1〜Q6 をすべて A として確定する）
- B. Request changes（修正点を提示する）
- X. Other（別の境界を自由記述）

[Answer]: A. Confirm（Q1〜Q6 をすべて A として確定する） — User input: `1` — 2026-07-17T22:11:24Z — Mode: Chat
