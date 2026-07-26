# Requirements — plugin-host-delivery

> 上流入力(consumes 全数): intent-statement、scope-document、business-overview、architecture、code-structure、team-practices
> 測定 ref: 本 worktree HEAD 断面(RE codekb observed `0d83aa48b`)。上流参照は awslabs/aidlc-workflows commit `29a31f78` 固定。

## 1. Intent 分析

利用者(7 ハーネスいずれかで Amadeus を使うチーム)は、上流 AI-DLC v2.3.0 と同等に「ホスト標準機構でプラグインをインストールするだけで、通常のワークフロー実行がプラグインのステージ・contribution で拡張される」体験を得たい(intent-statement の Problem/Target)。現状は codekb architecture.md「plugin 導入 UX と第7ディストリ面の現況」節の実測どおり、合成エンジンはテストからのみ到達可能で、配布は中立バンドルのみ、`--single` 手動起動が必須である。business-overview.md の業務境界(開発フレームワークの自己完結配布)は変えず、配布物の到達面だけを広げる。

## 2. 機能要件(FR)

各 FR は受け入れ基準(合否)をもち、実装ステージでテストへ trace する。scope-document IN 1-10 と 1:1。

### FR-1 ハーネス能力マトリクス(IN-1)

7 ハーネス(claude / codex / cursor / kimi / kiro / kiro-ide / opencode)について、

> 対象数の系譜: intent-statement(および旧 #1543)は起票時点の 6 ハーネスを列挙するが、その後 feasibility-questions Q1 のユーザー裁定(2026-07-26)で Kimi Code(#1522 で main 着地済みの第 7 面)を追加し 7 ハーネスに確定した。本書以降の「対象ハーネス」は常にこの 7 面を指す。第 7 面の実体は codekb code-structure.md の実測(harness/kimi/ 8 ファイル+`scripts/plugin-projection.ts` の SELF_INSTALL_HARNESSES への kimi 追加 = closed five)による。

(a) 配布形式 (b) trust 境界と承認方法 (c) compose trigger(イベント語彙の実測) (d) project root / plugin root / harness root の解決 (e) compose・doctor・drop の利用者操作 (f) ホスト機構が無い場合の明示 degrade 契約、を実測で確定した文書を作成する。
- 合否: 7 行全てが上記 6 列を持ち、各セルは実測(コマンド出力・実ファイル引用)か「⚠ 実装時実測が確定条件」の明示のどちらか。存在しない native 機構の仮定・silent skip は不合格(外部 seam 語彙の未実測確約禁止)
- 合否: 実測プローブは本番経路の前処理を全数再現する(cid:feasibility:probe-preprocessing-parity)

### FR-2 ハーネス別インストール可能成果物(IN-2)

`plugins/<name>/` の中立正本から、FR-1 で「対応」と確定した各ハーネス向けのインストール可能な成果物(host manifest、marketplace metadata、hook、プラグイン内容)を `scripts/package.ts` 系で投影する。
- 合否: 全対応ハーネスで投影成果物が期待位置に生成される(上流 t188 #1-2 相当)。ハーネス固有トークン・パスの置換が検証される(t188 #10 相当)
- 合否: **0-plugin build は現行 baseline と byte-identical**(t188 相当+scope-document T3)。`--check` が stale/orphan 投影を検出する
- 合否: 出力先の安全性(非投影ディレクトリ・symlink・file outDir の拒否)は上流 t188 #27-32 と同等の拒否集合を持つ

### FR-3 compose の利用者到達経路(IN-3)

- FR-3a **手動床**: 全ハーネス共通で、compose / doctor / drop を各 1 コマンドで実行できる CLI 入口を設ける。実装は既存 atomic compose engine(`scripts/plugin-composition.ts` — codekb architecture.md 実測の planPluginComposition / applyPluginPlan / planPluginDrop / diagnosePlugins / runRecovery)への薄い配線のみとし、合成ロジックの重複実装を禁止する
- FR-3b **自動 compose**: FR-1 で trigger 対応と確定したハーネスでは、セッションライフサイクルのフック(SessionStart 相当)から同じ compose 入口が自動起動する。フックは compose 入口を呼ぶだけで独自合成をしない
- FR-3c **冪等・no-op 高速路**: 再 compose は冪等。composition record が最新のときの自動 compose は早期 return し、セッション起動レイテンシへ体感退行を加えない(数値予算は build-and-test の実測で固定 — 未実測値を基準化しない)
- 合否(FR-3a): 手動床は 7/7 ハーネスの self-install ツリーから compose / doctor / drop を各 1 コマンドで実行でき、合成結果は engine 直呼びテスト(t252/t253 系)と同一(重複実装が無いことの実証)
- 合否(FR-3b): 自動経路は対応ハーネスで native hook の実起動テストにより検証(manifest 実在のみの verification theatre は不合格)
- 合否(FR-3c-冪等): 同一プラグイン集合で compose を 2 回実行した後の host bytes・composition record が 1 回実行後と byte-identical で、fragment が重複挿入されない(t188 #11 相当)
- 合否(FR-3c-no-op): composition record が最新の状態での自動 compose 経路が合成適用処理へ到達せず早期 return することをテストで固定(到達カウンタまたは書込不発生の assert)

### FR-4 再コンパイルと通常 scope 統合(IN-4)

compose 完了後、stage graph / scope grid が自動再コンパイルされ、(a) プラグイン新規ステージが compiled graph に載る (b) ステージの scope membership が grid へ反映される (c) produces / consumes / sensors / required_sections が set-union 合成される (d) prose fragment が指定 anchor へ決定的順序で挿入される (e) 複数プラグインの同一ステージ contribution が相互上書きしない(t188 #3-9, #13 相当)。
- 合否(a): compose 後の compiled stage graph にプラグイン新規ステージのノードが存在する(t188 #3 相当)
- 合否(b): プラグインステージ frontmatter の scopes 宣言が scope grid へ反映される(t188 相当。`scopes: []` の opt-in ステージは grid に冗長 SKIP セルを作らない — 既存 c9-tla-plugin-optin-grid 契約の維持)
- 合否(c): contribution の produces / consumes(required フラグ保持)/ sensors / required_sections が対象ステージノードへ set-union 合成される(t188 #4-7 相当)
- 合否(d): prose fragment が指定 anchor へ挿入され、複数 fragment は宣言順(order, bundle)どおりに並ぶ(t188 #8-9 相当)。未解決 anchor は dropped-with-log(t188 #14 相当)
- 合否(e): 2 プラグインが同一ステージへ contribute しても相互上書きせず両方の contribution が残る(t188 #13 相当)
- 合否(統合): graph 欠落・stale 時は self-heal(再 compile)または明示 fail-closed(t188 #12 相当)。engine の composition record 読取配線(codekb 実測: amadeus-graph.ts:1897 / amadeus-orchestrate.ts:901)を経由して通常 scope 実行からプラグインステージへ到達できる

### FR-5 doctor 可観測性(IN-5)

`--doctor` がインストール済みプラグイン、compose 状態、drift、drop された未対応 surface([degraded] は FAIL 行 / [advisory] は PASS(advisory) 行 — t188 #21-22 相当)を表示する。
- 合否: 非対応・degrade は必ず観測可能(silent drop 不合格)。diagnosePlugins の既存判定を CLI から到達可能にする

### FR-6 drop と baseline 復元(IN-6)

drop はプラグイン所有物と contribution だけを除去し、他プラグインの contribution を保つ。最後のプラグイン drop 後は 0-plugin baseline と byte-identical。
- 合否(選択除去): 2 プラグイン compose 状態から片方を drop した後、残存プラグインのステージ・contribution・fragment が全て残り、drop 対象の所有物が全て消えることをテストで固定(t188 #24 相当)
- 合否(baseline 復元): 最後のプラグイン drop 後の host ツリーが 0-plugin build と byte-identical(ハッシュ比較)
- 合否(安全): drift した共有ファイルは推測 drop しない(既存 engine 契約の維持)。compose 途中失敗時に host bytes / composition record / audit が不変(アトミック性 — 既存 t253 系の維持)

### FR-7 formal-model-check activation policy(IN-7)

結論: 【裁定待ち — application-design の ADR + 承認ゲート(intent-capture Q3 裁定)】
requirements が固定するのは裁定の判定条件のみ:
- (a) インストール自体を opt-in 境界とする(インストール済みなら `--single` を都度要求しない)
- (b) TLC 探索の高コストを理由に、既存 scope への無条件追加は不可
- (c) policy は決定的(同一入力 → 同一発動判定)で、発動条件・非発動時の挙動が文書化される
- (d) 上流の `when:` 未評価・plugin scope 未実装を前提にした Amadeus 独自設計とする
- 合否: ADR が上記 4 条件を満たし承認されていること。承認後の実装が `--single` なしでの到達経路を持つこと

### FR-8 上流 2.3.0 適合テスト(IN-8)

上流 t188 の 32 ケースを正準 ID とする追跡表(上流 ID・期待挙動・対応する Amadeus テスト・対応不能時の根拠)を作り、対応テストを green にする。
- 合否: 追跡表が 32/32 を被覆(採用 / 既存テストで充足 / N-A 根拠明示のいずれか)。ケースはハーネス非依存(compose 意味論 — 1 回実行)とハーネス依存(投影・trigger — 対応ハーネス別)へ層別され、CI 時間の増分が計測される
- 合否: 自動 trigger を提供できないハーネスは、文書化した手動 fallback を実行する E2E を持つ。未対応・degrade は期待値として固定(暗黙成功の扱い不合格)

### FR-9 利用者ガイド同期(IN-9)

`docs/guide/19-plugins.md` / `19-plugins.ja.md` を実装済みの install / doctor / drop 手順と一致させる(現状の「全ハーネスへ投影」記述 `19-plugins.ja.md:7` は実装確定後の実態へ更新)。
- 合否: docs 記載のコマンド・パスが実装と一致(既存 docs 参照整合ゲートの通過)。日英ペア同期

### FR-10 upstream sync レポート拡張(IN-10)

upstream-sync のレポートが、ファイル差分に加えて FR-8 適合テストの結果を追従状態の判定根拠に含める。
- 合否: レポート様式に適合テスト結果欄があり、判定がテスト green/red から導出される(検証劇場禁止 — status のハードコード不合格)

## 3. 非機能要件(NFR)

- NFR-1 **安全契約の維持**: trust grant・no-clobber・アトミック commit/recovery・drift 保護・path escape 拒否・same-name stage 拒否・unknown sensor 拒否は現行水準を下回らない(mutation 前拒否 — 上流 Lifecycle ケース群相当)。認可・監査面の変更は project.md Mandated の認可テスト群(directive contract / state transition / audit invariant / race / harness drift)で検証
- NFR-2 **起動レイテンシ非退行**: FR-3c の no-op 高速路を前提に、自動 compose 有効時のセッション起動が現行実測から体感退行しない。予算数値は build-and-test で実測固定(推定値を受け入れ基準にしない)
- NFR-3 **Bun-only**: 配布フレームワークへの runtime dependency 追加禁止(team-practices の対応表・project.md Forbidden)
- NFR-4 **保守性**: 投影は単一正本から派生し、件数固定の文言・台帳を新設しない(count-free 原則 — team-practices の是正実績)。core/harness 境界維持(harness 専用物は harness/<name>/ へ)

## 4. 制約

constraint-register T1-T9 / O1-O6 を全数継承(Bun-only、dist 生成物同期、0-plugin byte-identical、engine 単一実装、harness-tools 配置、drift ガード、TLC コスト、上流未実装の非追従、no-clobber、ソロ運用、walking-skeleton gate、Bolt worktree、release.yml 一本、7 ハーネス、認可テスト群)。

## 5. 前提

- A-1 全 7 ハーネスのフックアダプタから bun スクリプトを起動できる(feasibility A-1 — FR-1 で実測確定)
- A-2 compose engine は host 投影されたプラグインへ変更なしで適用できる(feasibility A-2 — walking skeleton で検証)
- A-3 同時プラグイン数は少数(lockfile 不要 — 非目標で固定)
- A-4 上流 commit `29a31f78` を追跡表の正準とし、上流の後続変更は本 intent では追わない

## 6. スコープ外

scope-document OUT のとおり: plugin 独自 scope / `adds.scopes` / `adds.requires_stage` / `when:` 一般評価 / agents・memory・knowledge 投影 / lockfile / #1380 skills 貢献面 / ミラー機構の不具合修正(#1547 / #1534 — scope-document 記載の verbatim)。加えて、scope-document 確定後の approval-handoff 中に起票した mirror-lifecycle 不具合 [#1548](https://github.com/amadeus-dlc/amadeus/issues/1548) も同じミラー不具合クラスとしてスコープ外(追加根拠: decision-log の運用イベント記録)。

## 7. 未解決事項(後続ステージへの明示委譲)

- FR-7 の結論(activation policy の具体)— application-design ADR ゲート
- FR-1 マトリクスの実測結果に依存する「対応ハーネス集合」の確定 — construction B1 の出力
- NFR-2 の数値予算 — build-and-test の実測固定
- compose CLI 入口の具体形(utility verb か独立ツールか)と各ハーネス trigger の eager/lazy — application-design(既存流儀からの導出)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-26T14:51:08Z
- **Iteration:** 1
- **Scope decision:** none

FR 骨格は scope-document IN 1-10 と 1:1 対応し上流参照・プレースホルダ運用は適切だが、(1) OUT 節の Issue 番号転記誤り(#1534→#1548)、(2) FR-3c/FR-4(a)-(e)/FR-6 のサブ挙動が合否基準に未展開、の Major 2 件により NOT-READY(Minor: intent-statement 6ハーネス表記との reconciliation 欠落)。

### Findings

- [Major] requirements.md:95 OUT 節の引用が scope-document.md:23 と不一致(#1547/#1534 → #1547・#1548 に転記変化)— mechanism-cite-verify-at-draft 違反、誤 Issue の除外誤認リスク
- [Major] requirements.md FR-3c/FR-4(a)-(e)/FR-6 のサブ挙動(冪等・no-op 高速路、graph 反映・scope membership・set-union・fragment 決定的順序・相互非上書き、他プラグイン contribution 保持)が合否基準として未展開 — テスト可能性不足
- [Minor] FR-1 の 7 ハーネスと intent-statement の 6 ハーネス列挙の差異が requirements 内で reconciliation されていない

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-26T14:54:25Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Major 2 件(Issue 番号不一致、FR-3c/FR-4/FR-6 の合否基準未展開)と Minor 1 件(6→7 ハーネス reconciliation)は是正済みで、合否基準はテスト可能な粒度。新規 Minor 1 件(code-structure の実参照欠落)は指摘後に conductor が実参照追記で即時是正(是正任意の軽微指摘)。

### Findings

- [Minor] requirements.md:3 上流入力ヘッダーの code-structure が本文未参照の装飾トークン — 指摘後に対象数の系譜注記へ実参照(harness/kimi 8 ファイル・SELF_INSTALL_HARNESSES)を追記して解消
