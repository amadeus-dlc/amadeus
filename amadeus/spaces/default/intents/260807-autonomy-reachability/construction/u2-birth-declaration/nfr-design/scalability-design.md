# Scalability Design — u2-birth-declaration

上流入力(consumes 全数): business-logic-model.md(発生点)。nfr-requirements 系5成果物は SKIP により未生成(設計どおりの不在)。

## 規模特性

- 発生は intent birth あたり最大1回 — 規模面の考慮対象外(birth 自体が低頻度操作)
- 搬送は directive 文字列への引数1つ — サイズ・保存量への影響なし
- 常駐サービス機構は適用外(cid:nfr-design:c1)

## 将来条件

ハーネス追加時も birth 経路は engine 1箇所(harness 非依存)— 面の増加なし。
