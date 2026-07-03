# Memory: code-generation

## Interpretations

- B001 では `SKILL.md` 本文の英語化を実行せず、英語化を進めるための方針とルール衝突の解消を扱う。
- 生成される Amadeus DLC 成果物の日本語維持は、英語化方針から独立して守る契約である。
- `agents/openai.yaml` は `SKILL.md` の frontmatter description を変更する後続 Bolt で更新要否を判断する。

## Deviations

- アプリケーションコードは変更していない。
- この Unit の実装差分は文書とルール更新である。
- テスト実行は Build and Test に残した。

## Tradeoffs

- `SKILL.md` 本文の英語化を B001 に含めると #395 と #400 の境界が曖昧になるため、B001 は方針確定に絞った。
- 言語ルール変更を B001 に含めることで、#400 の小さい土台 PR が既存ルールに反しない状態を先に作った。

## Open questions

- 後続 Bolt で最初に英語化する代表 skill は #400 で確定する。
