# Business Rules — unit grant-ceremony

- R-1(ADR-7・Q1): preview-autonomy / set-autonomy の2 verb 構成を維持する。1 verb への統合は行わない。
- R-2(ADR-7・Q2): `preview-autonomy` の出力末尾に、貼り付け可能な `set-autonomy --mode <m> --confirmed-display-digest <digest>` の完全形コマンド文字列を追加印字する。既存 JSON 出力構造(`AutonomyGrantPreview`)は変更しない。
- R-3(Q3): 相互必須不変量(preview なし発効拒否・digest 不一致拒否)は full モードの発行/差替(`issue-full`/`replace-full`)にのみ適用する。semi/none(`set-mode`/`revoke-full`)への拡張は本 unit で行わない — ADR-2 の「semi は grant-less」裁定と矛盾する新設ルーリングを作らない。
- R-4(Q4): `confirmedDisplayDigest` 省略時の `CONFIRMATION_REQUIRED` 拒否を新規テストで pin する。誤り digest のケースは既存テスト(`t435-intent-autonomy-production.integration.test.ts:348-354`)が既に pin 済みのため重複追加しない。
- R-5: 印字改善(R-2)は表示のみの変更であり、`applyProductionAutonomyMode`/`prepareFullGrantCommand` の判定ロジックを変更しない(挙動不変)。

## 落ちる実証(Red の期待)

- 現行棚卸し: `grep -n "CONFIRMATION_REQUIRED" tests/` が `t435-intent-autonomy-production.integration.test.ts` 1件のみを返し、該当ケースが「誤り digest」1本であって「省略(undefined)」ケースの pin が存在しないことを実測する(この不在確認自体が Red 相当)。
- 導入後: `confirmedDisplayDigest` を渡さずに `applyProductionAutonomyMode({ mode: "full", ... })` を呼ぶテストを追加し、`{ ok: false, error: "CONFIRMATION_REQUIRED" }` を pin する(実装コード変更なしで Green になることを確認 — 挙動不変の裏付け)。
- 印字改善の実証: `handlePreviewAutonomy` の stdout に貼り付け可能な `set-autonomy` コマンド文字列が含まれることを、既存の JSON パース結果が不変であることと合わせて実測する。
