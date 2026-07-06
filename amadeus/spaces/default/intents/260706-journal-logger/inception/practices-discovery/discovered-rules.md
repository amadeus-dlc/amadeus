# Discovered Rules — 260706-journal-logger

## 上流入力

codekb 6 docs（基準 19662e50）を入力にした: [code-structure.md](../../../../codekb/amadeus/code-structure.md)、[technology-stack.md](../../../../codekb/amadeus/technology-stack.md)、[dependencies.md](../../../../codekb/amadeus/dependencies.md)、[code-quality-assessment.md](../../../../codekb/amadeus/code-quality-assessment.md)、[architecture.md](../../../../codekb/amadeus/architecture.md)、[business-overview.md](../../../../codekb/amadeus/business-overview.md)。

## 本 Intent に効く規則（発見分）

1. validator（lifecycle-v2.ts）は space レベル成果物の検査前例を持つ（memory / knowledge / codekb / intents）。journal は 5 個目の space 成果物として同じ検査枠組みに追加できる。
2. amadeus-validator は Amadeus 独自で parity 対象外（ディスパッチ確認済み）。ただし skills/ 正準と .agents/skills/ 昇格先の同期は promote 必須。
3. 追記専用 + 単独所有の前例 = audit shard（clone 単位所有）。journal は logger 単独所有 + 日次分割で同じ構造保証を得る。
4. agmsg の spawn.sh は「pre-join → tmux pane / OS terminal 起動 → actas 初期プロンプト → ready 待ち」を提供する（手順書の実測根拠。A-1 の検証対象）。
