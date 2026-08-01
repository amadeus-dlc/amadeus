# Security Design — U3: journal-v2

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

security-requirements.md の要件（wire 表現の健全性・未知 version 拒否・非沈黙化・非合成・credential 非保持）に対する設計。codec は redaction 判定を持たず、機微情報を「漏らさない・壊さない」節度に限定する。

## wire 表現の健全性

- serialize は値に生の CR/LF を含まない 1 物理行を保証する。`JSON.stringify` のエスケープに依存し、独自の文字列連結で行を組み立てない。改行混入による行偽装・record 分裂（ログインジェクション相当）を構造的に排除する（BR-2）
- 任意値（CR/LF・制御文字・NUL 含有）を与える property test で 1 行性を固定する

## 入力の寛容さの制限

- `parseJournalLine` は schema version ≤ 現行のみ受理し、将来 version は位置情報つきで拒否する。黙って解釈・降格しない（BR-10、FR-JRN-2）
- 破損行・部分行は黙って捨てず、行番号つきで呼出し側へ報告する。監査欠損の不可視化を防ぐ（BR-10）。報告は例外または判別可能な結果型で、呼出し側が無視できない形にする

## 真正性の保持

- converter は v1 に存在しない trace/span IDs を null とし、推測・合成で値を埋めない（BR-8）。監査の真正性を偽造する経路を作らない
- codec 層は外部 env・設定を参照せず、prompt・argv・credential 等の値を保持・展開・ログ出力しない。redaction 済み値を透過的に運ぶのみとし、import 検査で外部参照の不在を固定する
- redaction policy の判定（FR-DST-4/5）は write-time（U2）と export 境界（U4）の責務であり、codec への二重実装によるポリシー分裂を避ける（security-requirements.md § スコープ外の根拠）
