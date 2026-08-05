# Code Summary: seam-bridge(U1)

上流入力(consumes 全数): business-logic-model、business-rules、domain-entities、unit-of-work

## 変更ファイル(コミット a7e782881 — builder 938acdd41 の cherry-pick、fidelity diff 空)

| ファイル | 内容 |
|---|---|
| `packages/framework/core/tools/amadeus-plugin-compose.ts` | `parseStageFrontmatter`(raw+seamSpans 保持、SeamListStyle 判定、fail-closed typed error)/ `serializeStageFrontmatterSeams`(produces のみ・対象外バイト保存・再 parse 検証)新設。rebuildStageSeams/rebuildLedgerEntry へ host 現在バイト供給 |
| `packages/framework/core/tools/amadeus-plugin.ts` | `parseHostStageFrontmatter` 新設+`buildHostSnapshot` 結線(合成バイト形 null → 実 frontmatter 受理。実ステージ様式の parse 失敗は loud) |
| `tests/unit/t444-stage-frontmatter-seams.test.ts` | 13 tests — 往復 byte-identity・対象外不変・roundtrip-mismatch・unsupported-target-seam・SeamListStyle |
| `tests/integration/t445-stage-frontmatter-compose.integration.test.ts` | 7 tests — fixture workspace の compose E2E(install→produces 反映→drop byte-identical)+BR-U1-7 対照(unknown-seam 解消) |

## 検証結果(conductor 再実行 — 再接地 origin/main e6179d7c3 後)

- typecheck 0 / lint 0(既存 warning のみ)/ build 0(tracked 不変)
- plugin 系11スイート: **174 pass / 0 fail / 712 expect**(t444/t445/t446/t447/t448/t301/t252/t254/t299/t340/t377 — U2 分含む合算)

## 申し送り

- no-silent-drop の BASELINE_INVALID は base 由来(census 213件に本変更のサイト追加なし)— rebind は PR 作成時に conductor が実施(c3-nsd-rebind)
- 設計正本は builder fork 断面に不在だったため conductor checkpoint から git show で読解(builder 申告 — 逸脱なし)
