# Application Design — 質問(260814-open-bug-batch-6)

> 承認記録: Q1 は選挙 `E-260815-3062-LANDED-FINALIZATION`(2-0、run-2 ESTABLISHED、recorded)で裁定。Q2/Q3 は autonomy=full の decide-question 梯子で AUTO_DECIDED(`auto-decision-3f34474db65554e812a31810dcd59b20` / `auto-decision-d6e7700a287426f0299760b7b8bb74c1`、2026-08-15T00:30:00Z 記録)。

## Q1: #3062 の是正方式(FR-1)

A. landed 記録方式 — self record でも landed を第一級の最終記録として許可(CLI 3層の拒否を landed 事実の report 書込へ置換、センサーは landed+merge commit 検証付きで合格、stage 文書の契約改訂)
B. override 許可方式
C. 順序契約方式(ツール無変更)
X. Other (please specify)

[Answer]: A(選挙 E-260815-3062-LANDED-FINALIZATION、2-0、GoA 3/3。留保: checkRollupState を硬い必須条件にしない(post-merge workflow の偽 FAILURE 既知事象)、converged:false の意味論を維持、旧拒否は削除して置換し二重経路を残さない)

## Q2: #3026 の同型インスタンス(tools 側)の扱い

A. 本 intent では起票のみ(修正はスコープ外)
B. FR-2 と同一変更で対応
X. Other (please specify)

[Answer]: A(梯子 AUTO_DECIDED。起票済み: #3078 — 実測の結果、実態は advisory-model-check.ts 1件の孤児モジュールで「tools キー不在」ではなかった。#3078 に訂正記録済み)

## Q3: FR-2 / FR-3 の drift 検査の要否

A. 既存テストスイート内へ検査を追加(新規 CI ジョブなし、落ちる実証必須)
B. 検査追加なし(根拠記録のみ)
X. Other (please specify)

[Answer]: A(梯子 AUTO_DECIDED。根拠: 起票後の実区間で drift が 3→4 件へ拡大した実測、doc-consuming テスト被覆の既定、reuse inventory 整合)
