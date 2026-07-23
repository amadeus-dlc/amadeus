# Business Rules — U3-mirror-config(260719-mirror-productization)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## BR-U3-1: fail-closed パース(FR-4)

未知キー・型不整合・JSON 構文破損は invalid として**全件列挙**(最初の1件で打ち切らない — amadeus-settings.ts の invalid 収集様式)。invalid は例外でなく型(ConfigParseResult)で運ぶ。

## BR-U3-2: 不在は正常、invalid は loud(FR-4)

- ファイル不在(absent)= 空層として正常(3面とも不在なら default `{ autoMirror: false }`)
- invalid 層が1面でもあれば ResolveOutcome 全体を invalid とし、消費側(C4/CLI)は loud エラーで停止 — 「読めた層だけで解決」する fail-open を作らない

## BR-U3-3: 下位優先(C-06 既決)

同一キーが複数層にあれば intent > space > global。採用層の正しさは観測可能な最終値のテスト(層別に識別可能な値の 8 組合せ fixture)で検証する — 記録フィールドは持たない(検証劇場 Forbidden)。

## BR-U3-4: 読取専用(W-01/services.md)

書込 API を提供しない。設定変更は git 管理ファイルの手編集のみ。

## BR-U3-5: 意図的相違の明文照合(decisions.md 転記)

amadeus-settings.ts の「全モード off を invalid とする」規則は適用しない — auto-mirror は off が正常 default(単一 boolean のため「全 off = 設定の空洞化」が成立しない)。
