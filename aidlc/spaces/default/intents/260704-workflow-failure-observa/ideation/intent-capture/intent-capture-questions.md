# Intent Capture Questions

## 回答方針

このファイルは、Intent Capture の判断記録である。
各質問の `[Answer]:` に、選択肢の記号または自由記述を記入する。
複数選択が必要な場合は、`A, C, E` のように記入する。

## Q1. 解く問題

この Intent で最も重視して解く問題は何ですか。

[Answer]: E

A. AI-DLC の失敗が audit に残らず、後から原因追跡できない問題。
B. hook drop が発生しても doctor が表面化せず、運用者が見落とす問題。
C. subagent 完了イベントが成功と失敗を区別できず、実行結果を追跡できない問題。
D. conductor の自己申告に依存しており、失敗補足の信頼性が弱い問題。
E. 上記をまとめて、AI-DLC の失敗可観測性として一体で改善する。
X. Other (please specify)

## Q2. 主な利用者

この改善で最も直接的に価値を受ける利用者は誰ですか。

[Answer]: E

A. Amadeus の maintainer。
B. AI-DLC workflow を実行する agent runner。
C. PR reviewer と CI 監視担当者。
D. GitHub Issue から変更を追跡する contributor。
E. 上記すべて。
X. Other (please specify)

## Q3. 成功指標

この Intent の成功を判定する主要な指標は何ですか。

[Answer]: E

A. engine の error directive と未捕捉例外が `ERROR_LOGGED` として audit に残る。
B. `doctor` が `.aidlc-hooks-health/*.drops` を読み、hook 名、件数、最新理由を表示する。
C. `SUBAGENT_COMPLETED` から成功と失敗を区別できる。
D. conductor の自己申告に依存しない失敗検出方針が成果物と実装方針に残る。
E. 上記すべてを deterministic test または validator evidence で確認できる。
X. Other (please specify)

## Q4. 着手理由

今この改善を行う理由として最も近いものは何ですか。

[Answer]: E

A. Issue #431、#432、#433、#435 が同じ失敗可観測性の根本原因を共有しているため。
B. AI-DLC が重く、失敗時の原因追跡コストが大きいため。
C. PR 監視と review 対応で、失敗イベントの欠落が後続判断を難しくするため。
D. parity lock 対象の変更経路を先に整理しないと実装判断が揺れるため。
E. 上記すべて。
X. Other (please specify)

## Q5. 初期スコープ境界

この Intent の初期スコープとして妥当な境界はどれですか。

[Answer]: E

A. Issue #431 の engine error audit だけを扱う。
B. Issue #432 の doctor hook drop 表示だけを扱う。
C. Issue #433 の subagent 完了イベントだけを扱う。
D. Issue #435 の設計判断だけを扱う。
E. Issue #431、#432、#433、#435 を 1 つの大きめの MVP として扱い、Operation phase は対象外にする。
X. Other (please specify)

## Q6. parity lock への対応

parity lock 対象へ変更が必要な場合、どの進め方を優先しますか。

[Answer]: E

A. upstream contribution を最優先にする。
B. 人間承認付きの `engineFileExceptions` を使う。
C. lock 対象外の adapter や wrapper で回避できるかを先に検討する。
D. lock リスクが高い Issue を別 Intent に分割する。
E. Feasibility で対象ファイルごとに、上記の優先順を明示して判断する。
X. Other (please specify)

## Q7. 失敗検出の情報源

conductor の自己申告に依存しないため、どの情報源を重視しますか。

[Answer]: E

A. process exit code、例外、error directive。
B. audit write の成功または失敗。
C. `.aidlc-hooks-health/*.drops` の drop ledger。
D. subagent hook の入力 payload。
E. 複数の信号を優先順位付きで組み合わせる。
X. Other (please specify)

## Q8. 検証方針

どの検証方針を重視しますか。

[Answer]: E

A. 対象 CLI と hook の unit test を追加する。
B. deterministic e2e または eval fixture を追加する。
C. Amadeus validator を通して Intent 成果物の整合性を確認する。
D. `npm run test:all` を PR 前の標準検証にする。
E. 上記すべて。
X. Other (please specify)

## Q9. 失敗時の振る舞い

audit や doctor 自体が失敗した場合の期待挙動はどれですか。

[Answer]: E

A. 失敗を hard error として止める。
B. warning として表示し、処理は継続する。
C. audit 書き込み失敗は stdout を汚さず、stderr または構造化された失敗として扱う。
D. stage gate で人間に判断を戻す。
E. 経路ごとに severity と継続可否を明示する。
X. Other (please specify)

## Q10. 成果物と PR のまとめ方

この Intent の成果物と PR はどの粒度がよいですか。

[Answer]: E

A. 4 Issue を 1 PR にまとめる。
B. Ideation と Inception の仕様成果物だけ先にまとめ、Construction は別 PR にする。
C. Construction は walking skeleton と後続 Bolt に分ける。
D. upstream contribution が必要な部分を先に分離する。
E. branch policy に従い、phase と Bolt の境界で最終判断する。
X. Other (please specify)
