# Architecture — 260705-space-inventory

上流入力: Maintainer 直接指示（2026-07-05 チャット）

## 対象領域の構造

- memory/（org / team / project / development / phases/）: method rules。phases/*.md は graph compile で各 phase の rules_in_context へ焼き込まれ、.agents/rules/amadeus.md（上流適応）からも @include される
- knowledge/（6 ファイル）: ドメイン知識（glossary ほか）
- codekb/amadeus/（9 ファイル）: 解析時刻付きのコードベース知識スナップショット
