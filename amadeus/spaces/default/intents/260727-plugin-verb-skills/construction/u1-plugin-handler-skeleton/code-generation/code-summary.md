# Code Summary — U1 u1-plugin-handler-skeleton(Bolt 1)

上流入力(consumes 全数): code-generation-plan.md 経由で business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、unit-of-work.md、requirements.md の全設計を消費(下記の実装対応参照)

## 実装結果(commit b04948acb、branch bolt/u1-plugin-handler-skeleton)

| 変更 | 内容 | 設計対応 |
|---|---|---|
| amadeus-utility.ts | PluginDelegateDeps / defaultPluginDelegateDeps(Bun.spawnSync、"inherit"、exitCode ?? 1)/ handlePluginDelegate。case "plugin" は1文・匿名増ゼロ | business-logic-model.md・domain-entities.md・business-rules.md BR-U1-3、security-design.md(配列固定)、performance-design.md(追加機構ゼロ) |
| usage 2面+pin | die 文字列へ `\|plugin`、HELP_TEXT_TAIL へ `plugin <verb>` 行、t31-help の UTILITIES 配列へ追加 | business-rules.md BR-U1-2(三重同期 — pin の実在面は t31-help:151-154 の UTILITIES 配列のみが新トークンを実被覆。t226:274 は固定 prefix の toContain で `|plugin` 追加を検査しない(非 pin — reviewer 指摘で精密化)。t67 は誤引用だった) |
| t344(unit 13)/ t345(integration 6) | fake spawn 3系+実 spawn 縦断 | business-rules.md BR-U1-4、requirements.md FR-2d |
| dist×7+self-install | 再生成・drift check green | unit-of-work.md 完了条件 |

## 検証エビデンス(builder 実測 exit code、conductor 裏取りは §12a 後の PR CI で二重化)

package/promote/typecheck/lint/dist:check/promote:self:check = 全 exit 0。`bash tests/run-tests.sh --ci` = exit 0(615 files / 8438 assertions / 0 fail)。新規テスト 16 pass。局所 lcov: handler 本体+配線行の全 DA 正(未カバー 0)。

## 申告済み適応(2件 — 権威一次証拠による機械執行)

1. usage pin の実在面: 指示の「t67」は誤り(t67 に usage assertion なしを grep 実測)→ 実在 pin(t31-help:151-154 UTILITIES / t226:274 前方一致)へ適用
2. help 行の整列: 既存 18 文字パディング様式を優先し `plugin <verb>` 形へ

## 引き継ぎ

- coverage registry の新 subcommand `amadeus-utility plugin` は UNCOVERED 登録(registry の cli 判定は shipped spawn テストのみ計上する仕様)。ratchet は covered 数不変で green。dist spawn テストの追加可否は Bolt 4 までの残課題として記録(必要なら +1 固定の副作用込みで別判断)
