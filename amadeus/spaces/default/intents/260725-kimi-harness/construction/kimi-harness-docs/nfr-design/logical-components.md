上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Logical Components — kimi-harness-docs

> 上流入力の使用箇所: tech-stack-decisions.md §選択(形式・構成・配置・検証)と business-logic-model.md §執筆フローを構造の根拠とする。

## 対象の概要

本 Unit の論理構成は「実測の収集 → 執筆(en) → 対訳(ja) → 表の追加 → 検証」の流れ。

## 構成

| 論理部品 | 役割 | 対応する実体 |
|---|---|---|
| 実測の収集 | B1-B6 の着地内容(前提・配線・制約・doctor・journey) | record と実機の突合 |
| guide(en) | ユーザー向け恒久文書 | `docs/guide/harnesses/kimi-code.md` |
| guide(ja) | 対訳 | `docs/guide/harnesses/kimi-code.ja.md` |
| 表 | ハーネス一覧への追加 | `docs/guide/harnesses/README.md` |
| snippet 参照 | 配線内容の単一ソース | dist/kimi の snippet 正本(参照のみ) |

## 関係

- guide(en) が正で guide(ja) が対訳。両者の内容乖離はレビューで検出する(business-logic-model.md §検証シーケンス の言語規則どおり)
- 実装(B1-B6)が正で、docs はその転記(tech-stack-decisions.md §選択の検証基準どおり)
