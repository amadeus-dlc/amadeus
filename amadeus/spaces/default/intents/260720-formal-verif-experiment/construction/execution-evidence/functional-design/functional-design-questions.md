# Functional Design 質問 — execution-evidence

本質問は `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md` の既決事項だけを確認する。

## Q1. evidence bundleのappend方式

- A. bundle全体をstagingで検証し、content identity確定後にatomic publishする
- B. stdout、stderr、resultを個別に順次appendする
- C. result JSONだけを保存しstreamは省略する
- X. その他

[Answer]: A — `appendEvidence`のoverwrite拒否とappend-only契約を、部分可視性なしで実装する。同一identity・同一bytesの再送だけは既存bundleを再照合して成功へ収束させる。（E-FVEAD3 / E-USSU02FDS13 / E-USSU02FDS14）
**Basis:** `component-methods.md` Runner / Evidence、`components.md` Evidence Store、project memoryのatomic batch規則

## Q2. handwritten cellの拒否境界

- A. runnerだけが生成できるexecution receiptをbundle indexに含め、matrix validatorがreceiptと期待key集合を照合する
- B. file名が一致すれば手書きresultも受理する
- C. report生成時の目視確認だけにする
- X. その他

[Answer]: A — runner-owned suite ledgerとstore append ledgerの独立entryが一致するcellだけを数え、missing、duplicate、予期しないsubject、input hash driftを同じcompleteness検査で拒否する。（E-FVERA1R / E-FVEAD3）
**Basis:** `unit-of-work.md` execution-evidence完成条件、`component-methods.md` `verifyMatrix`

## Q3. frontend成果物の要否

- A. frontend/UIなしとして生成しない
- B. raw evidence viewerを追加する
- C. benchmark dashboardを追加する
- X. その他

[Answer]: A — `services.md` はnon-interactive local CLIとmachine-readable JSONだけを定義するため、optional `frontend-components.md` は生成しない。（E-FVEAD3）
**Basis:** `services.md` service stance、`components.md` 配置境界
