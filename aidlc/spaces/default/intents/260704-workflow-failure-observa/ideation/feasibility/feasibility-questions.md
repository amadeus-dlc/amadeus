# Feasibility Questions

## 回答方針

このファイルは、Feasibility & Constraint Analysis の判断記録である。
各質問の `[Answer]:` に、選択肢の記号または自由記述を記入する。
複数選択が必要な場合は、`A, C, E` のように記入する。

## Q1. 既存システム連携

この Intent が連携または変更する既存システム境界として、最も重要なものはどれですか。

[Answer]: E

A. `aidlc-orchestrate.ts` の error directive と top-level catch。
B. `aidlc-utility.ts --doctor` と `.aidlc-hooks-health/*.drops`。
C. `aidlc-log-subagent.ts` と `aidlc-audit.ts` の audit taxonomy。
D. `stage-protocol.md`、Stop hook、runtime graph の conductor 逸脱検出。
E. 上記すべてを 1 つの失敗可観測性境界として扱う。
X. Other (please specify)

## Q2. parity lock 方針

parity lock 対象に触れる可能性がある場合、どの方針を採用しますか。

[Answer]: E

A. parity lock 対象外の adapter または wrapper で回避できる場合だけ実装する。
B. upstream contribution として扱う。
C. 人間承認付きで `engineFileExceptions` へ追加する。
D. リスクが高い対象は後続 Intent へ分割する。
E. 対象ファイルごとに A、B、C、D の順で判断し、判断理由を constraint-register に残す。
X. Other (please specify)

## Q3. audit taxonomy 変更

subagent 成功失敗の区別には、どの audit taxonomy 方針を優先しますか。

[Answer]: E

A. `SUBAGENT_COMPLETED` に `Status` フィールドを追加する。
B. 新しい `SUBAGENT_FAILED` イベントを追加する。
C. hook 入力から判別できない場合は taxonomy を変えず、区別不能として記録する。
D. `ERROR_LOGGED` に寄せて subagent 失敗を表現する。
E. まず hook 入力の信頼性を確認し、判別可能なら A、不可なら C とする。
X. Other (please specify)

## Q4. hook drop の表面化

`.aidlc-hooks-health/*.drops` を doctor で扱う際、どの表示が必要ですか。

[Answer]: E

A. hook 名と drop 件数だけを表示する。
B. hook 名、drop 件数、最新時刻だけを表示する。
C. hook 名、drop 件数、最新理由だけを表示する。
D. 最新 N 件の詳細まで表示する。
E. hook 名、件数、最新時刻、最新理由を表示し、古い drop の扱いは後続で分ける。
X. Other (please specify)

## Q5. conductor 逸脱検出

conductor の自己申告に依存しない検出シグナルとして、どれを初期候補にしますか。

[Answer]: E

A. `run-stage` directive 発行後、対応する report が来ないまま次の `next` が呼ばれる。
B. Stop または SessionEnd 時点で in-flight stage が残っている。
C. produces が存在しないのに完了報告される。
D. runtime graph と audit から stage outcome が矛盾する。
E. A、B、D を初期候補とし、C は既存 engine guard の確認対象にする。
X. Other (please specify)

## Q6. 失敗時の挙動

失敗検出時の初期挙動として、どれを優先しますか。

[Answer]: E

A. hard error として workflow を停止する。
B. audit に warning 相当のイベントを残し、doctor で表面化する。
C. 次回 `next` で必ず人間確認を求める。
D. stage gate で request changes に誘導する。
E. 失敗種別ごとに severity と継続可否を分け、初期実装では audit と doctor の表面化を優先する。
X. Other (please specify)

## Q7. AWS または外部インフラ制約

この Intent に AWS または外部インフラの実装制約はありますか。

[Answer]: E

A. ある。CloudWatch、CloudTrail、AWS account、IAM などの連携を考慮する。
B. ある。CI 環境や GitHub Actions の artifacts を連携対象にする。
C. ない。ローカル CLI、hook、audit、doctor、test fixture の範囲で閉じる。
D. 未確定。Operation phase で改めて判断する。
E. 現時点では C とし、CI 連携は標準検証証拠として扱う。
X. Other (please specify)

## Q8. compliance 制約

この Intent に規制対応やデータ分類上の制約はありますか。

[Answer]: E

A. PCI、HIPAA、GDPR などの外部規制が直接適用される。
B. SOC 2 型の監査証跡品質を意識する必要がある。
C. 個人情報や顧客データを扱わないが、audit integrity と再現性は必要である。
D. 規制ではなく project policy と branch policy が主な制約である。
E. C と D を採用し、外部規制は非対象として記録する。
X. Other (please specify)

## Q9. 検証方針

Feasibility で成立させるべき検証方針はどれですか。

[Answer]: E

A. 対象 CLI と hook の unit test を追加する。
B. deterministic e2e または eval fixture を追加する。
C. parity check と promote-skill 経路への影響を確認する。
D. Amadeus validator と `npm run test:all` を PR 前検証にする。
E. A、B、C、D をすべて検証候補として RAID と constraint-register に残す。
X. Other (please specify)

## Q10. 実装分割

技術的に最も妥当な実装分割はどれですか。

[Answer]: E

A. #431、#432、#433、#435 を 1 つの Bolt で実装する。
B. engine error、doctor drops、subagent status、conductor detection をそれぞれ別 Bolt にする。
C. まず #431 と #432 を walking skeleton とし、#433 と #435 は後続 Bolt にする。
D. parity lock 対象の有無で Bolt を分ける。
E. Feasibility では B または C を候補にし、Scope Definition と Units Generation で最終分割する。
X. Other (please specify)

## Q11. OpenTelemetry の扱い

`.agents/aidlc/tools` の TypeScript CLI に OpenTelemetry を載せ、trace や metrics を取得する案を、この Intent でどう扱いますか。

[Answer]: E

A. 現 Intent の must-have として実装対象に含める。
B. 現 Intent では設計検討だけを行い、実装は後続 Intent に分ける。
C. 現 Intent では RAID の opportunity として記録し、scope には入れない。
D. 現時点では扱わない。
E. audit と doctor の deterministic な失敗証跡を先に完成させ、OpenTelemetry は optional extension として feasibility 成果物に記録する。
X. Other (please specify)
