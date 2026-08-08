# Code Generation Plan — u3-question-route-observability

上流入力(consumes 全数): functional-design/domain-entities.md(QuestionAnsweredEvent の属性拡張 — Resolution Route / Decision Id の導出設計)、functional-design/business-logic-model.md(経路刻印フローとエラー分類)、functional-design/business-rules.md(BR-U3-1〜6)。補助参照: inception/requirements-analysis/requirements.md(FR-3a/3b/3c 逐語)。

本 plan は invoke-swarm 経路のディスパッチブリーフを正本として、着手時点の計画を記録する(cid:code-generation:swarm-unit-artifact-backfill による conductor 事後作成)。

## 受け入れ基準(requirements.md FR-3 逐語)

- FR-3a: `amadeus-log.ts` の `QUESTION_ANSWERED` 発行点に「decide-question 経由か否か」を示す属性を追加。2経路が audit 行で機械判別できることを integration テストで assert
- FR-3b: semi/full 有効下の decide-question 未経由回答が after-the-fact 集計で検出可能。違反 fixture の検出+落ちる実証(Route 書換で 0 件)
- FR-3c: 観測のみ — 回答の拒否はしない

## 実装方針

- 編集面は canonical の `packages/framework/core/tools/amadeus-log.ts` のみ(u3 境界)
- Route は optional `--decision-id` の有無からの**導出属性**(ladder iff decision-id)。新必須入力・新拒否経路なし
- 唯一の新規検査: 明示された `--decision-id` の `auto-decision-` 形式検査(loud error)
- 集計述語(human × semi/full)は同ファイルの export 関数として in-process テスト
- 属性同期面: `otel/event-registry.ts` の QUESTION_ANSWERED `optionalAttributes`(redaction safeKeys が registry 導出のため必須)、`knowledge/amadeus-shared/audit-format.md:150`

## テスト番号予約

当初予約 t484/t485 は fork base(a5f297c2b、PR #2439)で占有済みと builder が実装前停止で報告 → conductor 裁定(cid:code-generation:c1-tnnn-collision-on-regrounding の機械適用、両断面の空きを実測)により **t486(integration)/ t487(unit)** へ再予約。

## 検証コマンド

`bun run typecheck` / `bun run lint` / 新規+関連テスト(path 実在の機械確認+Ran 件数照合)/ `bun run build` → 追跡ファイル不変。coverage 実行は conductor 直列所有のため builder 側では実行しない。
