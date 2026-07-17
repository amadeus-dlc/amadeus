# Code Summary — opencode-plugin-adapter(Issue #1049 / Bolt 1)

> 上流入力(consumes 全数): `../functional-design/business-logic-model.md`(ワークフロー1 工程0)、`../functional-design/business-rules.md`(R-1〜R-8)、`../functional-design/domain-entities.md`(型契約)、`../nfr-design/performance-design.md`(不導入表)、`../nfr-design/security-design.md`(S-3 監査整合性)、`../../../inception/units-generation/unit-of-work.md`(U1)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜5)。2026-07-17。

## 結果: 工程0 実測により配線0件で確定 — docs 更新のみ出荷(コード変更ゼロ)

工程0(写像対応表の in-tree 実測凍結)の結果、Cursor 8 target のいずれも「配線(wired)」へ確定できず(**wired 0 / ⚠ conditional 5 / unsupported 3** — `mapping-table.md` 参照)、builder は設計どおり実装前停止(deviation-stop)。選挙 E-1049-CG0(4問・e1/e2/e4 全会一致)の裁定により:

- Q1=A: plugin 最小殻(no-op)不実装 — dead code 禁止。**C1/C2/C4/C5 のコード面はすべて不実装で確定**(FR-2 は「配線確定分のみ実装」の条件付き要件であり、配線0につき実装対象なし — AC-5b の正常系)
- Q2=A: ⚠5行の副作用のみ配線は不採用 — 意味論不一致の偽対応を作らない
- Q3=A: tool 語彙のライブランタイム実測は別 intent(leader が Issue 起票)
- Q4: docs 機能単位表更新を実施(FR-5 充足)

## 出荷物(PR #1130、head defc30b60)

| ファイル | 内容 |
|---|---|
| `mapping-table.md`(本 dir) | 工程0 成果物 — 8 target 全行に配線根拠 or 反証可能根拠(AC-1a/1b 充足、measurement-ref: @opencode-ai/plugin@1.18.3、2026-07-17) |
| `docs/guide/harnesses/opencode.md` / `.ja.md` | 機能表 Hooks 行を3値実測へ更新+Hook mapping 節(8行表・確定条件付き)。en/ja 対訳同期(AC-5a 充足) |

## 検証(rebase 後 fresh、全 exit 0)

typecheck / lint / dist:check / promote:self:check / `tests/run-tests.sh --ci`(367 files・0 fail・PASS)。docs/guide は dist 非配布(manifest 実測)につき regen 不要。lcov・落ちる実証・deslop はコード変更ゼロで対象なし(N/A)。

## レビュー

- iteration 1(e1): 条件付き READY GoA 3 — en docs の日本語トークン「工程0」3箇所 → step-0 へ置換(defc30b60)
- 増分確認(e1): **READY(GoA 1)** — 新 head で 工程0 grep 0 を機械確認済み

## FD 留保の閉包

forwardStdout 再設計トリガー: **非発火を実測確認**(opencode の注入 seam は experimental のみ — mapping-table.md に将来オプションとして記録)。ruling-premise-closure-verification: E-1049-CG0 裁定前提(型面で語彙未確定)は実装停止の根拠として閉包 — 症状(配線可否未確定)は「3値表で確定」により解消。

## 残余(別 intent / Issue 送り)

- tool 語彙・args キーのライブ opencode ランタイム実測(⚠5行の確定条件)— leader 起票の Issue(#1126)
- mint は phantom HUMAN_TURN 封鎖の fail-closed で未対応確定 — human-presence は現行 delegate 運用(#671)維持
