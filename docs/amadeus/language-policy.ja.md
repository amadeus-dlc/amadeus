# Language Policy（言語方針）

この文書は、`docs/amadeus/` 配下のファイルに適用する言語方針を定義する。どちらの言語を正とするか、対訳の同期をどう保つか、この配下の文書間でどうリンクするかを扱う。

Issue #509 は、既存 15 ファイルの英語化（#515〜#523）が参照できる安定した契約として、この方針を確定した。

## 対象範囲

この方針は `docs/amadeus/*.md` とその対訳である `*.ja.md` を対象とする。`docs/guide/` 配下の利用者ガイドも、同じ対規約・同期規約・リンク規約に従う（Issue #533）。

`amadeus/**/*.md`、テンプレートから生成される Markdown、`.kiro/specs/**/*.md`、`openspec/**/*.md`、ユーザー向け gate 文言は対象外である。これらは [AMADEUS.md](../../AMADEUS.md) の「作業言語」節に従い日本語のまま維持し、この方針はその扱いを変えない。

skill の言語（`SKILL.md`、TS スクリプト）も対象外である。これらは [skill-language-policy.md](skill-language-policy.ja.md) が扱う（後述の「skill-language-policy との関係」を参照）。

## 正本と翻訳

`docs/amadeus/` 配下の各文書は、次の対で公開する。

- `<name>.md` — 英語、正本。
- `<name>.ja.md` — 日本語、翻訳。

まだ対訳化されていない文書（#515〜#523 が対応するまでの間）は、英語化が完了するまで日本語単独のまま残る。この方針は目標とする状態を定義するものであり、既存文書すべての即時翻訳を義務付けるものではない。

## 同期規約

- 英語版と日本語版が乖離した場合、英語 `<name>.md` を正とする。
- `docs/amadeus/` の文書を更新する PR は、原則として `<name>.md` と `<name>.ja.md` の両方を含める。
- 片方の言語だけを更新する PR では、説明欄に理由と、もう一方の言語を追随させる計画を記す。

## 相互リンク規約

- `<name>.md` からのリンクは、他の `<name>.md` を参照する。
- `<name>.ja.md` からのリンクは、対応する `<name>.ja.md` が存在すればそれを優先して参照する。対応する日本語版が存在しない場合は `<name>.md` を参照する。

## skill-language-policy との関係

[skill-language-policy.md](skill-language-policy.ja.md) は、Amadeus skill のソース（`core/skills/amadeus*/` および `.agents/skills/amadeus*/` 配下の `SKILL.md` と TypeScript スクリプト）の言語を扱う。

本文書は、`docs/amadeus/` 配下の文書自体の言語を扱う。両者は重複しない。skill の `SKILL.md` は本方針にかかわらず英語必須であり、`docs/amadeus/` 文書の正本言語の併置は skill-language-policy の影響を受けない。
