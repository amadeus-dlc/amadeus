# Code Generation Plan — agmsg-trial-docs

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md) の「code-generation 向け実行方針」節

本 Intent の code-generation はコードを生成しない docs 系 refactor である。この文書は、成果物 `multi-agent-trial-record.md` を執筆するためのチェックリストであり、コード生成計画ではない。

## 執筆順序と節ごとの出典・満たすべきルール

| 順序 | 節 | 出典 | 満たすべきルール |
|---|---|---|---|
| 1 | 適用条件 | requirements.md（FR-3.1、FR-3.2）、business-logic-model.md「成果物文書の構成」 | BR-3、BR-10 |
| 2 | 定型文（ディスパッチ / 中継承認） | domain-entities.md（エンティティ定義）、received-messages.md（実例原文） | BR-2、BR-6、BR-9 |
| 3 | agmsg 実機確認結果 | business-logic-model.md「実機確認結果の記録手順」、requirements.md（FR-2.1〜FR-2.3） | BR-7、BR-8 |

節は 1 → 2 → 3 の順に執筆する。理由は business-logic-model.md が単一文書・冒頭の適用条件配置を前提としているためであり、節を入れ替えると FR-3.1（冒頭配置）を満たさなくなる。

## 節ごとの執筆ルール

### 節 1（適用条件）

- 「本体制はデフォルトの働き方ではない」ことを明文化する（FR-3.1）。
- 引き継ぎ 2 件（team.md 統合、#497 コメント転記）を併記する（BR-10）。

### 節 2（定型文）

- 実例は必ず [received-messages.md](../../../inception/requirements-analysis/received-messages.md) の保全原文から逐語転記する（BR-2）。Monitor 通知の切り詰め文面や記憶からの再構成は使わない。
- 中継承認定型文の必須項目に HUMAN_TURN mint 指示を含める（BR-9）。

### 節 3（agmsg 実機確認結果）

- 事実と制約を分けて表にし、各項目に観測時刻または証跡を付ける。証跡がない値は `未確認` と書く（BR-7）。
- required-sections sensor が検査する H2 見出し 2 個以上を満たす（BR-8）。

## 実行しないこと

- amadeus-developer-agent への workspace 向けコード生成の委譲（実装コード・テストコードの生成）は行わない（C-1、BR-4）。
- `docs/amadeus/` への新設、`team.md` の直接更新は行わない（BR-1）。
- `codekb/amadeus/` の変更は行わない（BR-5）。
