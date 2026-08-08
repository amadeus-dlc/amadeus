# Unit Test Instructions — 260807-stage-perf-report

上流入力(consumes 全数): code-generation-plan(FR ごとの AC 述語と TDD 反復方針を検証設計として消費)、code-summary(実装した純関数群と twin 分割の実績を対象範囲として消費)

## 対象と配置

`tests/unit/t486-stage-stats.test.ts` — **55 tests / 126 assertions**。純関数のみ(実 FS に触れない — size purity ratchet、cid:code-generation:fs-tests-integration-first)。

```bash
bun test tests/unit/t486-stage-stats.test.ts --timeout=30000
```

## 独立オラクル契約

テストは v1/v2 の journal レコードを**自前で組み立て**、被検実装のスキャナを経由しない(自己参照比較の禁止)。窓リテラルも `win()` / `stageWindow()` ヘルパで直接構築し、`buildWindows` の欠陥がオラクル側と相殺しないようにする。

## カバー範囲(FR 対応)

| 群 | 対象 | FR |
|----|------|-----|
| `nearestRankP95` | 空入力 NaN・nearest rank・順序非依存 | FR-6a |
| `composeStageStats` | stage 別集計・空表・count-desc/key-asc | FR-6a/6b |
| `buildWindows` | 二世代ペアリング・unmatched/orphan・intent 分離・時系列整列・**invalid-timestamp 除外** | FR-1b/FR-2a/FR-2c |
| `indexIdle` / `subtractIdle` | idle 3 種・二重減算防止・unclosedIdle/zeroSecond の排他・恒等 W | FR-2b/2c/2d |
| `parseReviewHeadings` / `reviewAttribution` | 2 段マッチ・接尾辞バケット・`{unit-name}` リテラル保持 | FR-3a/3b |
| `tallySensors` | `Stage slug` のみで束ねる・prototype 継承しないルックアップ | FR-4a |
| `attributeModels` | COMPLETED 限定・UNKNOWN・恒等 M | FR-5a/5b |
| `renderMarkdown` / `renderCsv` / `serializeJson` | measurement ref 先頭・仮説明記・byte 一致・**サニタイズ契約** | FR-6a/6b/6c |
| `parseArgs` | 未知フラグ拒否(parse-don't-validate) | FR-7b |
| ソース検査 | fs write API import 0 件 | FR-7a |

## カバレッジ期待

純関数は全 export が in-process 駆動され lcov に載る(NFR-3)。patch coverage gate は PR CI が正(cid:code-generation:local-lcov-pre-push)。
