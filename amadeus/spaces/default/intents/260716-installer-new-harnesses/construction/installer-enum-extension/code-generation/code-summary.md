# Code Summary — U1 installer-enum-extension(Issue #1048 / Bolt 1)

上流入力(consumes 全数): `code-generation-plan.md`(変更目録の正本)、`../../../inception/units-generation/unit-of-work.md`(U1)、`../functional-design/`(business-logic-model.md、business-rules.md、domain-entities.md)、`../nfr-design/`(reliability-design.md の AC-6e 設計、performance-design.md、security-design.md)、`../infrastructure-design/deployment-architecture.md`(embedded 配置)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜6)。

## 実装(worktree bolt1-1048、ブランチ bolt/1048-installer-enum-extension、コミット e2d602988 — 27ファイル +210/-37)

- 正本5サイト: harness.ts(union+all 6値)/ engine-layout.ts(`.opencode`/`.cursor` 各固有)/ reporter.ts(usage×2+invalid 6値)/ amadeus-lib.ts(KNOWN_HARNESS_DIRS 6値 — rung 2 実挙動、AC-6a)/ amadeus-utility.ts(otherTrees advisory)
- テスト4面: 契約テスト2本 literal 6値化(件数文言含む)/ setup-install-flow へ opencode・cursor 完走+`--harness foo` exit 2 検証 / **t230**(AC-6e 新規、integration 層 size medium — resolveProjectDirFromHook の worktree marker 解決を in-process assert、新規 export なし)
- 生成物: dist 6ツリー+self-install 2ツリー regen(手編集なし)
- README: :58-59 表2行(manual install → install コマンド)+:109 wizard prose 6値(README.ja.md 不存在確認済み)

## 検証(builder 実測+conductor 裏取り再実行)

| 検証 | builder | conductor 裏取り |
|---|---|---|
| typecheck / lint | 0 / 0 | 0 / — |
| dist:check / promote:self:check | 0 / 0 | 0 / 0 |
| tests/run-tests.sh --ci | 0(0 fail) | 契約2本+t230 = 10 tests 0 fail |
| patch gate(ローカル lcov) | PASS 9/9(uncovered 0・waiver 不要) | — |
| npm pack --dry-run | 0(dist/cli.js+LICENSE×2 列挙) | — |
| 落ちる実証(FR-2) | RED exit 1(Received 5≠6)→ 復元 GREEN exit 0 | — |
| AC-6d 非接触 | migrate / promote-self 非改変 | diff stat grep 0 |

## 申告事項

- 逸脱1件(配置補正): AC-6e テストは size 純度ゲート(t-test-size-drift)により unit 層へ配置不能 → tests/integration/ へ(要件・設計の AC は全充足 — conductor 裁定: 既決サイズ純度規則への準拠であり要件逸脱ではない。leader へ報告済み)
- 既知 flake: t163-reaper-steal-race の間欠 red(本 Bolt 非接触領域)— 別途 Issue 判断
- deslop 実施済み(t230 の空検証ケース除去+未使用 import 除去 → 全検証再実行 green)
