# Code Summary — docs-consistency

上流入力: [code-generation-plan.md](code-generation-plan.md)

## 変更ファイル一覧

### B001（rollout-plan 退役）

| ファイル | 変更種別 |
|---|---|
| `docs/amadeus/skill-englishization-rollout-plan.md` | 削除（`git rm`、互換 stub なし） |
| `docs/amadeus/skill-englishization-rollout-plan.ja.md` | 削除（`git rm`、互換 stub なし） |
| `docs/amadeus/skill-language-policy.md` | Related documents のリンク行を到達点段落へ置換 |
| `docs/amadeus/skill-language-policy.ja.md` | 関連文書のリンク行を到達点段落へ置換 |
| `docs/amadeus/aidlc-v2-reviewer-mapping.md` | rollout-plan へのリンク行を除去 |
| `docs/amadeus/aidlc-v2-reviewer-mapping.ja.md` | rollout-plan へのリンク行を除去 |

### B002（Operation 記述の 2 層構造化）

| ファイル | 変更箇所 |
|---|---|
| `docs/amadeus/lifecycle/overview.md` | Operation 定義行（旧 L86）、ツリー内コメント（旧 L197）、差分表の Operation 行（旧 L270） |
| `docs/amadeus/lifecycle/overview.ja.md` | 同上（日本語版） |
| `docs/amadeus/lifecycle/scopes.md` | L41 の前提記述、L104 の差分説明 |
| `docs/amadeus/lifecycle/scopes.ja.md` | 同上（日本語版） |
| `docs/amadeus/lifecycle/state.md` | L64 の Stage Progress 断定文 |
| `docs/amadeus/lifecycle/state.ja.md` | 同上（日本語版） |
| `docs/amadeus/lifecycle/construction.md` | L221 の Notes 断定文 |
| `docs/amadeus/lifecycle/construction.ja.md` | 同上（日本語版） |
| `amadeus/spaces/default/memory/phases/operation.md` | L7 の根拠引用（steering、日本語のみ） |
| `docs/amadeus/aidlc-v2-operation-phase-boundary.md` | 冒頭の位置づけ注記追加、Decision 節の断定文 3 文（Operation 全体・Stage Progress・skill 追加）の補正 |
| `docs/amadeus/aidlc-v2-operation-phase-boundary.ja.md` | 同上（日本語版） |

### 記録整合

| ファイル | 変更内容 |
|---|---|
| `amadeus/spaces/default/intents/260706-docs-consistency/amadeus-state.md` | `Per unit: [TBD]` を実 unit 名 `Per unit: docs-consistency` へ更新（units-generation SKIP scope の既知対応、team.md Corrections 記載の前例 e10f8294 に倣う） |

## 検証（NFR-1 の 4 項目）の実行ログ要約

1. **`npm run test:all`** — pass。全 suite（rename-leftovers、linter-sensor、model-overlay、engine-e2e、`diff:check` 等）が green で完走した。
2. **リンク切れ grep**（`grep -rln "skill-englishization-rollout-plan" docs amadeus | grep -v "/intents/"`）— record 外 0 件。`docs/amadeus/skill-language-policy.{md,ja.md}` に残る 2 件は、退役経緯の参照として意図的に残した `git log -- docs/amadeus/skill-englishization-rollout-plan.md` の文字列であり、リンクではない。
3. **Operation 矛盾表現 5 文字列の単純横断 grep**（`docs/amadeus/` + `amadeus/spaces/default/memory/`、record 除外。対象: `always `[S]``、`excludes the Operation phase`、`does not treat any stage as an execution target`、`does not run any of its stages`、`全 scope で Operation ステージは SKIP される`）— 0 件。
4. **validator**（`bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-docs-consistency`）— pass。「不足または矛盾」0 件（記録整合の実施後）。

## 逸脱の有無

- 逸脱なし。設計（business-logic-model.md / business-rules.md / domain-entities.md）に記載の対象範囲・文例・grep 方式どおりに実施した。
- scopes.md のステージ数表（BR-8 の再実測対象）は `bun run .agents/amadeus/tools/amadeus-utility.ts scope-table` の実測値と文書記載値（bugfix 7/32、refactor 8/32、poc 8/32 等）が完全一致したため、数値そのものの書き換えは不要だった。文言のみを 2 層構造の説明へ更新した。
- 設計記載の行番号（overview L86/L197/L270、scopes L41/L104、state L64、construction L221、skill-language-policy L109、aidlc-v2-reviewer-mapping L81）は、実測との照合で全一致を確認した。ずれはなかった。

## reviewer iteration 1 対応（NOT-READY からの補正）

conductor が実測裏取り済みの指摘 3 件を、確定方針に従って補正した。

### 指摘 1【HIGH】state.md/state.ja.md の自己矛盾 + 「2 層」表現の実装乖離 → 3 層化

実測事実: `.agents/skills/amadeus-validator/validator/lifecycle-v2.ts` 103 行・220 行の `operationSlugs` 判定は、scope の宣言（`def.scopes.includes(scope)`）を経由せず、Operation phase の全 stage を無条件・全 workspace 共通で `[S]` または `[ ]+SKIP` 表記に強制する。したがって「実行可否は scope-grid と workspace steering の 2 層で決まる」という記述は現行の実行系（validator）に対して正確ではなく、次の 3 層で説明する必要がある。

1. scope-grid は Operation ステージを scope 別に宣言する（CONDITIONAL 採用 = 契約宣言）。
2. 現行の validator は Operation の実行を未サポートで、scope によらず全 workspace で全 Operation ステージに `[S]` を要求する（実行そのものは将来採用。`docs/amadeus/aidlc-v2-operation-phase-boundary.md` の Entry Point for Future Adoption 節を参照）。
3. default space は steering（`memory/phases/operation.md`）でも対象外と定める。

補正箇所（英日）:
- `docs/amadeus/lifecycle/state{.md,.ja.md}` L64 相当: 2 層の記述に「現行の validator は全 workspace で `[S]` を追加で要求する（実行は将来採用）」の 1 句を追加。
- `docs/amadeus/lifecycle/state{.md,.ja.md}` の「phase 遷移」節（Operation の記述行）: 「scope-grid 上は CONDITIONAL 採用だが、現行 validator は全 workspace で `[S]` を要求する（実行は将来採用）。default space は steering でも対象外と定める」の趣旨へ補正。
- `docs/amadeus/lifecycle/state{.md,.ja.md}` の「検証」節（validator の検査内容の説明行）: 実装と一致するため文自体は維持し、「（Operation の実行は将来採用である。boundary 文書を参照）」の 1 句を添えて位置づけを明示。
- `docs/amadeus/lifecycle/overview{.md,.ja.md}` L86 相当、`docs/amadeus/lifecycle/scopes{.md,.ja.md}` L41 相当: 同じ 1 句（現行 validator は全 workspace で Operation を `[S]` 要求 = 実行は将来採用）を最小限追加し、全文書の説明を 3 層で統一した。
- `amadeus/spaces/default/memory/phases/operation.md` は変更していない（「該当 scope の Intent では各ステージを理由付き skip で処理する」は実運用と一致しており、validator 言及は steering 文書の責務外という conductor 判断による）。

### 指摘 2【MEDIUM】aidlc-v2-difference-response-plan{.md,.ja.md} L29/L38 の現在形断定 → scope 追加で補正

本 Intent のスコープに追加して補正した（conductor 判断: Issue #576 の受け入れ条件に直結し、gate 報告で範囲追加として leader へ明示する）。L29（対応順序表の #394 行）と L38（PR 記述要件表の #394 行）の「Operation phase is currently out of Amadeus DLC's scope」「Operation phase が現在の対象外である理由」等の現在形断定を、「At the time of #394, ...」「#394 時点で...」の歴史的注記付き過去形へ補正し、boundary 文書への参照を添えた（対象 5 文字列を含まない言い回し）。

### 指摘 3【LOW】boundary Decision 節の英日文構成不揃い → 統一

`docs/amadeus/aidlc-v2-operation-phase-boundary.ja.md` の Decision 節第 2 段落を、英語版と同じ 2 文構成（「当時は record の scaffold と Stage Progress の 7 行だけを持っていた」/「#394 時点で、Amadeus はいずれの Operation stage も実行対象から外し、各行を `[S]` として記録していた」）へ分割した。

### 3 層表現の統一箇所一覧

| ファイル | 箇所 |
|---|---|
| `docs/amadeus/lifecycle/state.md` / `.ja.md` | Stage Progress 注記行（L64 相当）、phase 遷移節の Operation 行、検証節の Operation 行 |
| `docs/amadeus/lifecycle/overview.md` / `.ja.md` | Operation 定義行（L86 相当） |
| `docs/amadeus/lifecycle/scopes.md` / `.ja.md` | L41 相当の前提記述 |
| `docs/amadeus/aidlc-v2-difference-response-plan.md` / `.ja.md` | L29（対応順序表）、L38（PR 記述要件表） |
| `docs/amadeus/aidlc-v2-operation-phase-boundary.ja.md` | Decision 節第 2 段落の文構成統一 |

### 再検証（NFR-1 の 4 項目、reviewer 対応後）

1. `npm run test:all` — pass。
2. リンク切れ grep — record 外 0 件（変化なし）。
3. Operation 矛盾表現 5 文字列の単純横断 grep（`docs/amadeus/` + `amadeus/spaces/default/memory/`、record 除外）— 0 件。
4. validator（`bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-docs-consistency`）— pass。「不足または矛盾」0 件。

git commit は行っていない（conductor が実施）。

## reviewer iteration 2 対応の追記

- 【MEDIUM-HIGH】iteration 1 対応時、overview / scopes / state の新 1 句が参照する boundary 文書自体が 2 層記述のままで、参照リンクが空約束になっていた（reviewer iteration 2 が検出）。boundary{.md,.ja.md} の位置づけ注記と「validator の観点」節へ 3 層（scope-grid 宣言 / 現行 validator の全 workspace `[S]` 強制 = 実行は将来採用 / default space steering）を反映し、参照先の内容を成立させた。iteration 1 対応の追記にある「全文書の説明を 3 層で統一」という宣言は boundary 未更新の時点では過大であり、本追記で実態と一致した。
- 【LOW・未対応と明示】overview のツリー内コメント（L197 相当）・差分表行（L270 相当）と scopes の L104 相当は、同一ファイル内の直前本文（3 層化済み）を要約する短い注釈のため 2 層の短縮表現のままとした（reviewer も任意修正と区分）。
