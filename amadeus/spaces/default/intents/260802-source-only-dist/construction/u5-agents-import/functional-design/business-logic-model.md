# Business Logic Model — u5-agents-import

上流入力(consumes 全数): unit-of-work(u5 境界・規模 270)、requirements(FR-3.1/3.3 = G2 裁定)、components(C4)、component-methods(C4 契約 — 本書が詳細化)、services(外部境界なし)、unit-of-work-story-map(Slice 2 の bootstrap 整備)。

測定 ref: file:line は observed `63e69d922`。

## 現行機序(変更前)

promote-self.ts は追跡ファイル2点を生成合成している:

- `CLAUDE.md` = `PROJECT_INSTRUCTIONS` 定数(:65-74)+ `.claude/CLAUDE.md`(追跡)の連結(:422-432)
- `AGENTS.md` = 手書き prefix(現 1-91行)+ `dist/codex/AGENTS.md` 由来 suffix(現 92-162行、マーカー :92)— `composeRootAgents`(:83-99、:433-437)

いずれも「build が追跡ファイルを書き換える」経路であり、NFR-2(生成後 git status クリーン)と両立しない。

## 変更後の機序

```mermaid
flowchart TD
  subgraph AGENTS.md
    A1[追跡 AGENTS.md = 手書き部 + import 2行] --- A2[未追跡 .agents/rules/amadeus-codex-suffix.md\n= build が dist/codex/AGENTS.md 由来 suffix を生成]
  end
  subgraph CLAUDE.md
    B1[追跡 CLAUDE.md = 凍結(現合成結果を正本化)] --- B2[core 正本 project-instructions\n一致は drift テストで強制]
  end
  C[composeRootAgents 廃止\npromote-self は追跡ファイルへ書かない]
```

テキストフォールバック:

1. **AGENTS.md(import 参照方式 — G2)**: 追跡 AGENTS.md を「手書き部+import 行(既存 :1 の `@.agents/rules/amadeus.md` に加え、suffix 相当の `@.agents/rules/amadeus-codex-suffix.md`)」へ縮約。現 suffix(12,954B)は build が未追跡 `.agents/rules/amadeus-codex-suffix.md` として生成。`composeRootAgents` と `AGENTS.md` の expected 合成(:433-437)を撤去
2. **CLAUDE.md(凍結+drift テスト)**: promote-self の CLAUDE.md 合成(:422-432)を撤去し、root `CLAUDE.md` は追跡・手書き正本として凍結。`PROJECT_INSTRUCTIONS` 定数の正本を `packages/framework/harness/claude/data/project-instructions.md`(名称は実装時確定)へ移設し、root CLAUDE.md の該当節との一致を**整合テスト(G8 型 — build は書かず、テストが乖離を loud 検出)**で強制。`.claude/CLAUDE.md`(allowlist 追跡)との連結一致も同テストで検証
3. build 前の窓: `.agents/**` 不在時は AGENTS.md の import 先が欠落(ルール未ロード)— Q1'/G1 と同じ「build 前は未完成」前提。onboarding 文書(u9)で案内

## 異常系

| 異常 | 挙動 |
|---|---|
| suffix 生成元(dist/codex/AGENTS.md 相当)不在 | build が loud fail(生成前提の欠落) |
| CLAUDE.md と core 正本の乖離 | 整合テスト赤(CI で検出 — 手編集はテスト更新とセットでのみ通る) |
| import 行の欠落・重複 | 整合テストで AGENTS.md の import 行集合を固定(重複除去ロジック :89-96 は廃止対象のため、固定はテスト側) |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T18:54:25Z
- **Iteration:** 1
- **Scope decision:** none

CLAUDE.md 凍結+整合テストが ADR-A6/C4 範囲外の無申告拡張(Major)。BR-U5-6 の標題と本文が不一致で u5×u8 交差申告が欠落(Major)

### Findings

- Major: CLAUDE.md 凍結方式の無申告拡張 — 申告または ADR 化が必要
- Major: u5×u8 交差申告の欠落と BR-U5-6 標題不一致
- Minor: BR-U5-2 の回帰保証委譲の明示推奨

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T18:54:25Z
- **Iteration:** 2
- **Scope decision:** none

3是正の着地と申告根拠の妥当性を裏取り確認、退行なし。新規 Minor(u5×u6 交差の upstream 開示ギャップ)は conductor が BR-U5-6a と unit-of-work.md の双方へ申告追記で是正済み

### Findings

- 閉包確認: Major 2 + Minor 1 の是正着地
- Minor: u5×u6 交差の upstream 訂正申告 — 両側へ反映済み(bolt-plan は直列化採用済み)
