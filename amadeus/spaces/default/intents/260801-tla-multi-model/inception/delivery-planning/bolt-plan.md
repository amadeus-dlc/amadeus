# Bolt Plan — 260801-tla-multi-model

上流入力(consumes 全数): `../requirements-analysis/requirements.md`、`../units-generation/unit-of-work.md`、`../units-generation/unit-of-work-dependency.md`、`../application-design/components.md`

## Bolt 構成(5 units / 4 batches、walking skeleton off — ADR-9)

| Batch | Bolt | 内容 | 依存 |
|---|---|---|---|
| 1 | bolt/u1-schema-resolver | model-map スキーマ optional `auxiliaries`/`vocabulary` 追加 + `tla-module-deps.ts` 推移解決リゾルバ新規 + スキーマ表テスト(t402) | — |
| 2 | bolt/u2-loader-generalization | verifyRegisteredAssets 全モデル化 + aux 照合 + 宣言不一致 red(loader 側、t403) + VerifiedTlaSource 全モデル配列 | u1 |
| 2 | bolt/u3-vocabulary-supply | TLA_NAMED_INVARIANTS/TRACE 語彙の model-map 供給化 + byte-pin 一般化 + FormalElection vocabulary 値不変移管(t404) | u1 |
| 3 | bolt/u4-mirror-declaration-drift | sensor/updateModelMap 第2検出点 + MirrorLifecycle へ Core auxiliaries+vocabulary 宣言 + drift 赤実証(t405) | u2 |
| 4 | bolt/u5-ci-all-models-measure | CI ポート/診断/スケルトン引数化・全モデル反復 + ci.yml 追随 + stage doc 整合 + 両モデル注入 red(t406) + AsIntended 実測 | u2,u3,u4 |

## 実行方針

- 各 Bolt 末尾で `bun scripts/package.ts` 再生成 + drift guard(typecheck/lint/関連テスト green)。
- patch coverage ゲート: 変更行 0-hit 不許容(spawn 子プロセス分は allowlist 理由クラス)。
- u3/u4 は `specs/tla/model-map.json` を別エントリで共有(行競合なし、unit-of-work.md 共通契約どおり)。
