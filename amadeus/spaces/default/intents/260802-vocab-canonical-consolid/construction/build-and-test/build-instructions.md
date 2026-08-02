# Build Instructions — vocab-canonicalization

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

- `code-generation-plan.md` の実行形態・完了条件と `code-summary.md` の実測値(PR #2044、head b783fe45c、検証表)を本書の前提として参照した

## ビルド(投影の再生成)

対象ブランチ: `bolt/vocab-canonicalization`(PR #2044、head `b783fe45c`)

1. `bun install --frozen-lockfile`
2. 正本(`docs/guide/glossary.md` / `.ja.md`)を編集した場合: `bun scripts/glossary-projection.ts write`(4面再生成)
3. core 面(S-1/S-2)が変わる場合: `bun scripts/package.ts`(dist 7面)+ `bun run promote:self`(self-install 5面)= 13面同期
4. 同期確認: `bun run dist:check` / `bun run promote:self:check` / `bun scripts/glossary-projection.ts check`(いずれも exit 0 が正常)

ビルド生成物は決定的(生成器に時刻・乱数なし — NFR-1)。マーカー不整合・EN/JA キー欠落・空 subset・トークン残存・未解決リンクは fail-closed(NFR-2)。

## 前提条件

- Bun がインストール済みであること(リポジトリの唯一のランタイム前提)。ネットワーク・外部サービスへの依存なし。
