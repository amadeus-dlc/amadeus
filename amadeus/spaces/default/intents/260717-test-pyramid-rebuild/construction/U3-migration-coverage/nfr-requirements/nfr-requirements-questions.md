# U3 nfr-requirements 質問票

上流入力(consumes 全数): `../functional-design/business-logic-model.md`、`../functional-design/business-rules.md`、`../../../inception/requirements-analysis/requirements.md`、`../../../../../codekb/amadeus/technology-stack.md`

> ソロモードのため選挙は実施しない。以下はいずれも実測から判明した上流仕様の未決事項であり、人間の直接判断を受けるまで `[Answer]` を空欄とする。
>
> 人間承認: 2026-07-17T17:02:05Z（audit `QUESTION_ANSWERED`、回答原文「すべて推奨選択で」）

## 判断材料

- `classifyTestSize` を現行 442 テストへ全数適用した結果、unit 非 small は 163件で、上流の measurement ref と一致した。
- 163件を排他的な signal 組合せで数えると、filesystem のみ 62件、filesystem + timer 1件、spawn のみ 9件、filesystem + spawn 90件、network のみ 1件だった。現行設計の「signal 主体」は 90件で一意に決まらない。
- network の1件は `tests/unit/setup-cli-wiring.test.ts` であり、fake port を使うテスト本文中の文字列が network regex に一致した lexical false positive である。`classifyTestSize` は文字列リテラルを除去しない。
- U1 台帳は6 tier・非ゼロの `${tier}_${size}` キー11個を持つ。一方、現行 `CoverageTierBinding` は tier ごとに1件かつ単一 `ledgerKey` のため、unit の3キーなどを表現できない。
- 現行 coverage は単一 `coverage/lcov.info` で、`coverage:ci` は smoke・unit・integration を結合し、e2e は含めない。harness・lib は標準 runner tier ではない。
- GitHub Issue #683 は CLOSED で、project/patch の Codecov gate を対象とし、per-tier lcov のパス規約や所有先は定義していない。

## Q1: 163件の remediation をどの規則で確定するか

### 選択肢(MECE)

- **A. エビデンス優先の2段判定に改める(推奨)**: まず排他的 signal 組合せへ機械分類し、各ファイルの source/evidence を確認する。全 non-small signal を seam で除去可能なら `seam-to-small`、真の network が残るなら `retier-to-e2e`、本質的 spawn/timer が残るなら `retier-to-integration`、lexical false positive は `classification-review` とする。根拠フィールドと未判定時の fail-closed を追加する。
- **B. signal 優先順位で自動3区分する**: network → e2e、次に spawn/timer → integration、filesystem のみ → seam-to-small とする。163件を機械的に閉じられるが、既知の network 誤検出を e2e へ送る。
- **C. remediation の確定を後続 intent へ全面移管する**: 本 intent は signal と候補優先度だけを出し、実読を含む分類は移設 intent で行う。最小変更だが、現行 FR-4 の選定台帳契約を弱める。
- **X. Other (please specify)**

[Answer]: A

## Q2: CoverageTierBinding の cardinality と tier 範囲をどう直すか

### 選択肢(MECE)

- **A. 4 NamedTier ごとに1 binding とし、`ledgerKey` を `ledgerKeys[]` に変える(推奨)**: unit・integration・e2e・smoke の非ゼロ tier×size キーを各 binding に全数格納する。harness・lib は U1 台帳では可視化するが、標準 runner 外なので coverage binding は N/A とする。
- **B. 開いた Tier の6 tier ごとに1 binding とし、`ledgerKeys[]` に変える**: harness・lib も対象に含める。そのため補助 tier の runner/coverage 契約まで新設する必要があり、現 intent の範囲を拡大する。
- **C. 詳細 binding モデルを削除する**: 一般的な整合要件だけを残し、cardinality と tier 範囲は後続 intent で再設計する。発明は避けられるが、FR-6 の具体性が下がる。
- **X. Other (please specify)**

[Answer]: A

## Q3: 存在しない per-tier coverage path の状態と所有先をどう扱うか

### 選択肢(MECE)

- **A. `coveragePath` を PENDING とし、新規 follow-up Issue/intent の所有にする(推奨)**: 本 intent では現在の combined path、e2e 未実行、補助 tier N/A を事実として記録する。具体的な per-tier パス名を発明せず、#683 の完了を改変しない。Issue 作成自体は本パイロットの範囲外とする。
- **B. 本 intent で per-tier パス規約まで新規決定する**: 計画値として具体パスを確定する。後続実装は明確になるが、既決ノルムも実装根拠もない新仕様を追加する。
- **C. #683 を再オープン対象として扱う**: per-tier lcov 配線を #683 の追加責務とする。既存 Issue の完了範囲を変更するため、Issue 運用上の再合意が必要になる。
- **X. Other (please specify)**

[Answer]: A
