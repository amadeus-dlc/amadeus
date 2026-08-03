# Reliability Requirements — repository-adoption

## 上流入力

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とする。availability SLAではなく、evidence provenance、trusted base、blocking exit、deterministic reproduction、distribution parityをrepository adoptionの信頼性とする。

## 信頼性目標

| ID | 目標 | 合格条件 |
| --- | --- | --- |
| REL-RA-01 | immutable evidence | raw、classification、approval、approved、candidate、bootstrapは別artifactで、既存path上書き0件 |
| REL-RA-02 | provenance closure | 各段のrevision／digest／identityが前段と全単射で、改変・不足・余剰・重複時に後段を生成しない |
| REL-RA-03 | precision | raw探索時FP率5%以下、最終approved pre／postはFP=0、3 shape fixtureは100% |
| REL-RA-04 | baseline proof | `B0 ⊂ B_pre`、removedは#1874／#1878承認identityと完全一致、addedは0件 |
| REL-RA-05 | trusted previous | baseにledgerがあればexact bytesだけをprevious setとし、初回欠落時だけ承認済みbootstrap provenanceを使う |
| REL-RA-06 | blocking CI | exit 0だけを成功、1／2／124／137／signal／fetch・spawn failureをすべてstep failureにする |
| REL-RA-07 | deterministic replay | 同一revision／contract／ledger／baseでraw evidence、GateResult、identity順序がbyte-identical |
| REL-RA-08 | distribution parity | canonical sourceから全projectionを再生成し、package／promotion driftと対象外公開挙動の回帰が0件 |

## Failure分類と停止境界

- invalid／missing／zero／short／unresolvable base SHAはgate開始前またはU1 typed Errorで停止し、HEAD／merge-baseへfallbackしない。
- object欠落時のliteral fetch失敗、再確認失敗はblocking infrastructure failureとし、current ledgerだけで続行しない。
- U1のPolicy Violationsはexit 1、検査基盤Errorはexit 2のまま保持する。CIはstdout／stderrから再分類しない。
- 外側deadlineのTERMは124、KILLは137として保持し、後続commandで0へ上書きしない。
- digest mismatch、未分類、重複、FP残存、集合条件不成立、承認不足ではcandidate／canonical ledgerを生成しない。
- regression、performance、coverage、driftの一件でも不合格なら最終reportをgreenにしない。

## Bootstrapとratchet回復

- trusted baseにbaselineがない初回だけ、ledger外bootstrap provenanceのapproved `B_pre` identity-set digestとinitial exemption digestをprevious setとして検証する。
- canonical ledgerの `previousDigest` はprovenanceが宣言するprior identity-set digestへ一致させ、candidate artifact digestやprovenance file digestへ読み替えない。
- base ledgerが存在する二回目以降はbootstrap入力を無視し、不正なbootstrapがあってもfallbackに使わない。
- baseline／exemption growthや同数replacementは通常checkでViolationsとなり、CLIが自己修復や自動更新を行わない。
- canonical promotion失敗からの回復はrepository changeの修正と人間再reviewで行い、evidence artifactを上書きしない。

## 可観測性

- 各command recordはfull revision、cwd、literal argv、environment contract、開始／終了UTC、exit、stdout／stderr digest、artifact digest、母集団を持つ。
- stdout／stderr本文は正本artifact側に保持し、最終reportはpathとdigestで参照して複製しない。
- secret、token、credential、runner固有一時pathをreportへ含めない。
- CI step名、event kind、selected base SHA、object materialization結果、gate exit、timeout transportを記録する。
- overall statusは全必須receiptの論理積として機械計算し、未実行を成功扱いしない。

## 検証要件

- evidence chain各段の1 byte改変、不足、余剰、重複、receipt流用を個別に拒否する。
- PR base、fork PR base、push before、short／zero／missing／unresolvable SHA、fetch failureをintegration fixtureで検証する。
- violation、tool missing、rule invalid、ledger invalid、zero／partial／symlink／source change、hangを各exit contractへ写像する。
- #1874／#1878 focused regression、#1963 t407／t411、full test、lint、typecheck、既存coverage gateをcommand digest付きで接続する。
- package／promotionの生成後checkを実行し、generated fileの直接修正が0件であることを確認する。
