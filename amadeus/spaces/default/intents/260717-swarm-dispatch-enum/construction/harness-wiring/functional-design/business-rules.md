# Business Rules — harness-wiring(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。追加で実依拠した上流: `decisions.md`(ADR-4)、`constraint-register.md`(C-17/C-18)。

## 配線ルール

- BR-W1(resolve 前置): 全 harness SKILL の invoke-swarm 節は「dispatch 前に resolve 実行・exit 1 で停止」を明記(受け入れ = t181 parity で 4 harness の記述一致。t181 REQUIRED_TOKENS への追加候補は code-generation で確定 — 例: `resolve --harness` / `claude-ultra` / `codex-ultra` / fail-closed 系トークン)
- BR-W2(表示と audit の同値): degraded の利用者表示は requested 値をそのまま含む1行。`--degraded-from` に渡す値と同一(FR-3、受け入れ = 表示文と audit fixture の同値検査)
- BR-W3(headless swarm floor 撤去): codex source(SKILL:57,171・onboarding.fills:55)から swarm floor としての `codex exec` 記述を全撤去(受け入れ = codex 正本の swarm 節 grep で `codex exec` 0。:42/:81 の非 swarm 用途は残存許可 — 対象面精密化表のとおり)
- BR-W4(Kiro 系): unset=既存 native floor 記述維持 / 両 ultra=loud-degrade+`--degraded-from` / `1`・未知値=fail-closed(resolve 経由)。旧 `1` の no-op 記述を除去(受け入れ = kiro/kiro-ide 正本 grep で `AMADEUS_USE_SWARM=1` 0)

## テスト帰属ルール

- BR-W5(journey テスト棚卸しの結論): `tests/e2e/t-exec-codex-journey-workspace.serial.test.ts` は **退役しない** — 対象は stages 2.1/3.5 系の codex exec 経路(スコープ外で存続)。swarm floor 固有の exec 記述をアサートしている場合のみ該当アサートを native floor へ置換(受け入れ = 同テストの検証対象を実読し、swarm floor 依存アサートの有無を実測してから diff を最小化)
- BR-W6(retry の取り違え禁止): 誤 worktree 書き込みの**一次(唯一)防御は c2 規律**(dispatch prose の worktree 内相対パス限定・割当ツリー外 git 操作禁止の毎回明示)である。referee アンチタンパー(amadeus-swarm.ts:199-213 fileTampered)は保護対象 spec 1 ファイルの `git diff --quiet HEAD -- <path>` 比較のみで、**別 unit worktree への実装コード書き込みは検出しない**(検出機構の新設はしない — 新規機構最小化)。結果帰属の正しさは identity=unit slug+worktree 状態(business-logic-model の契約)で担保する(受け入れ = (i) codex SKILL の dispatch prose に worktree 限定指示が実在(t181 トークン) (ii) retry 手順が unit slug 基準で記述され child id を契約にしない記述の実在。t134 tamper 系 green は BR-W6 でなく BR-6 = referee 不変の受け入れであり本則の根拠にしない)
