# Functional Design — Questions(unit grant-ceremony)

> 承認: 2026-08-15T16:50:00Z — full 梯子 AUTO_DECIDED auto-decision-e12ac85dc9b1f60a37ea07aa12d2b556(全 unit の定型質問は RFC-0001 + 選挙 E-260815-RFC0001-DESIGN + ADR 留保 + Q6/Q9 人間裁定から一意導出 — 既決事項の再質問回避)。

## Q1: preview → set-autonomy の2段構成の維持

- A. `handlePreviewAutonomy`(`amadeus-bolt.ts:1007-1017`)と `handleSetAutonomy`(:1161-1195)の2 verb 構成を維持する。1 verb への統合は行わない
- X. Other

[Answer]: A — ADR-7「preview → set-autonomy の 2 段を維持」。Alternatives Rejected「A(1 verb 統合)— 自己確認 digest は『読まずに発効』を型で防げず、確認の実質が形骸化」。

## Q2: preview 出力の印字改善の対象

- A. `handlePreviewAutonomy` の出力(現状は `previewProductionAutonomyGrant` の結果 JSON を `console.log` するのみ — :1016)の末尾に、貼り付け可能な `set-autonomy --mode <m> --confirmed-display-digest <digest>` の完全形コマンド文字列を追加で印字する。JSON 出力自体の構造(`AutonomyGrantPreview` 型)は変更しない(挙動不変 — component-methods.md C12 の注記どおり)
- X. Other

[Answer]: A — component-methods.md C12「preview-autonomy 出力末尾に貼り付け可能な完全形コマンドを印字(挙動不変)」。既存の `reviewConfirmationDigest`(:1091-1109)が同種のプレビュー→貼り付け可能コマンド文字列パターンを既に持つため、その様式を踏襲する。

## Q3: 相互必須不変量の適用範囲(mode 別)

- A. reality-check の結果、digest 確認の強制(`confirmedDisplayDigest !== expectedDisplayDigest` → `CONFIRMATION_REQUIRED`)は現状 `mode === "full"` の `prepareFullGrantCommand`(`amadeus-intent-autonomy-production.ts:608-636`、判定は :617)にのみ存在し、`prepareNonFullCommand`(:641-659、semi/none 用)には対応する検証が一切ない。この非対称は欠陥ではなく、ADR-2「semi は grant-less のまま」・`amadeus-intent-autonomy.ts:363-366`「semi holds no grant scope」という既存裁定と整合する意図的な設計である — 「grant ceremony」という語自体が `AutonomyGrantPreview` 型・RFC の Q15 の文脈でも一貫して「grant(= full 発行/差替)」を指す。よって ADR-7 の相互必須不変量は **full モード(issue-full / replace-full)の発行・差替にのみ適用**し、semi/none の `set-mode`/`revoke-full` コマンドに digest 確認を新設しない
- X. Other

[Answer]: A(reality-check に基づく確定) — ADR-7 の "grant" という語の一貫した用法(C12 の場所は `preview-autonomy`、RFC Unresolved Q15「grant ceremony の簡素化と、相互必須不変量・発効前プレビュー(nonAutoDecidedKinds 提示)の扱い」)と ADR-2 の「semi は grant-less」から、相互必須不変量のスコープを full 限定と読むのが唯一整合する解釈。semi/none への拡張は本 RFC のいずれの ADR にも記述がなく、新設は「新しい設計裁定の捏造」に該当するため行わない。

## Q4: 落ちる実証の対象

- A. reality-check の結果、「誤った digest を渡した場合の拒否」は `tests/integration/t435-intent-autonomy-production.integration.test.ts:348-354` に既存 pin がある(all-zero のダミー digest → `CONFIRMATION_REQUIRED`)。未被覆なのは「`confirmedDisplayDigest` を省略(undefined)した場合の拒否」— 本 unit の落ちる実証はこの1本に絞る: `confirmedDisplayDigest` 省略で `set-autonomy --mode full` を実行 → `CONFIRMATION_REQUIRED` で拒否されることを新規テストで pin する
- X. Other

[Answer]: A — Q3 の確定を受けた直接帰結。既存テストの棚卸し(grep 実測: `CONFIRMATION_REQUIRED` を含むテストファイルは `t435-intent-autonomy-production.integration.test.ts` の1本のみ、該当ケースは誤り digest のみ)により、省略ケースが未被覆であることを確認した。実装コード自体は `:617` の `!==` 比較が `undefined !== expectedDisplayDigest` でも true になるため無改修で通る見込みだが、pin がない事実は「落ちる実証」の対象として妥当(pin 追加前は該当契約が検証ゼロという意味で Red)。
