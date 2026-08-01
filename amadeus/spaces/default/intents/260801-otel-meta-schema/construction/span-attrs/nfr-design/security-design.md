# Security Design — U2 span-attrs

上流入力(consumes 全数): security-requirements ほか performance-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)— セキュリティ要件は requirements.md FR-SPAN 系の語彙統制+ project.md Mandated(export-boundary-redaction)から代替導出。business-logic-model.md(実在)の resolver 6キー閉語彙を消費。tech-stack 前提は codekb technology-stack.md 260801 現在節に依拠。

## 情報統制

- resolver が載せるのは6キーの閉語彙(amadeus.intent / amadeus.space / amadeus.stage / amadeus.phase / amadeus.agent.type / amadeus.agent.id)のみ — 自由文字列を span attribute へ流す経路を新設しない。値は intent slug・space 名・stage slug 等の識別子で、機微情報クラスに該当しない(business-overview のプライバシー境界準拠)
- agent.id は将来の env 供給時のみ載る受け口(現行ハーネスでは常に省略 — FD 実測)。供給された場合も export 境界の既存 redaction(local-span-exporter)を通過する二層原則を維持

## merge 優先度の安全性

- resolver 出力 < 明示 setAttributes(後勝ち)— resolver が呼出し側の明示値を上書きして観測を汚染することはない(FD 承認済み merge 契約の統制面)

## 検証

- 閉語彙外キーが resolver 出力に現れないことを全数 assert。redaction 層の通過は既存 t-otel-redaction 系 green 維持で確認
