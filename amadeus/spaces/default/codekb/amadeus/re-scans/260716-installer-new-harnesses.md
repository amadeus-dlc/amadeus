# Re-scan 記録 — 260716-installer-new-harnesses(Issue #1048)

- **Date**: 2026-07-16
- **observed**: `1e22d6a889ca71cab82a056e07edc8a46110a297`(`git rev-parse HEAD` 実測)
- **base**: `5761e65ce73a82b055590a50f483161e5df2abca`(re-scans 全 observed のうち HEAD 祖先・距離最小 41 — rescan-base-ancestry)
- **手法**: diff-refresh(c1)+installer 重点(c2)。Developer スキャン → Architect 合成の直列(c3、再検証全点一致)
- **Focus**: installer 閉じ列挙5ファイル・9箇所の全数再列挙(前台帳と全数一致・区間不変)/ installer の汎用機構(wizard :17 all 駆動・verifier engineDirNameFor・plan walkFiles・payload readdirSync — per-harness ハードコード 0)/ setup-pack-contract(ハーネス非依存 = 変更不要)/ README :58-59 注記+:109 wizard prose(docs 同期面)/ 全数性の二層分担(installer literal 契約 vs t149+dist:check)/ ローカル install 完走検証 = fakeHttp+buildCodeloadFixture(codeload 形状合成 — ネットワーク・タグ不要)
- **区間差分**: base..HEAD 41コミットで全フォーカス面不変
- **codekb body 更新**: なし(churn 回避 — 既存節 code-structure.md:79-129(履歴ラベル済み)が台帳を正確に保持、現 observed で全数再検証一致。c3-relabel 作業も不要)
- **Per-intent record**: `<record>/inception/reverse-engineering/scan-notes.md`(Architect 合成込み)
