# Security Design — U5 metrics

上流入力(consumes 全数): security-requirements ほか performance-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)— セキュリティ要件は requirements.md FR-RES-4 の二層 redaction 原則+ project.md Mandated(export-boundary-redaction)から代替導出。business-logic-model.md(実在)の INSTRUMENTS 閉集合と attribute 語彙統制を消費。tech-stack 前提は codekb technology-stack.md 260801 現在節に依拠。

## 情報漏洩統制

- 計器名・attribute キーは INSTRUMENTS 閉集合(5計器)+低 cardinality 語彙のみ — 自由文字列(メッセージ・パス・ユーザー入力)を metric attribute に載せる経路を作らない。閉集合外は組み立て時に拒否(fail-closed = caller bug)
- 数値(token 数・件数・所要時間)のみが測定値 — 機微情報が値として流れる面が構造的にない
- export 境界は local-metric-exporter の既存 redaction(:71)を無改変で通す(二層原則の export 層)。resource 面の redaction は U1 の write-time 層が bag 時点で適用済み

## token usage の供給境界

- token 数の供給は supplier seam(U1 所有)経由 — core がハーネス API・課金情報へ直接アクセスしない(NFR-2 中立境界がセキュリティ境界を兼ねる: 認証情報を core に持ち込まない)

## 検証

- 閉集合外計器名・閉集合外 attribute キーの注入で拒否(throw)を assert(落ちる実証)。redaction 層の通過は既存 t-otel-redaction 系の green 維持で確認
