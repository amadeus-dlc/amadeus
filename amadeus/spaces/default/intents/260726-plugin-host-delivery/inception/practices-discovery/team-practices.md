# Team Practices — plugin-host-delivery

上流入力(consumes 全数): code-structure.md, technology-stack.md, dependencies.md, code-quality-assessment.md, architecture.md, business-overview.md

## 判定: 是正 1 件(既存 Mandated の陳腐化件数)を除き変更なし

practices-discovery:c1 に従い、同日の RE codekb(architecture.md「plugin 導入 UX と第7ディストリ面の現況」節、code-structure.md の kimi 8 ファイル+plugin-projection closed five 実測、technology-stack.md / dependencies.md のルート依存変更なし所見、code-quality-assessment.md の新規テスト 29 件・perf ゲート再設計 #1535、business-overview.md)を証跡スキャンとして代用した。affirmed 済み team.md / project.md との差分ギャップは、下記の件数陳腐化 1 件を除き検出されなかった。

## 本 intent に適用される既存 practices の対応表

| 領域 | 既存 practice(出典) | 本 intent での適用 |
|---|---|---|
| 編集正本 | project.md Way of Working + Forbidden(dist 手編集禁止・正本/配布/self-install の同一変更同期) | plugin 正本 = `plugins/<name>/`、投影は `scripts/package.ts` / `plugin-projection.ts` の拡張として生成。ハーネス投影後のプラグイン成果物も drift ガード対象へ編入 |
| trust / 合成安全 | org.md Forbidden(検証劇場)+ project.md Mandated/Forbidden(affirmed 2026-07-24/25 の auto-mirror・認可テスト群)+ tla-plugin 系 Corrections(c1/c8/c9 — plugin-root 相対パス契約、compose/compile/run 三層 trust、opt-in stage の scope-grid 非汚染) | compose は既存 atomic engine のみ。native hook の実起動テスト必須(manifest 実在だけの verification theatre 禁止) |
| ハーネス境界 | project.md cid:code-generation:harness-tools-placement(core/tools への harness 専用物配置禁止) | ハーネス別 hook・manifest は `harness/<name>/`+harnessFiles 投影に置く |
| テスト | project.md Testing Posture + fs-tests-integration-first + corpus-sweep-for-new-guards | 適合テストは compose 意味論(ハーネス非依存)と投影・trigger(ハーネス別)へ層別。新設ガードは落ちる実証+corpus sweep 両側 |
| CI | ci-pipeline:c2(既存 workflow を唯一の正本として拡張) | 適合テストは既存 tests/run-tests.sh 4 層へ編入(新規 workflow を作らない) |
| リリース | project.md Mandated(release.yml 一本) | 本 intent の PR はバージョン面に触れない |
| 言語 | CLAUDE.md 言語規約 | コード・コミット英語、record 日本語、docs 日英ペア同期 |

## ギャップ検討の記録

- **是正 1 件(採用提案)**: project.md Mandated(`project.md:111`)「ALWAYS update the framework source, **all six harness distributions**, …」の「six」が Kimi 追加(#1522、RE codekb architecture.md の第7ディストリ面実測)で陳腐化。cid:code-generation:count-comment-sync-on-catalog-change の count-free 優先に従い「all harness distributions」への文言是正を提案(discovered-rules.md に成文)
- 「プラグイン配布の新経路」を新規 practice にするか検討 — 配布経路自体の規律(正本/生成物同期・drift ガード・trust)は既存 practices が既にカバーしており、方式の具体はこれから requirements/design で決める段階。practice の先行成文は早期断定になるため見送り(本 intent 完了時の §13 で回収)
