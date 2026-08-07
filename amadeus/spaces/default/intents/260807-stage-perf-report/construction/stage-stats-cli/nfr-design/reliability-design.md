# Reliability Design — stage-stats-cli(nfr-design)

上流入力(consumes 全数): business-logic-model(A1 のカウンタ・A9 の exit ladder を信頼性契約として消費)。performance-requirements / security-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在 — 代替正本は requirements.md(FR-1c fail-loud・A-3 決定性前提・NFR-5 落ちる実証)とする

## 信頼性契約

- **fail-loud(部分結果の無音提示禁止)**: 読取不能シャード ≥1 → exit 1(FR-1c)。レポート自体は出力するが exit code で「コーパスに穴がある」ことを機械可読に通知 — 下流(CI・スクリプト)が欠損データを正常と誤読しない
- **決定的再実行**: 監査シャードは append-only(A-3)であり、同一入力集合への再実行は byte 同一出力(FR-6 AC i)。リトライ・部分再開機構は不要(全量再走査が数秒で済む — 過剰設計の回避、cid:nfr-design:c1 の circuit breaker 不適用と同族)
- **部分故障の分類**(component-methods のエラー処理方針を機構化): シャード読取不能 / 行 parse 不能 / 見出し parse 不能はそれぞれ独立のカウンタ・バケットへ集約し、1 件の故障が走査全体を止めない(クラッシュ不可 — 全 catch はカウンタ加算へ収束)。ただし集約は無音化ではない — 全カウンタが measurement ref に必ず露出(BR-4)
- **観測性**: 本 CLI 自身が観測ツールであり、自己の実行の観測は exit code+measurement ref(シャード数・行数・除外件数)で足りる。ログ機構・メトリクス送出は持たない(read-only 契約 FR-7a とも整合)
## 落ちる実証(NFR-5)

fail-loud(exit 1)・各バケット報告の両側へ fixture 注入で赤の実働を確認してから完成扱いにする(実装段の完了条件)。zeroSecond/unclosedIdle の相互排他(FD iteration 2 の FOLLOW-UP)も両条件同時成立 fixture で明示カバーする。
