# Requirements Analysis — 明確化質問(installer-new-harnesses / Issue #1048)

上流入力(consumes 全数): `../../ideation/intent-capture/intent-statement.md`(成功の姿)、`../../ideation/scope-definition/scope-document.md`(In 1〜5)、codekb の business-overview.md / architecture.md / code-structure.md(RE 全数再検証済み台帳 — 特に code-structure.md:79-129 の harness port 開放性節)、`../practices-discovery/team-practices.md`(既存実践の live 温存確認)、RE scan-notes.md(面1〜6+Architect 合成)、`../../ideation/rough-mockups/wireframes.md`(AC 文言導出元)、`../../ideation/feasibility/constraint-register.md`(C-1〜C-6)。

## 選挙対象の判定(E-OC1 準拠 — 1問のみ、他は既決)

既決照合: 修正本体(installer 8サイト+README 3箇所)・検証方式(fakeHttp+codeload fixture / literal 契約テスト / npm pack)・c3/c4 契約固定は Issue/裁定/RE 実測で既決。真に未決は以下の1問。

## Q1. 付随3面(installer 外の閉じ列挙)の本 intent での扱い

対象(RE 実測): runtime 2 = `amadeus-lib.ts:121 KNOWN_HARNESS_DIRS`(:114-116 コメントが「NOT the source of truth — script-path derivation handles any dir」と明記の probe-order hint。※訂正 2026-07-16: 当初の「harness.json が権威」は誤要約 — [Answer] 欄の訂正経緯参照)+`amadeus-utility.ts:860 otherTrees`(doctor の他ツリー検出 advisory)/ migrate 1 = `amadeus-migrate.ts:71`(aidlc→amadeus 移行経路のみ)/ self-install 1 = `promote-self.ts:37-41 managedDirs`(現状 claude+codex のみ — kiro すら対象外の dogfood 専用)。**3面とも install 完走の正しさに非影響**(Architect 合成 (b) の実測根拠)。

- A. **installer 5ファイルのみ更新(3面すべて非更新)** — 本 intent は install 経路の正しさに閉じる。runtime 2 の advisory 品質(doctor の opencode/cursor ツリー検出)は将来必要時に別対応
- B. **installer 5+runtime 2 を更新(migrate/self-install は非更新)** — doctor の multi-harness 検出 advisory も6値で揃え、利用者可視の doctor 出力の一貫性を取る。migrate は移行経路限定・self-install は dogfood 判断のため除外
- C. **9ファイル全面更新** — 台帳を一括で6値化(self-install の dogfood 対象化を含む)
- X. Other

[Answer]: B(E-1048-RA-Q1 裁定 2026-07-16T11:56:58Z 開票、e2 後着票 B(2) で 11:57:49Z に 4/4 閉包 — agmsg 出典。開票時 3/4(e3=2・e1=2・e4=2)+e2(2)。起草者推奨と一致。留保2件: (e3) runtime 2面の更新根拠は advisory 一貫性であり install 正しさ要件と分離して AC 化 / (e2) fallback 台帳の6値化のみで権威の変更ではない — ※留保の機構引用は当初 harness.json とされたがコード矛盾が判明し、訂正文言(権威 = script-path derivation、KNOWN_HARNESS_DIRS は probe-order hint の6値化のみ)へ e2 が等価確認(12:11:25Z、現物再実測付き)— 本記載・FR-6 とも訂正済みで最終)
