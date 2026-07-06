# Code Summary：#400 小さい土台 PR

## 目的

Issue #400 の小さい土台 PR に必要な代表 skill の英語化差分を作成した。

## 変更したファイル

| ファイル | 変更内容 |
|---|---|
| `skills/amadeus-construction-functional-design/SKILL.md` | frontmatter description と本文を英語化した。 |
| `.agents/skills/amadeus-construction-functional-design/SKILL.md` | `promote-skill.ts` により source から同期した。 |
| `dev-scripts/evals/amadeus-templates/check.ts` | 対象 skill の重要文言検査を、英語化後の同等契約へ更新した。 |
| `aidlc-state.md` | B002 の開始、3.1 から 3.4 の skip、Code Generation 進行を記録した。 |
| `audit/audit.md` | autonomy mode 選択、B002 開始、3.1 から 3.4 の skip、Code Generation 開始を追記した。 |
| `construction/U002-issue-400-small-foundation-pr/code-generation/*` | Code Generation の計画、要約、memory を追加した。 |

## 更新しなかったファイル

| ファイル | 判断 |
|---|---|
| `skills/amadeus-construction-functional-design/agents/openai.yaml` | 既に英語 metadata であり、今回の英語化に合わせた変更は不要。 |
| `.agents/skills/amadeus-construction-functional-design/agents/openai.yaml` | promotion flow 後も source と一致しており、変更不要。 |
| `templates/**` | 生成成果物の日本語維持契約に従い、英語化対象外。 |

## 対応した要求

| 要求 | 対応 |
|---|---|
| R001 | #400 を B002 として開始し、#395 の完了後に実行した。 |
| R002 | #400 の完了証拠は、B002 PR の merge または Issue #400 の明示的 close として後続で記録する。 |
| R004 | 代表 skill、意味保存、昇格フロー、metadata 判断、検証予定をこの成果物と PR 説明に記録する。 |
| R005 | 親 Issue #399 が #395 → #400 → #401 → #402 の順序を追跡できるよう、B002 の開始を state と audit に記録した。 |

## 意味保存の確認

| 区分 | 確認結果 |
|---|---|
| トリガー境界 | Stage 3.1、Unit ごとの実行、新しいデータモデル、複雑な業務ロジック、業務ルール設計が必要な場合だけ実行する条件を保持した。 |
| skip 条件 | 新しい業務ロジックのない単純変更では成果物を作らず `[S]` と `STAGE_SKIPPED` を記録する挙動を保持した。 |
| 再開規則 | `[?]` と `[R]` の再開規則を保持した。 |
| 日本語維持契約 | generated Amadeus DLC artifacts、gate text、未知値 `未確認`、template 由来 Markdown の日本語維持を明示した。 |
| autonomy | 非 walking skeleton Bolt の autonomous 実行では会話内ゲートを提示しない規則を保持した。 |
| 禁止事項 | 実装、テスト、Bolt 記録をこの skill で作らない規則を保持した。 |

## 事前確認

| 確認 | 結果 |
|---|---|
| promotion flow | `bun run dev-scripts/promote-skill.ts amadeus-construction-functional-design --replace` が成功した。 |
| `SKILL.md` 同期 | source と promoted copy の `SKILL.md` が一致した。 |
| `agents/openai.yaml` 同期 | source と promoted copy の `agents/openai.yaml` が一致した。 |

## 検証

Build and Test で実行する。

Code Generation ではテスト実行結果を記録しない。

## 未完了

- B002 の Build and Test。
- B002 の Bolt PR 作成。
- PR merge または Issue #400 close による #400 完了証拠の確定。
