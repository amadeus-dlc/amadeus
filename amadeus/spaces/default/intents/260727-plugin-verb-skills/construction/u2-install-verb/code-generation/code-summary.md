# Code Summary — U2 u2-install-verb(Bolt 2)

上流入力(consumes 全数): code-generation-plan.md 経由で business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、unit-of-work.md、requirements.md を消費(実装対応は plan の各項と1:1)

## 実装結果(branch bolt/u2-install-verb、PR #1616。実装 6d2e8fbec+テスト c70c2dc2b+リナンバ adcd4862f/66adf5fa2/f7c4d370f)

- amadeus-plugin.ts: parseInstall / handleInstall / installed kind / failure.stage "install" / PluginCliDeps へ stagingEntryState・copyPluginSource の2 seam(canonical 2引数 — swap は既定実装の内部契約)
- scripts/plugin-projection.ts: installVerbCommand+2クラス文言、dist/plugins 6面再生成
- テスト t353(integration 10 tests / 42 assertions — 設計 BR-U2-6 の6ケース+拒否系4)。既存 deps bag 5ファイルへ seam 伝播

## 検証エビデンス(builder 実測、conductor は PR CI で二重化)

package/promote/typecheck/lint/dist:check/promote:self:check/complexity = 全 exit 0。patch gate = PASS(95/95 covered)。t341 E2E green。coverage:ci のローカル 1 fail は t-team-up-codex-resume(環境依存フレーク、本変更と無関係 — 初回フル実行では 0 fail)。

## 申告済み適応

1. compose 委譲を if-stale 意味論で実装(`composeOutcome: "noop"` の到達可能化 — 承認型の2値が ifStale なしでは死枝になるため。conductor 裁定: 承認済み型契約の実現に必要な機械的解釈として受理、FR-1e と整合)
2. stdout の staging 先は相対表記(型は設計どおり)
3. t348→t350→t353 の2段改番(main 前進の t348/t349 着地+並行 Bolt 3 との t350 重複 — swarm-test-number-reservation の実例)

## 再接地

origin/main(mirror 系前進)へ rebase 済み・実 diff 非交差確認・dist 再生成・全検証再実行済み(base-advance-regrounding 準拠)。
