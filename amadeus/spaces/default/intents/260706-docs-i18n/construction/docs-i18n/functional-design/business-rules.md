# Business Rules — docs-i18n

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変換の規則

- BR-1: 英語 `*.md` が正本、`*.ja.md` が翻訳である（language-policy.md の Canonical and translation）。日本語本文は既存内容の移設とし、英語で下書きしてから日本語へ翻訳しない（Q1、.agents/rules）。
- BR-2: 英語版は意味論一致の書き直しとし、丸ごとの機械翻訳にしない（ディスパッチ承認要旨、PR #536 前例）。用語は CONTEXT.md の canonical name を使う（NFR-4）。
- BR-3: リンクは Cross-linking rules に従う: `*.md` → `*.md`、`*.ja.md` → 対応する `*.ja.md` が実在すれば `.ja.md`、なければ `.md`（language-policy.md）。

## 変更範囲の規則

- BR-4: 変更対象は対象 8 文書 + 新設 8 `*.ja.md` + 実測した参照元のリンク行に限る（C-1）。lifecycle/ 配下と language-policy / extension-guide の本体内容は変更しない。
- BR-5: B002 のコミットはファイル単位に分ける（FR-2.2）。B001 / B003 も同じ粒度で揃える（1 文書対 = 1 コミット）。
- BR-6: 対象外文書で見つけた乖離は本 Intent で修正せず、leader へ報告して Issue 候補として扱う（Scope Discipline）。
