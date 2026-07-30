# Build Test Results — 260730-skill-reviewer-fixes

上流入力(consumes 全数): fix-1736-skill-new-intent/code-generation/code-generation-plan.md・code-summary.md、fix-1711-unitname-resolution/code-generation/code-generation-plan.md・code-summary.md — 検証対象・手順・検証済み証拠は両 unit の plan/summary から導出した。

## Bolt 1(#1736 / PR #1753)

| 検査 | 結果 |
|---|---|
| typecheck / lint / dist:check / promote:self:check | exit 0 |
| t366(27)/ t176(1) | 0 fail |
| 落ちる実証 | 注入で 2 fail → 復元で 0 fail(1セット) |
| PR CI | 18 pass / MERGED(2026-07-30T13:46:51Z) |

## Bolt 2(#1711 / PR #1760、head 3e9fd02ae)

| 検査 | 結果 |
|---|---|
| typecheck / lint / dist:check / promote:self:check | exit 0(レビュー是正後に再実測) |
| t367(9)/ t186 / t116 / t118 / t247 / ratchet | 0 fail(68 tests / 292 assertions+t367 9) |
| allowlist 行ピン | 38 remap(builder)+14 remap(是正 +1 行)、ratchet green |
| フルスイート coverage:ci | builder 実行完走(coverage/.parts 601) |
| PR CI(fba95d83f 時点) | 19 pass 全 green |
| PR CI(最終 head 3e9fd02ae) | 17 pass / skip 2(設計どおり)/ CLEAN / 未解決レビュースレッド 0 |

## 総合判定

両 Bolt とも全検査 green。Bolt 1 は着地済み、Bolt 2 はマージ承認待ち(no-AI-merge)。未検証面は build-and-test-summary.md の書き分けどおり(マージ後 promote 済み実環境でのライブ実走のみ)。
