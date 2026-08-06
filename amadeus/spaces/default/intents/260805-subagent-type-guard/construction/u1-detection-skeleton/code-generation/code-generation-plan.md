# Code Generation Plan — U1 detection-skeleton

**上流入力(consumes 全数)**: `unit-of-work`(U1 の範囲・完了条件 AC-1/AC-2・fail-open テスト — 各ステップの導出元)/ `requirements`(FR-1/FR-2・AC-1/AC-2・NFR-1〜4 — ステップ→要件トレーサビリティの行き先)/ `unit-of-work-story-map`(検出ジャーニー「規約外起動に気づく」— トレーサビリティの併記先)/ `business-logic-model`(処理フロー・モジュール構成・エラーモデル — ステップ順の設計根拠)/ `business-rules`(BR-U1-1〜8 — 各ステップの実装契約)/ `domain-entities`(不変条件)/ `logical-components`(論理コンポーネントと障害ドメイン)/ `security-design`(サニタイズ・fail-open の安全設計)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## 実行記録としての注記(必読)

本プランは**事後の忠実な記録**である。実装は先行セッションの swarm ワーカーが隔離 bolt worktree 内で完了させ、conductor が3コミット(`9730cda6c` / `54c2117e1` / `7667586f9`)を本ブランチへ cherry-pick 済み — したがって全チェックボックスは `[x]`(完了済み)とする。詳細は code-summary.md「計画からの逸脱」と memory.md を参照。

## トレーサビリティの対応付け方針

`<record>/inception/user-stories/` は**存在しない**(self-feature スコープで user-stories ステージが生成されなかったため)。ステージ本体が要求する「ステップ→ストーリー」のトレーサビリティは、代替として **requirements の FR/AC + story-map のジャーニー** へ写す — 本選択はステップ表の「trace」列に明示し、code-summary.md にも引き継ぐ。

## テスト戦略

本 intent の有効なテスト戦略は **Comprehensive(self-feature スコープ)** — 要件駆動・リスク駆動・NFR 駆動の unit + integration テストが必須。本 Unit では:

- unit 層: `tests/unit/t451-subagent-type-classify.test.ts`(13 テスト — AC-1 の in-process 固定 + 判定順・ケーシング・サニタイズ)
- integration 層: `tests/integration/t452-subagent-observability.integration.test.ts`(10 テスト — 実 FS の許可集合解決 + completed hook 経由の AC-2 落ちる実証 + fail-open)
- 計 23 テスト / 0 失敗(`bun test tests/unit/t451-subagent-type-classify.test.ts tests/integration/t452-subagent-observability.integration.test.ts` で 2026-08-06T02:32Z に再実測)

## ステップ(実行順 — 実際に実行された順序を記録)

- [x] **Step 1: 照合ライブラリ純関数層(台帳 + verdict 分類 + advisory サニタイズ)** — `packages/framework/core/tools/amadeus-subagent-observability.ts` を新設(85 行)。`BUILTIN_AGENT_TYPES`(C-4: count-free 7 エントリ台帳、origin コメント付き、`unknown` は意図的に除外)、`TypeVerdict` 4 値 union、`isWarnableVerdict`、`classifyAgentType`(C-2: BR-U1-1 の先勝ち判定順 unknown-type → builtin → persona → outside-allowed-set)、`sanitizeAdvisoryValue`(C0 制御文字除去 + 1行化 — security-design の subagentPurposeLine 同水準)。`amadeus-lib.ts` を import しない(循環の構造的排除)。コミット `9730cda6c` | trace: FR-1b(台帳・ケーシング差明示)/ FR-2b(警告対象 verdict)/ AC-1(純関数 export)| ジャーニー「規約外起動に気づく」の判定面 | BR-U1-1 / ADR-2(完全一致・7エントリ台帳)

- [x] **Step 2: Step 1 の unit テスト(AC-1)** — `tests/unit/t451-subagent-type-classify.test.ts` を新設(127 行・13 テスト)。4 verdict 全分岐 + 判定順の不変条件(台帳へ `unknown` を注入しても `unknown-type` が勝つ / 組込型と同名の allowed 値は `builtin` が勝つ / 空 allowed でも台帳は `builtin`)+ ケーシング対照(`Explore` ≠ `explore`、台帳外のケース差は outside-allowed-set)+ 台帳内容(7 エントリ・`unknown` 非含有)+ sanitize 3 件。コミット `9730cda6c` | trace: AC-1(i)(ii)(iii)/ NFR-2(TDD)| BR-U1-7 unit 層

- [x] **Step 3: persona 半面の許可集合解決(C-1)** — `amadeus-subagent-observability.ts` に `AllowedSetResolution` / `resolveAllowedAgentTypes` を追加(56 行)。`.claude/agents/*.md` の frontmatter `name:` を機械導出して台帳と合成。dir 不在・読取失敗・name 無しは `warnings` に積んで台帳のみで続行 — **throw しない**(呼出し側が audit 書込のため)。hook 発火ごと再読・キャッシュなし(BR-U1-6)。コミット `54c2117e1` | trace: FR-1a(persona 機械導出)/ NFR-3(fail-open)| BR-U1-6 / エラーモデル表

- [x] **Step 4: Step 3 の integration テスト(実 FS)** — `tests/integration/t452-subagent-observability.integration.test.ts` の前半 describe を新設(104 行)。実 FS 経由で persona 導出の正常系・name 無し skip・非 md 除外・dir 不在の fail-open(警告あり・throw なし)を固定。コミット `54c2117e1` | trace: FR-1a / NFR-3 / BR-U1-7 integration 層(`cid:code-generation:fs-tests-integration-first`)

- [x] **Step 5: registry への optional 属性追加(C-6 の U1 半面)** — `packages/framework/core/otel/event-registry.ts` の `SUBAGENT_COMPLETED` optionalAttributes へ `"Type Verdict"` を追加(required 不変・STARTED 側は U2 範囲)。台帳の同一 PR 内順序制約「C-6 → C-5」を U1 内で成立させるため本ステップを Step 6 より先に置く。コミット `7667586f9` | trace: FR-2(記録面)/ NFR-4(registry optional のみ・スキーマ互換)| BR-U1-5

- [x] **Step 6: completed hook への差し込み(C-5 半面)** — `packages/framework/core/hooks/amadeus-log-subagent.ts` に `typeVerdictFor` を追加(33 行): `normalizeAgentType`(`:50`)直後で C-1/C-2 を呼び、警告対象 verdict なら stderr へ advisory 1行(値は `sanitizeAdvisoryValue` 済み)、`fields` へ `"Type Verdict"` を追加。catch は `null` を返す**終端 catch** とし、null 時は属性追加をスキップして既存フィールドで emit 継続(BR-U1-3 — no-silent-drop センサスの基準 213 を増やさない)。advisory は stderr のみで audit 行には触れない。コミット `7667586f9` | trace: FR-2a(completed 面照合)/ FR-2b(advisory・fail-closed 拒否なし)/ NFR-3 | BR-U1-2 / BR-U1-4 / ADR-1(属性 + stderr)

- [x] **Step 7: completed hook 経由の integration テスト(AC-2 + fail-open)** — t452 後半 describe を追加(158 行)。AC-2 の落ちる実証(集合外 payload → stderr advisory + `Type Verdict: outside-allowed-set` が audit 行に記録)/ 通る実証(persona・builtin で警告ゼロ)/ 型未指定(`unknown-type`)警告 / 改行混入値の advisory 1行化 / agents dir 不在でも emit 成功(fail-open — `cid:code-generation:inject-runtime-consumed-lines`)。コミット `7667586f9` | trace: AC-2(落ちる実証)/ FR-2b / NFR-3 / 完了条件「completed 面の fail-open テスト」| BR-U1-7

- [x] **Step 8: テスト/カバレッジ設定の更新** — `tests/.coverage-registry.json` を再生成: 新設 integration ファイルを `hook:amadeus-log-subagent` の coverer 集合へ登録(freshness ratchet 要件)。テストランナー設定は bun test 既定で新規設定ファイル不要(既存 `tests/unit` / `tests/integration` 配置規約に従属)。コミット `7667586f9` | trace: NFR-2(検証)| ステージ本体「Test configuration」ステップに相当

- [x] **Step 9: ビルド再生成と全テスト実測** — trunk で `bun run build` を実行し dist を再生成してから(NFR-1 parity — 本ブランチではこれが無いと t452 が hook の古い dist を読みテストが通らなかった)、両テストファイルを `bun test` で実測: **23 pass / 0 fail**。コミット後の検証作業として記録 | trace: NFR-1 / NFR-2

## 完了条件との対応

| 完了条件 | 充足ステップ | 実測 |
|---|---|---|
| AC-1(純関数の in-process テスト) | Step 1 + Step 2 | t451 13 テスト pass |
| AC-2(落ちる実証 — 集合外注入で警告発火) | Step 6 + Step 7 | t452「an ad-hoc type warns on stderr and records outside-allowed-set (AC-2)」pass |
| completed 面の fail-open テスト | Step 3 + Step 6 + Step 7 | t452「a missing dir degrades…」「no agents dir: the emit still lands…」pass |

設計拘束 ADR-1(属性 + stderr — Step 5/6)、ADR-2(完全一致・7エントリ台帳 — Step 1/2)はそれぞれ該当ステップの trace 列に記載どおり充足。
