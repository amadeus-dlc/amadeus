# Integration Test Instructions — 260810-control-byte-gate

上流入力(consumes 全数): code-generation-plan.md(Step 2 の走査エンジンと port 注入 seam、Step 5 の CI 配線 — 本書の対象境界の導出元)、code-summary.md(BR-1/4/5/6/7 の逐条監査と symlink 実測、FR-CBG-7 の是正 — 本書のケース一覧と CI 契約検証の照合軸)。

## 対象

- `tests/integration/t-control-byte-gate.integration.test.ts` — 実 FS・実 git リポジトリを使う走査エンジンと CLI、および FR-CBG-7 の CI 配線契約。
- `tests/integration/t222-ci-snapshot-branch.integration.test.ts` — `ci-success` の needs 集合と `require_result` 位置の pin。
- `tests/integration/t-formal-verif-ci-workflow.integration.test.ts` — ci.yml の正規化ベースライン pin。

## 実行

```
bun test tests/integration/t-control-byte-gate.integration.test.ts \
         tests/integration/t222-ci-snapshot-branch.integration.test.ts \
         tests/integration/t-formal-verif-ci-workflow.integration.test.ts
```

## カバーする境界

| 境界 | 契約 | 検証の形 |
|---|---|---|
| 列挙 fail-closed(BR-1) | spawn 失敗・非0 exit のいずれでも throw。部分列挙での続行経路なし | temp dir(非 git)で throw、存在しない root で `git ls-files could not be run in` |
| allowlist(BR-4 / FR-CBG-5) | path 完全一致 skip、不在エントリは stale、`reason` 空は load 時 throw | skip・stale・`assertAllowlistWellFormed` の3ケース |
| 読取 fail-closed(BR-5 / NFR-3) | 読めない tracked ファイルは skip せず `readErrors` へ集計し非0 exit | 列挙にあるが実体のないパス |
| 診断書式(BR-6 / NFR-2) | `<path>: control byte 0x<HEX> at offset <10進>`、全件列挙・打ち切りなし | 0x10 未満の2桁大文字 HEX、複数違反の列挙順 |
| exit 契約(BR-7) | 3集合の空判定から毎回導出。成功フラグを持たない | clean=0 / 検出=1 / usage=2 |
| symlink | git が持つ blob(リンク先パス文字列)を判定し、デリファレンスしない | リンク先が汚れていてもリンク文字列が clean なら pass |
| **CI blocking 配線(FR-CBG-7)** | `ci-success` の needs に載り、`require_result` が `changes` の case 分岐**より前**にある | needs の containment と、位置(`indexOf` 比較)の両方 |

## 位置の pin が要る理由

FR-CBG-7 は「赤がマージを止めること」を要求する。必須 status check が `CI Success` 1件だけの構成では、集約の needs から外れたジョブは advisory に退化する。さらに `require_result` が `changes` の case 分岐**の中**にあると、docs-only / amadeus-only の PR — フィルタが免除する当のクラス — が素通りする。したがって存在(containment)だけでなく**位置**を固定しないと契約が守れない。

落ちる実証で両面が load-bearing であることを確認済み: needs から除去 → needs アサーションのみ 1 fail / `require_result` を case 分岐内へ移動 → 位置アサーションのみ 1 fail。

## 生バイトの扱い

unit 層と同じく実行時生成。scratch の一時ディレクトリに実 git リポジトリを作り、既定の `git ls-files -z` 経路を駆動する。
