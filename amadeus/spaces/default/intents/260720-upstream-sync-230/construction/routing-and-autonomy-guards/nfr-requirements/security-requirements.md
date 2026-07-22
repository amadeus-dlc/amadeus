# Security Requirements — routing-and-autonomy-guards

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。CLI tokens、slug、marker metadata、workflow stateをtrust boundary上の入力として扱い、意図しないbirth/mutationとautonomy bypassを防ぐ。

## Input・namespace controls

| ID | 脅威 | control | 合格条件 |
|---|---|---|---|
| SEC-U04-01 | help語の誤分類 | 単独help/-hとnamespace helpだけをglobal helpへ送り、長いfreeform中のhelpは保持する。 | positive/negative matrixの3入口parity。 |
| SEC-U04-02 | reserved record creation | `help` slugをintent/space両choke pointで拒否し、`space-create -h`をslugify前に拒否する。 | directory、cursor、state、audit mutation 0。 |
| SEC-U04-03 | unsafe recovery誘導 | unknown switch errorは既存record一覧だけを示し、birth/createを提案しない。 | non-zero exitとmutation 0。 |
| SEC-U04-04 | autonomy bypass | autonomous recomposeを最初のdomain guardで拒否し、gated切替またはswarm完了待ちを示す。 | plan/graph/state/audit bytes不変。 |
| SEC-U04-05 | stale marker bypass | stale/unreadableをstop carve-outへ使わず、janitor成否からblock判断を分離する。 | unlink success/failureのdecision一致。 |

reserved vocabularyは単一ownerへ閉じ、parserごとの文字列setを増やさない。既存Running/pending/known slug/graph validationをautonomy guardで緩和しない。

## Data・supply-chain controls

- doctorはmarker path/bytes/mtimeを変更せず、read-only advisory/FAILとして表示する。
- new credential、network送信、database、service、UI、runtime dependencyを追加しない。
- upstream sourceは検査根拠として扱い実行しない。`packages/framework/`を正本とし、`dist/`手編集を禁止する。
- debug/audit event、保持期間、permission surfaceを新設しない。

## Failure・compliance

stat failure/non-finite mtimeはunreadableとしてcarve-outを拒否し、doctorは他checkを継続する。unlink failureは`delete-failed`として可視化してもcontinue-enforcementを維持する。autonomous経路はmarkerを読まず、stale janitorを推測実行しない。

追加規制要件は`requirements.md`のC-7どおり存在しない。既存audit/human gate/license境界を維持し、未根拠な規制適合を主張しない。

## トレーサビリティ

SEC-U04-01〜05は`business-rules.md`のBR-U04-01〜25、`business-logic-model.md`のNamespace guard/Failure decisions、`requirements.md`のFR-1、NFR-2、NFR-3、NFR-8、`technology-stack.md`のdependency境界に対応する。
