# Memory: code-generation

## Interpretations

- B002 は #400 の小さい土台 PR であり、代表 skill 1 つの英語化に限定する。
- 代表 skill は `amadeus-construction-functional-design` とした。`amadeus` 入口より小さく、Construction の代表的な stage 条件、gate、autonomy、Domain Map / Context Map 反映規則を含むためである。
- `agents/openai.yaml` は既に英語 metadata であり、今回の frontmatter 英語化に伴う追加変更は不要と判断した。
- `dev-scripts/evals/amadeus-templates/check.ts` は旧日本語文言そのものを検査していたため、英語化後の同等契約を検査するよう更新した。
- `Construction Autonomy Mode: autonomous` のため、会話内 gate は提示せず、approval evidence は B002 PR merge 後に記録する。

## Deviations

- Functional Design、NFR Requirements、NFR Design、Infrastructure Design は skip した。#400 は skill 文面と昇格フローの確認であり、新しい業務ロジック、非機能要求、インフラ設計を追加しないためである。
- promoted copy は手作業で編集せず、promotion flow で同期した。
- テスト実行は Build and Test に残した。

## Tradeoffs

- `amadeus` 入口 skill を先に英語化すると Intake と stage routing 全体の差分が大きくなる。B002 では Construction の代表 skill に絞ることで、翻訳、意味保存、metadata、promotion flow、検証の PR 形を先に確認できる。
- `SKILL.md` の英語化後も generated artifacts と gate text を日本語維持と明示した。英語化対象と出力契約の境界を PR レビューで確認しやすくするためである。

## Open questions

- B002 PR merge 後に #400 が自動 close されない場合は、Issue #400 の明示的 close を完了証拠として扱う。
