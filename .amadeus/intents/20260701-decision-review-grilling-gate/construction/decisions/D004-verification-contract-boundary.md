# D004 Verification Contract Boundary

## 状態

accepted。

## 背景

validator、evaluator、Skill Contract の結果を decision review の内容承認として扱うと、構造検出、品質評価、契約入力、採用判断が混ざる。

## 判断

validator は構造検出を扱う。
evaluator は品質評価を扱う。
Skill Contract は入力証拠と境界情報として扱う。
これらは decision review の結果そのものではなく、判断ノードを再評価するための証拠または確認候補である。

## 根拠

- R005。
- UC001。
- UC003。

## 影響

B003 は Skill Contract、validator、evaluator、eval の責務境界を確認する。
evaluator の本格実装は、必要なら後続 Issue 候補として扱う。
