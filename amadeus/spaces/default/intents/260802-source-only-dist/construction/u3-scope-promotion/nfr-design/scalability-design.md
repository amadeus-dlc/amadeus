# Scalability Design — u3-scope-promotion

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` は engine nfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。唯一存在する `business-logic-model` の discovery/compile 投影契約をfallback入力とする。

## スケール軸

スケール軸は scope 定義数、stage 数、harness 投影面数である。いずれも静的有限集合であり horizontal scaling は不要。新 scope は `core/scopes` のファイルと stage frontmatter を追加すれば discovery され、中央の手書き列挙を増やさない。

## 容量・拡張契約

| 変化 | 契約 |
|---|---|
| stock scope 追加 | compile が全 stage とのセルを導出し、全投影面へ反映 |
| harness 追加 | package discovery が同じ canonical grid を投影 |
| composed scope 追加 | per-user extras として merge、stock 正本へ逆流させない |
| 不正なタグ増加 | parser/compile が loud reject |

15という件数は現時点の受け入れ値であり、実装ロジックの上限としてハードコードしない。件数テストは正本ディレクトリから期待値を導出する。
