# Code Summary — docs-lang-guide

上流入力: [code-generation-plan.md](code-generation-plan.md)、[business-logic-model.md](../functional-design/business-logic-model.md)

## 作成したファイル

| ファイル | 言語 | 概要 | 対応要求 |
|---|---|---|---|
| `docs/amadeus/language-policy.md` | 英語（正） | docs/amadeus 言語方針。H2: Scope / Canonical and translation / Synchronization rules / Cross-linking rules / Relation to skill-language-policy | FR-1.1 |
| `docs/amadeus/language-policy.ja.md` | 日本語（対訳） | 同上の日本語版。節構成を対応させた | FR-1.1、NFR-1 |
| `docs/amadeus/extension-guide.md` | 英語（正） | 拡張ガイド。H2: Scaling principle / Extension points / Human editing discipline / Sources | FR-2.1、FR-2.2 |
| `docs/amadeus/extension-guide.ja.md` | 日本語（対訳） | 同上の日本語版。節構成を対応させた | FR-2.1、NFR-1 |

## 編集した既存ファイル

| ファイル | 変更内容 | 対応要求 |
|---|---|---|
| `AMADEUS.md` | 作業言語節に 1 行追記。`docs/amadeus/*.md` が既存 2 箇条（返答・仕様・調査メモ・検証結果の日本語化／記述系成果物とユーザー向け gate 文言の日本語維持）の対象外であることを、SKILL.md/TS カーブアウト bullet と同じ様式で明示し、language-policy.md へリンク | FR-1.2、BR-4 |
| `docs/amadeus/skill-language-policy.md` | 冒頭に責務分担 1 文（本文書 = skill 言語 / language-policy.md = docs/amadeus 文書言語）を追記。関連文書リストに language-policy.md へのリンクを追加 | FR-1.3 |
| `docs/amadeus/steering.md` | Cross-References に extension-guide.md への参照を 1 行追加 | FR-2.5 |
| `README.md` | Documentation 節に extension-guide.md への参照を 1 行追加 | FR-2.5 |

README.ja.md は編集対象に含めていない（ディスパッチ定型文の編集許可範囲に列挙されておらず、FR-2.5 も `README.md` とだけ指定しているため）。

## 実測証跡（FR-2.3 / NFR-3）

extension-guide の執筆前に、次のアンカーを本リポジトリの実ファイルで直接確認した。いずれも推測ではなく読了して確認したものである。

- **rules_in_context の解決**: `.agents/amadeus/tools/amadeus-graph.ts:599-612` の `resolveRulesForStage` 関数。scope が `org` / `team` / `project` の rule は無条件にすべての stage へ付与され（607行目手前の分岐）、scope が `phase` の rule は `r.phase === stage.phase` の場合だけ付与される（607〜608行目）。コメント（590〜593行目）は「phase rule が一致しない場合は長さ 3（org+team+project）、一致する場合は長さ 4」と明記しており、想定どおりの実装だった。
- **template 解決順**: `.agents/amadeus/amadeus-common/protocols/stage-protocol.md:741-746`。「1. team template（`aidlc/spaces/<space>/memory/templates/X.md`）→ 2. skill 同梱 → 3. テンプレートなし」の override-before-default 順で、team template が第 1 優先であることを確認した。
- **template-override の gate 優先順位**: 当初の想定アンカー名 `amadeus-sensor-required-sections.ts` はファイルとして存在せず（`grep` が `No such file` で失敗）、実際の資料は `.agents/amadeus/sensors/amadeus-required-sections.md`（sensor manifest 本体。38〜62行目）だった。ここで「Template-override layer（file-driven）が `## Sensors` プロース上書きより優先する」という規約を確認した。実行スクリプトは `bun .claude/tools/amadeus-sensor-required-sections.ts`（manifest の `command` フィールド）であり、規約の文書はスクリプトではなく manifest の `.md` 側にあった。この差異は extension-guide 本文のアンカー記述をスクリプト名から manifest 名（`amadeus-required-sections.md`）へ訂正して反映した。
- **templates 規約（Space 側ガイダンス）**: `.agents/rules/amadeus-artifacts-and-examples.md` の「生成前チェック」節（本 Intent の project instructions として既にコンテキストにロード済みのものを実体として確認）。「テンプレートは、`aidlc/spaces/<space>/memory/templates/` の上書きがあればそれを、なければ対象 skill の同梱テンプレートを使う」と明記されている。
- **docs-only ガード**: `.agents/amadeus/tools/amadeus-state.ts:83-89`（`HARNESS_DOC_DIRS = {aidlc, .claude, .kiro, .codex, .git}`）、`:897-903`（`workspaceHasWork`。git-aware 判定＋ファイル存在フォールバック）、`:923-949`（`verifyStageArtifacts` 内の `workspace_requires` ガードと `declare-docs-only` 未宣言時の拒否文言、宣言済みなら `GUARD_EXEMPTED` を emit）を実際に読んで確認した。
- **Amadeus 独自 scope の実例**: `.agents/amadeus/scopes/amadeus-pdm.md` が実在することを `ls` で確認した。
- **codekb 再生成前例**: `aidlc/spaces/default/codekb/amadeus/timestamp.md` が実在することを確認した。
- **Space 契約**: `docs/amadeus/steering.md` の成果物表を確認した。

### 検証で裏付けが取れなかった候補（Design Honesty による訂正）

ディスパッチ定型文は「本 Intent の `runtime-graph.json` に per-stage `rules_in_context` が記録されている」ことを前提に、そこから実 directive を引用するよう指示していた。実ファイル `aidlc/spaces/default/intents/260706-docs-lang-guide/runtime-graph.json` を確認したところ、記録されているのは `stage_slug` / `started_at` / `completed_at` / `agent` / `memory_path` / `memory_entries` / `memory_breakdown` / `sensor_firings` / `outcome` / `learnings_captured` という stage 実行のサマリーであり、`rules_in_context` 配列そのものは含まれていなかった。

このため、rules_in_context の実配線については本 record を実 directive の引用元として使わず、`amadeus-graph.ts` のコンパイラ実装（上記）を直接の実測アンカーとした。extension-guide.md / extension-guide.ja.md の「Sources」節にも、この検証結果と訂正をそのまま明記している。

## PR 準備前の残タスク

- `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-docs-lang-guide` によるレコード構造検証
- `npm run test:all` の実行と結果記録
- 上記いずれも本 record の後続（build-and-test 相当の検証、または PR 作成前チェック）で実施する
