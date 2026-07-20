# Code Generation Plan — fix-1279-diary-autogen-guard

上流入力(consumes 全数): requirements.md(per-unit 設計6点は bugfix degrade の consumes_absent どおり不在 — design 委譲分は本 plan が確定)

> 測定 ref: base = builder fetch 時の最新 origin/main。修正面 = core 正本(orchestrate.ts/lib.ts の diary 経路)+tests/+dist×6/self-install 4 の再生成(11コピー同期)。

## 設計確定(E-DAGRA1〜3+E-DAGRAX 追認の範囲内 — アンカー調達の design 委譲分を確定)

1. **アンカー調達 = 発行経路の単一解決値の明示受け渡し(二重解決の排除)**: run-stage directive を emit する各発行経路は、directive 構築に使った **recordPrefix(=当該発行の intent 解決値)そのもの**を ensureStageDiary の駆動アンカーとして受け渡す。diary 側で cursor/pd を**再解決しない**(audit の --intent 明示アンカーと同じ「解決は一度・下流は受け渡し」原則への対称化)。具体形:
   - `ensureStageDiary(projectDir, memoryPathRel)` の呼び出しを、guard 判定と memory_path 構成が**同一の recordPrefix 値**から導出されることを型で保証する形に整理(例: `ensureStageDiaryForDirective(projectDir, directive)` — directive.memory_path が slug を含む場合のみ書く判定を **memory_path 自体の形**(intents/<slug>/ セグメント実在)で行い、cursor の別ルート解決を経路から排除)。
   - これにより「memory_path は正しいが diary だけ不発」というクラス(二解決値の乖離)が構造的に不能になる。
2. **バグ skip の loud 化**(FR-2+e4 留保の机上トレース実施): guard skip 時に「record dir が1つ以上実在するのに recordPrefix null」なら stderr advisory を1行出す。**到達可能性トレース(留保履行)**: アンカー化(上記1)後も、発行経路の入口(next の Branch 分岐前)で recordPrefix null×intent dir 実在の組は **--single/no-state jump 経路(orchestrate.ts:2241/:2412)と cursor 破損時の main 経路入口**で到達可能 — 残余異常経路が実在するため advisory 分岐は**書く**(#1258 B 防御層と同型の defense-in-depth、E-DAGRA2 留保の条件成立)。トレース詳細は code-summary に記録。
3. **正当 skip の保存**: intent record dir が 0 件(birth 前 shell)は従来どおり無音 skip(NFR-1)。

## テスト要件(FR-4)

- integration 層(fs-tests-integration-first): scratch project 構成で「多 intent record+cursor 不在 pd」を fixture 注入 — 修正前 = diary 不発(現行バグ再現)/ 修正後 = 「intent 実在 ⇒ diary 生成 or loud advisory」の不変条件 pass の両側実証。
- 正当 skip(record 0件)不変・正常経路(cursor 解決可)不変・冪等(既存 diary 非上書き #1080)不変。
- advisory の stderr 出力検査(stdout の directive JSON 汚染なし — NFR-2)。
- 落ちる実証: E-GMECG 追補準拠(fix コミット後・SHA 明示復元)。既存 t-ensure-stage-diary / t72 / t201 グリーン維持。

## 検証

typecheck / lint / --ci / dist:check / promote:self:check(**core 正本につき bun scripts/package.ts+promote:self の再生成必須**)/ push 前 lcov 未カバー 0。

## 実装体制

builder subagent(worktree 隔離)1名 — 修正コードは環境非依存(テストが条件を明示注入)につき隔離で問題なし。plan 全文はプロンプトへ焼き込み(c2 追補2)。resume 時は c2 追補(新規 Agent 優先)。
