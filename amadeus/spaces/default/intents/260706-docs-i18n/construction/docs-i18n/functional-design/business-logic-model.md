# Business Logic Model — docs-i18n

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## Bolt 構成と実施順（C-4 の直列）

| Bolt | Issue | 対象 | 成果物 |
|---|---|---|---|
| B001 | #521 | steering.md（75 行） | steering.md（英語）+ steering.ja.md（日本語）+ 参照元更新 |
| B002 | #522 | aidlc-v2 系 5 文書（76 / 70 / 71 / 81 / 84 行） | 各 `*.md`（英語）+ `*.ja.md`（日本語）。コミットはファイル単位（FR-2.2） |
| B003 | #523 | skill-language-policy.md（109 行）+ skill-englishization-rollout-plan.md（99 行） | 各 `*.md`（英語）+ `*.ja.md`（日本語）+ 参照元更新 |

## 各文書の変換手順（全 8 文書共通）

1. 現行の日本語本文を `<name>.ja.md` へ移す（Q1 = 既存本文の移設。書き換えは英語化で判明した誤り・旧名の修正に限る）。
2. `.ja.md` の H1 を「English Title（日本語名）」形式にする（前例: `# Language Policy（言語方針）`）。本文見出しは日本語のまま。
3. `<name>.md` を英語で書き直す（意味論一致。丸ごとの機械翻訳ではない。英語見出しを新設 = Q3。用語は CONTEXT.md の canonical name = NFR-4）。
4. `.ja.md` 内のリンクは Cross-linking rules に従い、対応する `.ja.md` が実在する場合だけ `.ja.md` を参照する（実在するのは language-policy / extension-guide + 本 Intent 新設分）。
5. 英語版内のリンクは `.md` を参照する。

## 参照元更新の計画（Q2 = *.ja.md 限定）

| 参照元 | 更新内容 | Bolt |
|---|---|---|
| README.ja.md（Space reference 行） | steering.md → steering.ja.md | B001 |
| extension-guide.ja.md | steering.md 参照があれば → steering.ja.md | B001 |
| README.ja.md（skill 言語方針行） | skill-language-policy.md → skill-language-policy.ja.md | B003 |
| language-policy.ja.md | skill-language-policy.md → skill-language-policy.ja.md | B003 |
| B002 で新設する aidlc-v2 系 `.ja.md` | 相互参照・skill-language-policy 参照を `.ja.md` 優先へ | B002/B003 |
| AMADEUS.md、AGENTS.md、.agents/rules/**、英語 `.md` 群 | 変更なし（正本 `.md` 参照を維持 = Q2） | — |

## 検証の流れ

1. 各 Bolt 完了時に対象文書の英日を突き合わせ、意味論一致を確認する（最終的に reviewer が全体を突き合わせ = NFR-1）。
2. B003 完了までに reviewer（Codex / GPT-5.5）の初見読者レビューを 1 回実施し、合否基準（High 相当 0 件または対応完了）で判定、decision に記録する（NFR-1）。
3. 全対象文書 + 参照元のリンク解決可能性を機械検査し、broken 0 件を PR 説明に記載する（NFR-3、scratchpad の一時スクリプト）。
4. PR 前に validator + `npm run test:all` を実行し記録する（C-2）。
