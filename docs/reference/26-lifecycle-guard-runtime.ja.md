# ライフサイクル Guard Runtime

> 言語: [English](26-lifecycle-guard-runtime.md) | **日本語**

ライフサイクルガードは、ワークフローがこれから確定しようとする遷移について
1つの問いに答えます — このステージは成果物を出したか、このゲートで人間が動いたか、
Goal 権威はこの完了を settle させたか。
[Issue #2771](https://github.com/amadeus-dlc/amadeus/issues/2771) 以前は、
これらの答えが5つの異なる結果語彙で表現され、各 commit 経路へ手作業で配線されて
いました。そのためガードを1つ追加するたびに全ハンドラを編集する必要があり、
配線漏れはテストの失敗ではなく無音の fail-open になりました。

ライフサイクル Guard Runtime は、それらのガードが共通して話す Interface です
(`packages/framework/core/tools/amadeus-lifecycle-guard.ts`)。これは
**既存機構の汎化**であり — ステージ完了の chokepoint、blocking sensor ゲートが
コンパイル済みグラフから解決する宣言駆動の適用判定、`IntentOperationGuardResult`
の `{kind, error: {recovery}}` という結果様式 — それらの隣に建てた新しい
サブシステムではありません。

## Module

| 関心事 | 所在 |
|---|---|
| verdict 語彙・Adapter Interface・評価関数 | `packages/framework/core/tools/amadeus-lifecycle-guard.ts` |
| Stage 完了 / Phase 遷移 / Workflow 完了のレジストリ | `packages/framework/core/tools/amadeus-state.ts` |
| Intent 生成のレジストリ | `packages/framework/core/tools/amadeus-utility.ts` |
| jump の前進クロッシングにおける Phase 遷移 commit 経路 | `packages/framework/core/tools/amadeus-jump.ts` |

## Interface

```ts
type LifecycleGuardVerdict<P = never> =
  | { kind: "allowed"; receipt?: P }
  | { kind: "denied"; error: GuardRefusal }
  | { kind: "unknown"; error: GuardRefusal }
  | { kind: "not-applicable"; reason: string };

interface GuardRefusal {
  reason: string;                       // 何が問題か
  recovery?: string;                    // どう直すか
  evidence?: Record<string, string>;    // ガードが何を見たか
  audit?: "error-logged" | "none";      // どの拒否チャネルが答えるか
}

interface LifecycleGuardAdapter<C, P = never> {
  id: string;                           // policy identity
  checkpoint: LifecycleCheckpoint;
  order: number;                        // 決定的な実行順序
  evaluate: (context: C) => LifecycleGuardVerdict<P>;
}

function evaluateLifecycleGuards<C, P = never>(input: {
  checkpoint: LifecycleCheckpoint;
  targetRevision: string;               // 何を、どの revision で判定するか
  adapters: readonly LifecycleGuardAdapter<C, P>[];
  context: C;
}): LifecycleGuardDecision<P>;
```

`formatGuardRefusal` は拒否を
`reason [+ " " + recovery] [+ " (evidence: k=v; …)"]` として描画します。
3つの部分は加算的であり、これが移行対象の全ガードで文言を1バイトも変えずに済んだ
理由です — 元から文中に remedy を含んでいたガードは、その末尾を `recovery` へ
移しただけで同一の文字列を描画します。

`guardReceipt(decision, policyId)` は、通過を許した Adapter が解決した値
(Goal reconciliation receipt、検証済み repo 集合)を返します。名指しした policy が
receipt なしで allow した場合は throw します — receipt を必要とする commit 経路は、
その不在の上に進めないためです。

## Checkpoint と Seam

| Checkpoint | commit 経路 | レジストリ |
|---|---|---|
| `intent-birth` | `handleIntentBirth`、2 ラウンド(lock 前 / lock 内・migration probe の後) | `INTENT_BIRTH_GUARDS`、`INTENT_BIRTH_WORKSPACE_GUARDS` |
| `stage-completion` | `approveUnderLock`、`handleAdvance`、`handleFinalize`、`completeWorkflowForTarget` — `verifyStageCompletionGuards` 経由 | `STAGE_COMPLETION_GUARDS` |
| `phase-transition` | 上記4つ + jump の前進クロッシング — `verifyPhaseCheckArtifact` 経由 | `PHASE_TRANSITION_GUARDS` |
| `workflow-completion` | `completeWorkflowForTarget`、2 ラウンド(state 文書 / instance + record) | `WORKFLOW_COMPLETION_PREPARATION_GUARDS`、`WORKFLOW_COMPLETION_AUTHORIZATION_GUARDS` |

jump は phase 境界を跨ぎますが、ステージを完了させません(`[S]` / `pending` へ
倒すだけです)。したがって phase-transition checkpoint のみを評価し、
stage-completion は評価しません。この非対称は設計上正しく、census が固定します。

**census が「迂回できない」の測定述語です**
(`tests/integration/t2771-lifecycle-guard-census.integration.test.ts`)。
commit 経路をソースから列挙します — `setCheckbox(…, "completed")` を書く全関数が
chokepoint を呼ぶこと、各 chokepoint の本体が `evaluateLifecycleGuards` を呼ぶこと、
宣言された全レジストリがちょうど1つの commit 経路から到達されること。
chokepoint を通さない第5の完了ハンドラを足せば赤になります。

## 信頼区分

ガードは「誰が取り外せるか」で分かれます。Adapter 上のフラグではありません。

- **built-in** — レジストリは checkpoint を所有するファイルの module レベルの
  frozen 配列です。登録 API もメンバーを落とす設定も存在しないため、システム
  不変条件のガードを利用者が無効化することはできません。
- **ユーザ空間** — プロジェクトが供給するポリシーは、それを読む Adapter を通じて
  入ります。現在は `stage-completion.blocking-sensors` がそれで、プロジェクトが
  `.claude/sensors/*.md` として登録した sensor を、コンパイル済みグラフの
  `sensors_applicable` 行経由で判定します。blocking sensor を登録していない
  プロジェクトは `not-applicable` と答えられ、挙動は変わりません。

`AMADEUS_SKIP_*` スイッチは無変更で、従来どおりの意味です — 文書化された
テスト / 緊急用の seam であり、信頼境界ではありません。いずれも変数名を reason に
含む `not-applicable` として描画されます。

## 原子性

Adapter には読み取り専用の context だけが渡り、writer は渡りません。Runtime は
state ファイルハンドルも遷移関数も与えないため、ガードは自分が判定している
ライフサイクルを進めることができません。commit 経路は評価が先、書込が後です —
すべての拒否は `writeStateFile` の前に exit するため、メモリ上の内容反転は
破棄可能であり、書きかけの遷移にはなりません。

Adapter 内で行われる唯一の書込は、stage-completion の artifact policy が
`declare-docs-only` 宣言を尊重したときに出す `GUARD_EXEMPTED` 監査行です。これは
人間が既に下した決定の証跡であってライフサイクルの変更ではありません — 遷移自体は
その行が伴う verdict を待ち続けます。

## fail-closed 集約

1. Adapter は `(order, id)` で整列します — 配列の記述順に依存せず、同じレジストリは
   どこでも同じ順で評価されます。
2. 他の checkpoint 向けに宣言された Adapter は `not-applicable` に解決されます。
3. `denied` / `unknown` / 例外はすべて遷移を止めます。`allowed` と
   `not-applicable` は通します。
4. 最初のブロッキング verdict で評価を打ち切ります。運用者が読む拒否文が
   「実際に最初に壊れているもの」になるためです。
5. 例外は `unknown` へ写像し、checkpoint・policy・target revision を evidence に
   載せます — 答えられなかったガードは「はい」と答えていません。
6. タイムアウト: Runtime は同期であり、自前の期限を課しません。時間予算を持つ
   Adapter はその失効を `unknown` として報告し、規則 3 でブロックされます。

fail-closed は**集約**の規則です。個々のガードが何を決めるかはそのガードの
ポリシーであり、本移行では変更していません — `amadeus-sensor.ts` の真理値表
(スクリプトエラーを `PASSED` へ倒す)を含みます。この fail-open はガードの*内側*に
あり、Issue #2771 の要件が既知の逸脱として記録した別件の是正対象です。

## 監査

新しいイベント種別は発明していません。拒否チャネルは verdict の audit disposition が
選びます。

| disposition | チャネル | 到達経路 |
|---|---|---|
| `error-logged`(既定) | `error()` / `die()` — `ERROR_LOGGED` を発行 | 実際の失敗を拒否する全ガード |
| `none` | Intent 生成では `refuseWithoutAudit()`、Workflow 完了では `awaitCompletion()` | 台帳に触れてはならない拒否 — 生成されなかった intent には台帳がなく、Goal 権威が settle を見送った完了は失敗ステップではなく待機状態である |

`GUARD_EXEMPTED` は既存の意味と書き手のままです。

## ガード棚卸し: 移行したもの / しなかったもの

Issue #2771 の reverse-engineering スキャンは、ライフサイクル進行ガードを 40 件
(G1〜G40)全数列挙しました。移行対象は「4 checkpoint + jump」で定義され、それ以外は
理由を明記したうえで現状の形を維持します。

| # | ガード | 区分 | 処遇 |
|---|---|---|---|
| G1 | 生成時の workspace scan | built-in | **移行** — `intent-birth.workspace-scan` |
| G2 | 予約 intent 名 | built-in | **移行** — `intent-birth.reserved-name` |
| G3 | autonomy 宣言 | policy | **移行** — `intent-birth.autonomy-declaration` |
| G4 | repo 集合の解決 | built-in | **移行** — `intent-birth.repo-set` |
| G5 | ステージ完了 chokepoint | built-in | **汎化** — レジストリ評価そのものになった |
| G6 | produces / workspace_requires | built-in + off-switch | **移行** — `stage-completion.artifacts` |
| G7 | blocking sensor ゲート | built-in + off-switch + policy | **移行** — `stage-completion.blocking-sensors` |
| G8 | 宣言駆動の sensor 適用解決 | built-in | そのまま再利用 — Adapter が呼ぶ適用判定 |
| G9 | sensor 真理値表 | built-in | **非移行** — 個別ガードのポリシー。その fail-open は既知の逸脱(別件是正) |
| G10 | unit レビュー verdict | built-in | **移行** — `stage-completion.unit-review` |
| G11 | phase-check 成果物 | built-in + off-switch | **移行** — `phase-transition.phase-check-artifact` |
| G12 | workflow 完了の入口 | built-in | **汎化** — 2 ラウンド評価 |
| G13 | prepared completion の一貫性 | built-in | **移行** — `workflow-completion.prepared` |
| G14 | 必須 plugin stage | policy | **移行** — `workflow-completion.mandatory-plugin-stages` |
| G15 | Goal reconciliation receipt | built-in | **移行** — `workflow-completion.goal-receipt` |
| G16 | Intent record の解決 | built-in | **移行** — `workflow-completion.record-resolution` |
| G17 | mirror boundary receipt | policy | 非移行 — 境界の発行であり、遷移確定のゲートではない |
| G18〜G22 | autonomy 認可・provenance・grant scope・gate 梯子・stage failure 受理 | policy | 非移行 — *autonomy 下の occurrence* を認可する軸であり、遷移確定とは別軸。移行は独自の監査面を伴う別判断 |
| G23〜G24 | interaction-kind 語彙 | policy | 非移行 — ガードではなく語彙(同名重複定義は別 Issue) |
| G25〜G29 | human presence・delegation・question 記録 | built-in + off-switch | 非移行 — *ゲート解決と回答記録*を守るもので、4 commit 経路ではない |
| G30 | autonomous Construction 下の park | policy | 非移行 — Stop hook との2層防御の CLI 側。hook 層は裁定によりスコープ外 |
| G31〜G34 | gate-start・docs-only・units-done・監査捏造防止 | built-in | 非移行 — 宣言と台帳書込を守るもので、ライフサイクル遷移ではない |
| G35〜G36 | swarm retry・swarm 収束 | policy | 非移行 — Bolt 内部のスケジューリングで状態機械の遷移を持たない |
| G37 | Bolt batch ゲート | policy | 非移行 — Bolt を跨ぐ承認の帳簿であり、4 checkpoint の外 |
| G38 | `IntentOperationGuardResult` | built-in | **再利用** — `{kind, error: {recovery}}` 様式を verdict 語彙が拡張した |
| G39 | recompose / advisory hold 結果 | policy | 非移行 — advisory であり遷移を確定しない |
| G40 | subagent PreToolUse deny | built-in(hook 層) | 非移行 — harness hook 層。状態遷移の確定は CLI 層のみで行い、hook は defence-in-depth のまま |

## Alternatives Rejected

- **既存ゲートの隣にゼロベースで新 Runtime を建てる。** 却下 — ステージ完了の
  chokepoint、宣言駆動の適用解決、recovery を持つ結果ユニオンは既に存在していた。
  並立するサブシステムは、置き換えるはずの5語彙の隣に6つめを作り、旧配線も
  到達可能なまま残る。
- **Interface だけ先に着地させ、呼び出し側の移行は後で行う。** 却下 — 配線のない
  adapter / 登録スロットの先行着地を禁じる inception ガードレールに反する。
  未配線の Interface は「保証があるように読める」dormant code である。
- **Adapter に `trust` フラグを持つユーザ空間の登録スロットを設ける。** 同じ理由で
  却下 — 今日登録すべきユーザ空間 Adapter が存在しない以上、dormant なスロットと
  どのコードも消費しないフィールドになる。信頼区分は*レジストリの所有者*と、
  既に消費者を持つ blocking-sensor Adapter が担う。
- **最初の1件で打ち切らず、全 verdict を集約してから拒否する。** 却下 — 複数層で
  同時に落ちる遷移について運用者が読む文言が変わる。層の順序は、最も狭い真の
  指摘がより広い指摘に埋もれないために存在する。
- **`AMADEUS_SKIP_*` と sensor の日付 cutoff を Runtime 側へ移す。** 却下 —
  これらは個別ガードの適用条件であり、移すことは「移行」の名の下での挙動変更に
  なる。`not-applicable` として報告され、それは元々の意味そのものである。

## 関連

- [State Machine](12-state-machine.ja.md) — これらの checkpoint が守る遷移。
- [Sensor System](07-sensor-system.ja.md) — blocking-sensor ポリシーの背後にある
  manifest と severity、および本移行が触れなかった真理値表。
- [Intent autonomy, review, and completion](24-intent-autonomy.ja.md) —
  本 Runtime に意図的に含めていない認可の軸(G18〜G22)。
