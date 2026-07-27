# Scalability Requirements — solo-election-core (U1)

上流入力(consumes 全数): business-logic-model.md(tally 2体分岐・個数照合)、business-rules.md(BR-U1-1〜8 の検証列)、requirements.md(NFR-01〜03 の正本)、technology-stack.md(Bun/TS/ESM・テスト4層の実行環境)。

## スケーラビリティ要件

| ID | 要件 | 合否基準 | 出典 |
|---|---|---|---|
| U1-SCALE-01 | 2体規則は宣言 voters.length===2 に閉じ、3体以上の既存挙動・将来の任意票数へ影響しない(W-05: 3体以上のソロ定足数は Won't) | BR-U1-5 の 3〜6体代表組合せ regression green | business-rules.md BR-U1-5/7、requirements.md FR-06 |
| U1-SCALE-02 | 選挙ストアの構造(1選挙1ディレクトリ・registry)は不変 — U1 はストア規模特性を変えない | 実装 diff に store 層変更ゼロ | business-logic-model.md(不変境界) |

## 明示的に設けない検査

水平スケール・キャッシュ・circuit breaker は CLI/ファイル境界のフレームワークに非適用(cid:nfr-design:c1 の既決)。
