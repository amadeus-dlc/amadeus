# Rough Mockups Questions

## Context

この質問は、`intent-statement`、`scope-document`、`intent-backlog` を上流成果物として扱う。
この Intent は画面 UI ではなく、CLI、audit、doctor、OpenTelemetry 計装、PR 説明へつながる失敗証拠の情報設計を扱う。
`skills/` は配布物境界であり、直接編集を主経路にしない。

## Questions

### Q1. primary entry point はどれですか。

A. audit shard だけを入口にする。
B. OpenTelemetry trace viewer だけを入口にする。
C. GitHub Issue だけを入口にする。
D. PR 説明だけを入口にする。
E. `doctor` を第一入口にし、必要に応じて audit、OpenTelemetry 計装 evidence、Intent artifact、PR 説明へ辿れる導線にする。
X. Other (please specify)

[Answer]: E

### Q2. `doctor` 出力の情報階層はどうしますか。

A. 全詳細を 1 つの長いログとして表示する。
B. hook drop だけを表示し、engine error や conductor warning は扱わない。
C. OpenTelemetry metric だけを表示する。
D. Issue 番号だけを表示する。
E. summary、critical warning、hook drops、engine errors、subagent status、conductor-independent warnings、OpenTelemetry metrics hint の順に表示する。
X. Other (please specify)

[Answer]: E

### Q3. OpenTelemetry core 計装 evidence はどこに見せますか。

A. PR 説明だけに書く。
B. test output だけに隠す。
C. dashboard 前提でしか見せない。
D. audit event と同じ行に全 span を埋め込む。
E. `doctor` では no-op default と exporter 有効状態、代表 metric 名、trace boundary の存在だけを短く表示し、詳細は test と instrumentation fixture に委ねる。
X. Other (please specify)

[Answer]: E

### Q4. 失敗時の happy path はどれですか。

A. 失敗が発生しても、ユーザーは会話ログだけを見る。
B. 失敗が発生したら、直ちに hard error で止める。
C. 失敗は OpenTelemetry trace だけで確認する。
D. 失敗は PR review まで確認しない。
E. 失敗発生後、audit に証拠が残り、doctor で表面化し、OpenTelemetry 計装境界で分析でき、Intent artifact と PR 説明へ接続される。
X. Other (please specify)

[Answer]: E

### Q5. 出力の文体とラベルはどうしますか。

A. 低レベルの stack trace をそのまま主表示にする。
B. 日本語だけで event 名も翻訳する。
C. 英語だけで表示する。
D. 色だけで severity を表現する。
E. 地の文は日本語、event 名、file 名、command 名、metric 名は英語のまま使い、severity は text label と記号で示す。
X. Other (please specify)

[Answer]: E

### Q6. conductor-independent warning の表示強度はどうしますか。

A. error と同じ強さで workflow を止める。
B. 表示しない。
C. OpenTelemetry trace にだけ残す。
D. audit だけに残し、doctor には出さない。
E. `WARNING` として doctor に出し、根拠、次の確認先、hard error ではないことを明示する。
X. Other (please specify)

[Answer]: E

### Q7. rough mockup で扱う form factor はどれですか。

A. Web desktop dashboard。
B. Mobile dashboard。
C. Slack notification。
D. GitHub Issue template。
E. terminal width 80-120 columns の CLI 表示と markdown artifact 表示を主対象にする。
X. Other (please specify)

[Answer]: E

### Q8. accessibility と scannability はどう扱いますか。

A. CLI なので accessibility は扱わない。
B. 色だけで severity を区別する。
C. 表だけで階層を表現し、見出しを使わない。
D. 画面 reader は後続で考える。
E. 見出し、固定順序、text severity、短い要約、詳細への path、ASCII diagram の text fallback を必須にする。
X. Other (please specify)

[Answer]: E

### Q9. 今回の rough mockups で明示的に scope out するものはどれですか。

A. scope out は置かない。
B. CLI mockup だけを scope out する。
C. markdown artifact 表示だけを scope out する。
D. audit と doctor を scope out する。
E. Web dashboard、collector UI、常時ネットワーク送信画面、`skills/` 直接編集、`.coderabbit.yml` 変更を scope out する。
X. Other (please specify)

[Answer]: E
