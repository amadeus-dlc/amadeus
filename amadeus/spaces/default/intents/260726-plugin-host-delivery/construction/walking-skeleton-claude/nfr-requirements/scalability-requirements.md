# スケーラビリティ要件 — U2 walking-skeleton-claude

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## プラグイン数少数前提(N/A 寄り)

requirements の A-3(同時プラグイン数は少数、lockfile 不要 — 非目標で固定)を継承する。business-logic-model のフロー 1〜3 は `discoverPlugins → inspectPlugin × n → planPluginComposition` の同期走査で、n は少数前提の逐次処理である。したがって、多数プラグインへの水平スケール・並行合成・ロック機構は本 intent の非目標であり **N/A** とする(常駐 service 向けの水平スケール・オートスケールを機械適用しない)。

- 合否: 拡張性固有の受け入れ基準は設けない。プラグイン数少数前提(A-3)を反証可能な N/A 根拠とする

## 冪等性という拡張軸

U2 で保証すべき「反復への耐性」は台数スケールではなく **冪等性** である。business-rules の BR-U2-2(冪等)/ BR-U2-8(baseline 復元)のとおり、同一プラグイン集合での再 compose は host bytes・composition record を byte-identical に保ち、最後のプラグイン drop 後は 0-plugin build と byte-identical に復元する。合成の反復・追加・除去が状態を単調に汚染しないことが、スケール機構の代替となる決定的境界である。

- 合否(冪等): compose 2 回実行後の host bytes・composition record が 1 回実行後と byte-identical、fragment 重複挿入なし(BR-U2-2 / FR-3c-冪等)
- 合否(baseline 復元): 最後のプラグイン drop 後の host ツリーが 0-plugin build と byte-identical(hash 比較 — BR-U2-8 / FR-6)

## 単一正本からの投影(保守面のスケール)

business-logic-model のフロー 5(claude 最小投影)は中立正本 `plugins/<name>/` から claude 面を派生する。technology-stack のとおり `scripts/package.ts` の manifest-driven 投影は既存機構であり、ハーネス面の追加は正本→投影の再生成で吸収する。requirements NFR-4(単一正本派生・count-free)のとおり、面数の増加に対して件数固定の台帳を新設しない。

- 合否: claude 面投影は単一正本から派生し、`bun scripts/package.ts` の既存経路に編入する(BR-U2-9 の dist 同期で担保)
