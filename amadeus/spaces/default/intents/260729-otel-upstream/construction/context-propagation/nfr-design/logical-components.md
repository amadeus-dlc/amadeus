# Logical Components — U5: context-propagation

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

NFR 設計（performance/security/scalability/reliability 各 design）の決定がどの論理コンポーネントに適用されるかの対応表。実装は U1 新設の `packages/framework/core/otel/`（context.ts API surface）と inject/extract 呼出し側の core tools／hooks に載る（tech-stack-decisions.md § 配置）。

## コンポーネント目録

| コンポーネント | 責務 | 適用される NFR 設計 | 故障領域（blast radius） |
|---|---|---|---|
| `injectToSubprocess(env)` | 親 process が subprocess env へ `traceparent`／`tracestate` を注入 | performance-design（O(1) 文字列生成）、security-design（carrier 内容制限） | 注入失敗は当該子 process の Trace 切断のみ。workflow を止めない |
| extract（子 process 起動時） | env から Context 抽出・W3C 形式検証 | security-design（外部入力検証）、reliability-design（fail-open 新規 root） | 抽出失敗は新規 root trace への切断＋diagnostic Log。canonical 経路へ波及なし |
| `persistIntentContext` | anchor Context を intent あたり 1 record 永続化 | scalability-design（増殖しない永続化）、reliability-design（write fail-open） | 書込失敗は Trace 永続性の欠落のみ。fatal latch 対象外 |
| `restoreIntentContext` | record 1 回 read で Context 復元・remote parent 接続 | performance-design（1 read 完結）、reliability-design（不在時は新規 anchor） | 復元失敗は当該 process の Trace 切断のみ |
| carrier 型定義 | trace ID／span ID／trace flags／intent ID の 4 フィールド構造 | security-design（型による機微混入排除） | なし（型レベルの制約） |
| 呼出し側配線（engine birth/resume、conductor prepare、hook 起動、sensor 起動） | 各 process 起動経路への inject/extract 組み込み | reliability-design（注入を必須ステップ化） | 配線漏れは該当経路の孤立 trace として 3 段テストで検出 |

## コンポーネント境界と分離方針

- carrier 処理はすべて telemetry 経路に閉じ、canonical Event／Journal 書込み経路（fatal latch 対象）から型上分離する（reliability-design § fail-open）
- inject/extract の実体は U1 の `core/otel/` propagator を利用し、U5 で Context Manager・carrier 形式の独自実装を持たない（tech-stack-decisions.md § 新規依存なし）
- `packages/framework/core/` 変更のため FR-DST-2 を適用: manifest マッピング登録、`bun scripts/package.ts` で全生成面（dist 7 面＋self-install 5 面）を再生成し `package.ts --check`／`promote:self:check` を通過する
- 共有リソースは Intent Context record（intent あたり 1 ファイル）のみ。process 横断の共有メモリ・デーモンを新設しない
