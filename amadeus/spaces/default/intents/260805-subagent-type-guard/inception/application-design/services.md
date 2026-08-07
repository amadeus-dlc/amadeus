# Application Design — Services

**上流入力(consumes 全数)**: `requirements`(NFR-1〜NFR-4 — 本書の運用面契約の導出元)/ codekb `architecture`(hook 実行モデル — サービス層が存在しないことの確認)/ codekb `component-inventory`(配布面の構成 — 投影先の確認)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## サービス構成(常駐サービスなし)

本 intent は常駐サービス・デーモン・外部 API を一切導入しない。実行単位は3種のみ:

| 実行単位 | トリガ | 実行時間の期待 |
|---|---|---|
| hook 内の照合・解決(C-5) | ハーネスの hook 発火(PreToolUse / SubagentStop / role-start) | 既存 hook 実行時間 + 数 ms(persona dir 読取1回 + 純関数) |
| 集計 CLI(C-7) | 人間または leader の手動実行 | シャード全読で数秒級(現行 216 シャード実測規模) |
| テスト | CI / ローカル | 既存 runner に同居 |

`cid:nfr-design:c1`(CLI/ライブラリに常駐 service 向けの cache / circuit breaker を機械適用しない)に従い、キャッシュは持たない — C-1 の persona dir 読取は hook 発火ごとに行い、決定的なファイル境界で完結する。

## 運用面の契約

- **fail-open(NFR-3)**: 照合・解決のどの失敗も SUBAGENT イベントの emit を止めない。失敗は stderr 警告として可視化し、無音で握りつぶさない(サイレント失敗の禁止 — Construction guardrails)。
- **配布(NFR-1)**: 正本は `packages/framework/core/` のみ。`bun run build` で全ハーネス(manifest 検出集合)へ投影される。harness 専用コードは無い(`cid:code-generation:harness-tools-placement` — C-1〜C-7 はすべてハーネス中立)。
- **スキーマ互換(NFR-4)**: registry optional 追加のみ。既存 audit 行の遡及書換なし。C-7 は属性の無い旧行を集計時分類で扱うため、移行作業ゼロ。
- **セキュリティ**: 新しい入力面は payload の `model` / `tool_input.model`(信頼境界内のハーネス供給)と `.claude/agents/*.md`(repo 内)のみ。ネットワーク・認証情報・transcript への接触なし(CON-1)。

## 監視・可観測性

本 intent 自体が可観測性の追加である。導入後の観測手段:
- advisory 警告(stderr)— 発生時点の可視化
- `Type Verdict` / `Model` / `Model Source` 属性 — audit 行での恒久記録
- `amadeus-subagent-stats.ts` — 事後集計(測定 ref 付き)

運用上の減少目標(集合外 spawn の削減)は本 intent の完了条件外(intent-capture Q2)であり、次のローリング PM で C-7 の出力を題材に振り返る。
