# Scope Document — autonomy-reachability(#2378)

上流入力(consumes 全数): intent-statement(../intent-capture/intent-statement.md — Problem/Success Metrics を境界の導出元として実読)。feasibility-assessment / constraint-register は self-feature スコープで feasibility が SKIP のため未生成(設計どおりの不在)— 制約は Issue #2378 実測・クロスレビュー収束コメント・engine 既存契約(FR-GRT-006 等)から直接取り込んだ。

## In(スコープ内)

D1 裁定(`must-1to5-should-6`)に基づく:

1. **起動宣言の実効化(Must)** — `--autonomy` 起動宣言が Ideation 最初の質問より前に mode を有効化することの実測固定。birth 同時宣言(現状 `--autonomy needs an active intent` で拒否 — 本 intent 起動時に実測)の意味論は仕様裁定事項として requirements で扱い、ユーザーへエスカレーションする
2. **裁定不能理由の可視化(Must)** — `SCOPE_OUT` / `MODE_REQUIRES_HUMAN` の audit イベント化+`preview-autonomy` 出力への「この grant/mode で自動裁定されない対話種別」列挙。鏡像面として state 投影(`Intent Autonomy Mode`)と canonical audit の非対称是正(本 intent 起動時に実測: audit=semi コミット済みでも state=none 残存)
3. **engine 未経由質問の観測可能化(Must)** — `decide-question` 未経由の人間直接質問を検出できるイベントまたは sensor。本 intent 内で conductor 自身が違反を1回実測済み(§13 選定を AskUserQuestion へ直接提示 — ユーザー指摘で発覚)
4. **回帰計測(Must)** — ベースラインは第三者再現可能な C1(508/178/686)・C3 値。測定述語は新イベント形(`INTENT_AUTONOMY_TRANSACTION_COMMITTED`)対応へ更新し、計測 ref を明記する
5. **導線の全面追記(Must)** — SKILL.md 全ハーネス正本(8面)+`amadeus-utility.ts` help+README+`docs/reference/24-intent-autonomy.md` 対訳への `--autonomy` 追記、`stage-protocol.md` の decide-question 手順への semi 追記(:135 が full 限定)、導線パリティを固定する回帰テスト
6. **plugin stage 文書の drift 是正(Should)** — advisory ルーティングは #2318 で実装済み。`plugins/formal-model-check/stages/formal-model-check.md:27`・`plugins/pr-convergence/stages/pr-convergence.md:27` の「never runs it automatically」文言を出荷コードの実挙動へ整合

## Out(スコープ外)

- grant 発行儀式(FR-GRT-006)の変更 — 一切緩めない(#2253 既決)
- semi の再定義そのもの — #2253 で着地済み。本 intent は到達性のみ
- 質問解決はしごの仕様変更 — 現仕様(FR-DEC-007、unreviewed 非同期レビュー)はユーザー裁定(2026-08-07)で維持
- #1241(engine 外の人間ゲート待ちの一級状態化)・#1647・#1566 の本体 — 隣接 Issue として別対応
- 旧挙動の互換レイヤー・移行シム — 追加しない(org.md Forbidden)

## 境界の根拠

- In 1〜5 の Must 確定と 6 の Should 降格は D1(AUTO_DECIDED、unreviewed)
- 実施順序は D2(dependency-first): 5(導線)→ 2・3(可観測性)→ 1(実測固定)→ 4(回帰計測)、6 は随伴
- engine 側の autonomy 実装(SemiAuthority・5段梯子・advisory ルーティング)は origin/main に存在し回帰テスト(t449〜t453)も実在 — 本 intent の重心はコード新設ではなく導線・可観測性・計測
