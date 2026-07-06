# Code Generation Plan：#400 小さい土台 PR

## 目的

Issue #400 の小さい土台 PR として、代表 skill を 1 つ選び、意味変更を伴わない `SKILL.md` 英語化、昇格フロー、検証結果の記録方法を確認する。

## 代表 skill

`amadeus-construction-functional-design` を対象にする。

この skill は Construction Stage 3.1 の内部 skill であり、次の理由で小さい土台 PR に適している。

- `amadeus` 入口全体より範囲が狭い。
- Construction 固有のゲート、skip、承認、Domain Map / Context Map 反映ルールを含み、後続の Construction skill 英語化に再利用できる。
- 生成成果物は日本語維持であるため、`SKILL.md` 英語化と生成契約の分離を検証しやすい。

## 変更対象

| 対象 | 変更内容 | 理由 |
|---|---|---|
| `skills/amadeus-construction-functional-design/SKILL.md` | 本文と frontmatter description を英語化 | source skill の英語化対象。 |
| `.agents/skills/amadeus-construction-functional-design/SKILL.md` | promotion flow で同期 | 配布先 skill を source と一致させるため。 |
| `skills/amadeus-construction-functional-design/agents/openai.yaml` | 差分なし | 既に英語 metadata であり、今回の frontmatter 英語化に対する追加更新は不要。 |
| `.agents/skills/amadeus-construction-functional-design/agents/openai.yaml` | 差分なし | promotion flow 後も source と一致することを確認する。 |
| `dev-scripts/evals/amadeus-templates/check.ts` | 対象 skill の重要文言検査を英語文言へ更新 | 旧日本語文言そのものではなく、英語化後の同等契約を検査するため。 |
| `aidlc-state.md`、`audit/audit.md` | B002 の開始、skip、Code Generation 進行を記録 | 親 Issue #399 が #400 の順序と依存関係を追跡できるようにするため。 |
| `construction/U002-issue-400-small-foundation-pr/code-generation/*` | 計画、要約、memory を追加 | B002 の実施判断と意味保存の証跡を残すため。 |

## 保持する契約

| 区分 | 保持内容 |
|---|---|
| トリガー境界 | Stage 3.1 Functional Design だけを対象にし、新しいデータモデル、複雑な業務ロジック、業務ルール設計が必要な Unit だけで実行する。 |
| skip 条件 | 新しい業務ロジックのない単純な変更では成果物を作らず、checkbox を `[S]` にして `STAGE_SKIPPED` を記録する。 |
| 再開規則 | `[?]` はゲート再提示、`[R]` は差し戻し修正だけを行い、手順を最初からやり直さない。 |
| 生成成果物 | Functional Design 成果物、gate text、未知値 `未確認`、テンプレート由来 Markdown は日本語維持にする。 |
| Domain Map / Context Map | 候補は `domain-entities.md` に記録し、承認済みの採用判断だけを Domain Map / Context Map に反映する。 |
| autonomy | `Construction Autonomy Mode: autonomous` の非 walking skeleton Bolt では会話内ゲートを提示せず、approval evidence は Bolt PR merge 後に記録する。 |
| 禁止事項 | 実装、テスト、Bolt 記録をこの skill で作らない。承認前に checkbox を `[x]` にしない。 |

## 変更順序

1. source 側 `SKILL.md` を英語化する。
2. `bun run dev-scripts/promote-skill.ts amadeus-construction-functional-design --replace` を実行する。
3. source と `.agents/skills` の `SKILL.md`、`agents/openai.yaml` が一致することを確認する。
4. skill 本文の重要契約を検査する eval を、英語化後の同等文言へ更新する。
5. Code Generation 成果物を記録する。
6. B002 の Build and Test で promotion flow、全体テスト、Amadeus Validator を実行する。

## 検証方法

Code Generation では、次の事前確認だけを行う。

- promotion flow が成功すること。
- source と promoted copy の `SKILL.md` が一致すること。
- source と promoted copy の `agents/openai.yaml` が一致すること。

テスト実行と結果記録は B002 の Build and Test で行う。

## 対象外

- `amadeus` 入口 skill の英語化。
- 他の Construction skill の英語化。
- generated artifacts、templates、`aidlc/**/*.md` の英語化。
- 意味変更、挙動変更、ステージ条件の変更。
- Issue #400 の close。
- PR の作成。
