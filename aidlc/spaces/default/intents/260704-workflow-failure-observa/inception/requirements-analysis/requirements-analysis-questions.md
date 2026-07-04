# Requirements Analysis Questions

このファイルは Requirements Analysis の質問と回答を記録する。
回答は各 `[Answer]:` に記入する。
複数選択の問いは、例として `A, C` のように記入する。

## Q1. Requirement の粒度

Issue #431、#432、#433、#435 と OpenTelemetry core 計装を、どの粒度の Requirement に分けるべきですか。

A. Issue 単位で 4 件にまとめ、OpenTelemetry は横断 Requirement にする。
B. audit、doctor、subagent、warning、telemetry、verification の信号単位に分ける。
C. walking skeleton と後続 Bolt の実装順に合わせて分ける。
D. `.agents/aidlc/tools` の対象 CLI 単位に分ける。
E. 推奨: 信号単位を主軸にし、各 Requirement に Issue と Bolt 候補を紐づける。
X. Other (please specify)

[Answer]: E

## Q2. `ERROR_LOGGED` の必須対象

`ERROR_LOGGED` の対象として、MVP で必ず扱う失敗経路はどれですか。

A. `aidlc-orchestrate.ts` の error directive だけを扱う。
B. top-level catch の未捕捉例外だけを扱う。
C. error directive と top-level catch の両方を扱う。
D. `aidlc-state.ts` など、主要 CLI 全体の未捕捉例外まで広げる。
E. 推奨: まず error directive と `aidlc-orchestrate.ts` top-level catch を必須にし、共通計装で他 CLI へ広げられる形にする。
X. Other (please specify)

[Answer]: E

## Q3. `doctor` が表面化する hook drop 情報

`doctor` は `.aidlc-hooks-health/*.drops` から、どの情報を必須表示にするべきですか。

A. hook 名と drop 件数だけを表示する。
B. hook 名、件数、最新時刻、最新理由を表示する。
C. B に加えて、対象ファイル path と復旧案を表示する。
D. B に加えて、全 drop の詳細を verbose option で表示する。
E. 推奨: 標準出力では hook 名、件数、最新時刻、最新理由を表示し、詳細は verbose へ逃がす。
X. Other (please specify)

[Answer]: E

## Q4. OpenTelemetry core 計装の境界

OpenTelemetry core 計装の Requirement は、どの契約を必須にしますか。

A. command span だけを必須にする。
B. command span と error span を必須にする。
C. command span、error span、directive/report span、doctor metrics を必須にする。
D. C に collector exporter の設定例まで含める。
E. 推奨: C を必須にし、未設定時 no-op と stdout JSON 非干渉を受け入れ条件にする。
X. Other (please specify)

[Answer]: E

## Q5. subagent 完了イベントの成功失敗区別

`SUBAGENT_COMPLETED` の成功失敗区別は、どの方針で Requirement 化しますか。

A. hook input に status がない場合でも、終了文言から推測して記録する。
B. hook input に信頼できる status がある場合だけ `Status` を追加する。
C. status がない場合は `UNKNOWN` として明示し、推測しない。
D. 成功失敗区別は MVP から外し、調査結果だけ残す。
E. 推奨: B と C を合わせ、信頼できる status は記録し、区別不能な場合は `UNKNOWN` または判断記録として残す。
X. Other (please specify)

[Answer]: E

## Q6. conductor-independent failure detection の範囲

conductor の自己申告に依存しない warning として、MVP で扱う検出対象はどれですか。

A. run-stage と report の不整合だけを扱う。
B. in-flight stage の放置だけを扱う。
C. runtime graph と audit の矛盾だけを扱う。
D. A、B、C をすべて扱う。
E. 推奨: A、B、C を扱うが、blocking error ではなく `doctor` の warning として表面化する。
X. Other (please specify)

[Answer]: E

## Q7. parity lock 対象への変更方針

`.agents/aidlc/tools` や stage graph など parity lock 対象の可能性がある変更は、Requirement 上どう扱いますか。

A. 必要なら lock 対象でも変更し、後で parity 例外を追加する。
B. lock 対象外の adapter または wrapper を最優先する。
C. upstream contribution 前提で lock 対象を変更する。
D. 人間承認付き `engineFileExceptions` をこの Intent で追加する。
E. 推奨: adapter または wrapper を先に検討し、不可避な lock 対象変更は upstream contribution または人間承認付き例外として明記する。
X. Other (please specify)

[Answer]: E

## Q8. 受け入れ証拠とテスト戦略

MVP 完了の受け入れ証拠は、どの水準を必須にしますか。

A. unit test と typecheck だけを必須にする。
B. 対象 CLI の deterministic test と `npm run typecheck` を必須にする。
C. B に加えて Intent validator を必須にする。
D. C に加えて `npm run test:all` と parity 結果を必須にする。
E. 推奨: D に加えて、stdout JSON 非干渉と OpenTelemetry no-op default 非送信を明示的な受け入れ条件にする。
X. Other (please specify)

[Answer]: E
