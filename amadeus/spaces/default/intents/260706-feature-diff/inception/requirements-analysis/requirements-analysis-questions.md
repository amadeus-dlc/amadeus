# Requirements Analysis Questions — 260706-feature-diff

## 上流入力

Issue #524（Maintainer 確定の作業内容・受け入れ条件）と leader ディスパッチ。codekb: [business-overview.md](../../../../codekb/amadeus/business-overview.md)（適応コピーの位置づけ）、[architecture.md](../../../../codekb/amadeus/architecture.md)（scope 体系・エンジン seam）、[code-structure.md](../../../../codekb/amadeus/code-structure.md)（層構成 = 比較軸の实測根拠）。

Issue が確定済みの事項（配置 = docs/amadeus、言語 = en 正本 + ja、比較軸の例、出典実測、main/v2 差は要約）は再質問しない。文書設計の細部 3 問を自己判断（理由付き）で確定し、gate の人間承認で確定する。

## Q1. ファイル名

- A. `upstream-feature-diff.md` + `upstream-feature-diff.ja.md`（内容記述型。docs/amadeus の既存命名 = language-policy / extension-guide / skill-language-policy と同型）
- B. `feature-comparison.md`
- C. `aidlc-v2-diff.md`（旧 aidlc-v2-* 系文書の系譜だが、旧名 prefix は避けたい）
- D. その他
- X. Other (please specify)

[Answer]: A（upstream-feature-diff.md / .ja.md）。内容記述型の既存命名慣行に一致し、rename-leftovers の旧名検出（aidlc- prefix ファイル名）にも触れない。自己判断（理由付き）。

## Q2. 文書構造（#571 素材としての再利用性）

- A. 比較軸ごとの H2 節（ライフサイクル構造 / scope 集合 / エンジンツール / hooks / sensors / audit イベント / 質問プロトコル / 多体連携 / validator / インストーラ / harness / 上流にあって Amadeus に無いもの）+ 各節に三者比較表（上流 main / 上流 v2 = b67798c3 / Amadeus）+ 出典列。冒頭に全体サマリ表と追従手順の節
- B. 1 枚の巨大な比較表
- C. その他
- X. Other (please specify)

[Answer]: A（軸ごとの H2 節 + 三者比較表 + 出典列）。受け入れ条件「1 文書で一望 + 各行に出典」を満たしつつ、#571 ガイド章が節単位で引用・リンクできる（ディスパッチ指示 4 = 章立ての再利用性）。巨大単表（B）は出典と注記が混みあい保守しにくい。自己判断（理由付き）。

## Q3. 追従手順の粒度

- A. 「基準 commit 更新時にどこを見るか」の手順を 1 節にまとめる（parity:check / parity-map の宣言 / 本文書の各節の出典を順に更新。再取り込みの実務は各機構の文書 = harness/codex/provenance.md 等へリンク）
- B. 機構ごとの詳細手順を本文書に複製する
- C. その他
- X. Other (please specify)

[Answer]: A（1 節 + 各機構文書へリンク）。手順の正は各機構側にあり、複製（B）は乖離コストになる（#534 の「手順の正は 1 か所」原則と同型）。自己判断（理由付き）。
