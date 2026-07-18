# Business Logic Model — harness-wiring(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。追加で実依拠した上流: `decisions.md`(ADR-4)、`constraint-register.md`(C-17/C-18)。

## conductor dispatch フロー(全 harness 共通の SKILL prose 契約)

1. engine の invoke-swarm directive 受領後、dispatch 前に `resolve --harness <self>` を実行(U1 の CLI)
2. exit 1(rejected)→ 即停止し stderr のエラーを利用者へ提示。worktree/spawn/SWARM_STARTED ゼロ(FR-2)
3. `degraded` → 利用者向け1行表示(requested と floor を明示)+ prepare へ `--degraded-from <requested>` を渡す(FR-3)
4. `selected` → harness 別 fan-out へ:
   - claude + subagent: N 並列 Task(現行維持)
   - claude + claude-ultra: Dynamic Workflow。Workflow tool 不在の実行時検知では floor へ loud-degrade+`--degraded-from claude-ultra`(既存挙動の三値語彙化)
   - codex + subagent / codex-ultra: 下記 native fan-out
   - kiro / kiro-ide + subagent: 既存 native floor(現行維持)

## Codex native fan-out(FR-5 — C-13/C-14 evidence 済み経路の運用化)

- spawn: 同一セッション内 native subagent を unit ごとに 1 体。タスク文には prepared worktree パス+worktree 内相対パス指示(c2 規律)を含める。`codex-ultra` 時のみ reasoning effort=ultra を指定(受理までが証拠限界 — NFR-2 開示を SKILL に併記)
- 回収: 各 child の完了報告+worktree 実状態(コミット実在)で判定。判定の authority は referee `check`/`finalize`(既存)— child 報告は advisory
- retry identity(C-18 契約): **identity は unit slug**。child agent id は session-local で永続不可のため、unit→child の対応は「そのユニットの worktree に書けるのは当該 child のみ」という隔離で担保する。失敗 unit の retry は同 unit slug の新 child を spawn(前 child の結果は worktree 上のコミットとして残存 — 取り違え不能)。結果の帰属は worktree 状態が正
- wave(C-17): session slot < batch のときは wave 分割 or 逐次。正しさは per-unit の referee check に閉じ、並行度に依存しない(直列でも同一結果)

## 変更対象面の精密化(AD C4 からの申告付き縮小)

| 面 | 扱い | 根拠(実文確認) |
|---|---|---|
| codex SKILL.md:57,171(swarm floor 節) | 置換 | swarm floor = codex exec の記述面そのもの |
| onboarding.fills.ts:55(Swarm floor bullet) | 置換 | 同上 |
| onboarding.fills.ts:42(agents_note) | **不変更** | subagent stages 2.1/3.5 の codex exec は swarm floor でなくスコープ外(scope S-04 は swarm 通常経路のみ。Acceptance Boundary の禁止対象は「headless **swarm floor**」) |
| emit.ts:81(config コメント) | **不変更** | 「HEADLESS runs (codex exec workers, CI, test drivers)」は stages 2.1/3.5・CI を含む一般 headless 注記で、swarm floor 撤去後も真(実文 :75-90 確認) |

AD C4 は 4 面を一括列挙していたが、実文確認により変更は 2 面に縮小する — 本表が宣言(無申告逸脱ではない)。reviewer は本縮小の妥当性を検分対象とすること。
