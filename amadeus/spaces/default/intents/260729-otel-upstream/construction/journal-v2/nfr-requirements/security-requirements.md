# Security Requirements — U3: journal-v2

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

本 Unit は codec 層であり、redaction の policy 適用点（write-time・export 境界の二層、FR-DST-3）は呼出し側（U2／U4）の責務。ここでは codec が機微情報を「漏らさない・壊さない」ための節度だけを要件化する。

## 目標

| 項目 | 目標 | 検証方法 |
|---|---|---|
| wire 表現の健全性 | serialize 出力は値に生の CR/LF を含まない1物理行（BR-2）。改行混入による行偽装・record 分裂（ログインジェクション相当）を構造的に排除する | 任意値（CR/LF・制御文字・NUL 含有）を与える property test で1行性を確認 |
| 未知 version の拒否 | `parseJournalLine` は schema version ≤ 現行のみ受理し、将来 version は位置情報つきで拒否（BR-10、FR-JRN-2）。黙って解釈・降格しない | 未来 version 行の拒否テスト |
| decode 失敗の非沈黙化 | 破損行・部分行を黙って捨てない。行番号つきで呼出し側へ報告し、監査欠損の不可視化を防ぐ（BR-10） | 破損 fixture の報告テスト |
| converter の非合成 | converter は v1 に存在しない trace/span IDs を null とし、推測・合成で値を埋めない（BR-8）。監査の真正性を偽造しない | converter property test（欠落フィールド → null） |
| credential 非保持 | codec 層自体は prompt・argv・credential 等の値を保持・展開・ログ出力しない。redaction 済み値を透過的に運ぶのみ（FR-DST-3 の codec 側の含意、VER-2 のゲート対象は呼出し側配線） | 実装レビュー＋codec が外部 env・設定を参照しないことの import 検査 |

## スコープ外の根拠

- redaction policy の判定（safe-key・`redactionOptIn`、FR-DST-4/FR-DST-5）は write-time（U2）と export 境界（U4）で適用される。codec は判定を行わず、二重実装によるポリシー分裂を避けるため本 Unit には持ち込まない
