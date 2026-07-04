# Scope Definition Questions

## Context

この質問は、`intent-statement`、`feasibility-assessment`、`constraint-register` を上流成果物として扱う。
対象 Issue は #431、#432、#433、#435 である。
OpenTelemetry は Feasibility で optional extension として扱ったが、Scope Definition の追加判断で core observability layer に見直す。
ただし、外部 collector、dashboard、常時ネットワーク送信は core scope に含めない。
`skills/` は配布物境界であり、直接編集を主経路にしない。

## Questions

### Q1. MVP に含める Issue の範囲はどれですか。

A. #431 だけを MVP に含める。
B. #431 と #432 だけを MVP に含める。
C. #431、#432、#433 を MVP に含め、#435 は後続に回す。
D. #431、#432、#435 を MVP に含め、#433 は後続に回す。
E. #431、#432、#433、#435 と OpenTelemetry core 計装を 1 つの MVP に含める。外部 collector と dashboard は後続拡張として残す。
X. Other (please specify)

[Answer]: E

### Q2. MVP 完了の受け入れ証拠はどこまで必要ですか。

A. 設計文書だけでよい。
B. audit の記録だけでよい。
C. 対象 TypeScript の unit test だけでよい。
D. doctor 出力だけでよい。
E. audit、doctor、OpenTelemetry no-op default 計装、deterministic test、Amadeus validator、`npm run test:all` の結果を追跡可能にする。
X. Other (please specify)

[Answer]: E

### Q3. 最初に組み立てる walking skeleton はどれがよいですか。

A. conductor-independent failure detection だけを先に作る。
B. subagent status 判別だけを先に作る。
C. hook drop doctor 表示だけを先に作る。
D. OpenTelemetry の no-op tracer を先に入れる。
E. #431 の engine error audit、#432 の hook drop doctor 表示、OpenTelemetry no-op default 計装を最初に束ね、失敗が記録され、表示され、trace 可能になる最小の縦断経路にする。
X. Other (please specify)

[Answer]: E

### Q4. parity lock と配布物境界はどう扱いますか。

A. 実装しやすい場所なら `skills/` も直接編集する。
B. parity lock 対象は最初から `engineFileExceptions` に追加する。
C. parity lock を避けるため、実装ではなく docs 更新に限定する。
D. parity lock は Construction まで判断しない。
E. lock 対象外の adapter または wrapper を優先し、必要な場合だけ upstream contribution または人間承認付き `engineFileExceptions` を検討する。`skills/` は配布物境界として直接編集しない。
X. Other (please specify)

[Answer]: E

### Q5. subagent の成功失敗判別はどう扱いますか。

A. `Message` の文言から成功失敗を推測する。
B. `SUBAGENT_COMPLETED` は常に成功として扱う。
C. 既存 event を廃止して新 event だけに置き換える。
D. #433 は MVP から外す。
E. hook input に信頼できる status があるかを先に調査し、ある場合だけ `Status` を追加する。ない場合は区別不能を成果物に記録する。
X. Other (please specify)

[Answer]: E

### Q6. conductor の自己申告に依存しない失敗検出はどう扱いますか。

A. 検出したら直ちに workflow を hard error で止める。
B. 検出しても audit には残さない。
C. 次回 Intent まで完全に扱わない。
D. OpenTelemetry の trace だけで扱う。
E. 初期実装では audit と doctor で warning として表面化し、hard error 化は後続判断に残す。
X. Other (please specify)

[Answer]: E

### Q7. backlog の優先順位付けはどの方法で行いますか。

A. MoSCoW だけで分類する。
B. RICE だけで数値化する。
C. GitHub Issue 番号順で並べる。
D. 実装しやすい順だけで並べる。
E. MoSCoW で scope 境界を決め、WSJF で build order を補正する。
X. Other (please specify)

[Answer]: E

### Q8. intent-backlog の proto-Unit 分割はどれがよいですか。

A. 4 Issue を 1 つの大きな proto-Unit にする。
B. Issue ごとに 4 つの proto-Unit にする。
C. audit 系と doctor 系の 2 つの proto-Unit にする。
D. OpenTelemetry を 5 つ目の proto-Unit として含める。
E. Issue ごとの traceability を保つ 4 proto-Unit に、OpenTelemetry core 計装の横断 proto-Unit を加える。walking skeleton では #431、#432、OpenTelemetry no-op default を束ねる。
X. Other (please specify)

[Answer]: E

### Q9. 期限または hard constraint はありますか。

A. テストは後回しにしてよい。
B. 速さを優先し、stdout JSON 契約の破壊を許容する。
C. parity 例外は人間承認なしで増やしてよい。
D. OpenTelemetry collector と dashboard まで今回の必須期限に含める。
E. 外部期限は置かず、PR 準備条件を validator pass、`npm run test:all`、stdout JSON 契約維持、配布物境界維持、OpenTelemetry core 計装の no-op default 維持にする。
X. Other (please specify)

[Answer]: E

### Q10. 今回明示的に scope out するものはどれですか。

A. scope out は置かない。
B. OpenTelemetry collector と exporter だけ scope out する。
C. `skills/` 直接編集だけ scope out する。
D. cloud infrastructure だけ scope out する。
E. OpenTelemetry の外部 collector、dashboard、常時ネットワーク送信、`skills/` 直接編集、既存 audit event の削除または改名、`.coderabbit.yml` 変更、cloud infrastructure を scope out する。OpenTelemetry core 計装と no-op default は scope in する。
X. Other (please specify)

[Answer]: E

### Q12. OpenTelemetry を core scope としてどう定義しますか。

A. OpenTelemetry は完全に scope out し、audit と doctor だけに戻す。
B. OpenTelemetry API だけを導入し、span と metrics は後続に回す。
C. collector、dashboard、外部送信を含むフル導入を MVP に含める。
D. trace だけを導入し、metrics は後続に回す。
E. OpenTelemetry を core observability layer とし、`.agents/aidlc/tools` の command span、error span、directive/report span、doctor metrics を no-op default で実装する。外部 exporter は環境変数で有効化し、未設定時はネットワーク送信しない。
X. Other (please specify)

[Answer]: E

### Q11. value stream と traceability はどう残しますか。

A. 実装コードだけで判断する。
B. 設計文書だけで判断する。
C. Issue close だけを成功証拠にする。
D. 手動スクリーンショットだけを成功証拠にする。
E. Issue、Requirement、proto-Unit、test、audit、doctor evidence、OpenTelemetry 計装 evidence、PR 説明をつなぐ形で残す。
X. Other (please specify)

[Answer]: E
