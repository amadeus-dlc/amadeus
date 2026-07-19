# Tech Stack Decisions — election-cli(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 選定と根拠

| 領域 | 選定 | 根拠 |
|---|---|---|
| 言語/ランタイム | TypeScript/ESM+Bun 直接実行(scripts/amadeus-election*.ts) | requirements.md NFR-1+ADR-1(U-01=B 裁定)+codekb technology-stack.md の既存スタック実測 |
| CLI 構造 | サブコマンド(verb)対称・破壊的操作の暗黙デフォルトなし | scope-definition:c1 既決(サブコマンドなしは usage+exit 非0)。business-logic-model.md の verb 表と一致 |
| 指令形式 | 型付き JSON(stdout 限定)+ stderr advisory | stdout-directive-stderr-advisory の写像(reliability-requirements.md 参照)。amadeus-orchestrate 既習様式の構造的類推(ADR-3 — 直接の先例文書はなく invoke-swarm directive が実在参照) |
| 機械実行器(e2e) | テストコード内の TS ループ(LLM 不在)を **e2e 層**へ(unit-of-work.md U5 行「+e2e テスト」と整合) | ADR-6 (i) CI 層 — 決定的・常設。指令スキーマの consumer 契約テストを兼ねる。実 FS+CLI 完走を検証する e2e 層配置(fs-tests-integration-first は「実FSは unit に置かない」下限の規定であり e2e 配置と矛盾しない) |
| lint/型検査 | Biome+tsc(既存配線 — scripts/ は既存 lint スコープ) | ADR-1 Consequences。新規配線なし |

## 却下した代替

- CLI フレームワーク(commander/yargs 等)— 外部依存追加(依存最小方針)+既存 amadeus-*.ts ツール群の手書き argv parse 様式と不整合(既習様式優先)。verb 数は有限(7指令+verb 群)で手書きで足りる
- --help フラグの実装 — no-help-probe-on-mutating-verbs の実測が示す既知 verb 余剰引数問題の温床。引数なし usage 表示+README で代替(security-requirements.md の設計回避と一体)
