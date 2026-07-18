上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

本書は codekb `technology-stack.md` を現行スタックの正本として消費し、`business-logic-model.md`・`business-rules.md`・`requirements.md` にない技術を追加しない。

# 技術スタック決定 — U2 層責務仕様と tier-aware ドリフト判定

本 intent は設計・計画までであり、tier-aware 判定、CI ゲート、runner 変更の実装は別 intent である。ここでは将来実装が従う既存スタックと再利用境界だけを固定する。

## TECH-1: TypeScript/ESM + Bun の既存スタックを維持

- 言語は TypeScript(ESM)、実行環境と package manager は Bun を維持する。
- 型検査は既存 `tsc --noEmit`、lint は Biome、テストは `bun:test` と `tests/run-tests.ts` / `tests/run-tests.sh` の4 tier runner を使う。
- DB、キャッシュ、queue、コンテナ、クラウド SDK、外部 SaaS、常駐 daemon、新しい npm runtime dependency を追加しない。
- 設計成果物だけを追加する本 intent では `dist/`・self-install・package manifest を変更しない。

## TECH-2: 既存テストサイズ契約を再利用

将来実装は次の既存資産を唯一の定義点として再利用する。

| 資産 | 用途 | 禁止する重複 |
| --- | --- | --- |
| `TestSize` | small/medium/large の値型 | 別の size union を作らない |
| `SIZE_ORDER` | size 上限の strict 序数比較 | 別の数値序数を定義しない |
| `classifyTestSize` | measured の唯一真実源 | tier-aware 側で signal 判定を再実装しない |
| `detectWallClockDrift` / `WallClockDrift` | 判別ユニオンと比較ロジックの設計手本 | 既存 declared-vs-measured ゲートを置換しない |
| `tests/run-tests.sh` / `tests/run-tests.ts` | tier 別 wall-clock の実測手段 | 測定のためだけの新 runner を作らない |

`allowedMaxSize` と `TierSizeViolation` は functional-domain-modeling-ts の既決スタイル(type、判別ユニオン、スマートコンストラクタ、網羅チェック)で設計する。ただし本 intent ではコードを先行着地させない。

## TECH-3: CI・検証境界

既存 CI の `bun run typecheck`、`bun run lint`、`bun run test:ci` を維持する。tier-aware ゲートを将来追加するときは既存ゲートを残した別観点のチェックとして配線し、失敗注入で実際に赤くなることを証明する。比率目標と tier 別実行時間予算は現時点ではガイドラインであり、強制ゲートへ暗黙昇格させない。

tier 別実行時間の値は、既存 runner の個別 tier 実行を同一条件で測定した後にだけ確定する。ソロモードでは測定結果と推奨値を人間へ直接確認し、未確認の数値を定数・文書へ先取りしない。
