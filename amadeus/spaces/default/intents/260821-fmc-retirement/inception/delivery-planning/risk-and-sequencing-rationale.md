# Risk & Sequencing Rationale — 260821-fmc-retirement

## リスク表

| リスク | 影響 | 緩和 |
|---|---|---|
| 巨大 diff(±170 ファイル級)のレビュー困難 | 見落とし | 受け入れを機械述語群(0-hit grep・ls-tree・件数照合)に固定。削除は census 表と 1:1 |
| coverage 相対条件の変動(母集団 −44k 行) | Project Coverage Gate 赤 | O-5 代替 2 本 + t381 温存で唯一被覆源の喪失ゼロ。regen は build 後(順序固定) |
| t341(blocking 唯一のテスト)の fixture 差し替え失敗 | conformance ゲート空洞化 or 恒久赤 | 差し替えは assertion 削除 0 制約 + 事前ローカル green 必須 |
| ci.yml 集約整合の破れ | ci-success 永久 pending | job/needs/require_result を同一コミットで除去(禁止逆順に明記) |
| 台帳 5 件(166−161)の分類漏れ | 残渣 | code-generation 着手時に実名列挙で確定(§12a FOLLOW-UP の閉包点) |

## シーケンス根拠

単一 Bolt・直列 8 段(component-dependency.md)。分割しない理由は ADR-6。各段の禁止逆順 4 種を builder 指示書へ転記する。
