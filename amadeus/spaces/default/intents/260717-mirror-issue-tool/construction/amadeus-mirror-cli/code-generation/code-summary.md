# Code Summary — amadeus-mirror-cli(Bolt 1)

上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、security-design.md、unit-of-work.md、requirements.md

## 実装結果(実測、wc -l)

- scripts/amadeus-mirror.ts: **369行**(見積り 288〜432 の範囲内。カバレッジ閉鎖で main へ deps 既定引数 seam を追加)
- テスト: unit 129行 + integration 286行 = **415行**(wc -l 実測。見積り 280〜420 の範囲内)。29 テスト / 60 expect
- **lcov 実測: scripts/amadeus-mirror.ts の未カバー 0行**(local-lcov-pre-push)

## 検証(コマンドと exit code — 自己捕捉)

| コマンド | exit |
|---|---|
| bun test tests/unit/t232-… tests/integration/t232-… | 0(29 pass / 0 fail) |
| bun run typecheck(tsc -p tsconfig + tsconfig.tests) | 0 |
| bun run lint(Biome、新規3ファイルは警告0) | 0 |
| bun tests/gen-coverage-registry.ts --check | 0(fresh, guards green, ratchet held) |
| bash tests/run-tests.sh --ci | 0(RESULT: PASS) |

## FR → テスト対応

| FR/AC | テスト |
|---|---|
| FR-2.2 重複 create → exit 1 | integration「duplicate create is refused loud」(gh 呼び出し0件も検証) |
| FR-2.3 番号記録 | integration「records the field」(state 実読で `- **Mirror Issue**: #1161`) |
| FR-3.2 sync 冪等 | integration「rewrites the body idempotently」(2回目 body バイト一致) |
| FR-3.3 フィールド不在 → exit 1 | integration「missing Mirror Issue field」 |
| FR-4.1 AND 検査 falling proof | integration 3ケース(両欠・intents 片側・state 片側 → すべて exit 1、close 未発行) |
| FR-4.2 close 前最終 sync | integration「closes after a final sync」(edit が close より先の順序検証) |
| FR-1.3 gh 未認証 | integration「gh-unready fails before any mutation」 |
| R-3 部分失敗 | integration「field write failure … surfaces the issue number」(chmod 444 注入) |
| FR-5 定型3要素のみ | unit「exactly the three fixed sections」 |
| S-3 usage 拒否 exit 2 | unit parseArgs 拒否5ケース(exit 2 は main 経由の写像) |
| ADR-3a 集計 | unit countStageProgress([S] 分母除外・節外チェックボックス無視) |

## 特記

- 実 gh への smoke は walking-skeleton ゲートでの人間確認に委ねる(fake GhRunner はテスト専用ヘルパー、本番コードに fixture 分岐なし — ADR-4)
- builder subagent 無応答(40分超・ディスク出力ゼロ)のため conductor が c5 引き取りで実装(検証コマンドは全て conductor 自身が再実行)
