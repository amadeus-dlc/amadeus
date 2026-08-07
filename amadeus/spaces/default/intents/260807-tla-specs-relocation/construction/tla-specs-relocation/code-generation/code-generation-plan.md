# Code Generation Plan — Unit tla-specs-relocation

上流: `inception/requirements-analysis/requirements.md`(FR-1〜9)、`functional-design/{domain-entities,business-rules,business-logic-model}.md`(E-1〜6 / BR-1〜15 / L-1〜6)。トレーサビリティは FR 番号で示す(user-stories は scope 上 SKIP — FR をトレース先とする)。Test Strategy: Comprehensive。

## 前提(実測済み・RE scan より)

- 変更クラス A(move)= `specs/tla/` 9ファイル、B(path-rewrite)= core 6 + plugin 10、C(digest re-pin)= model-map path 5箇所、D(docs)= 8ファイル+amadeus-files 英日、E(test)= 51ファイル、F(no-touch)= ci.yml / scripts / .gitignore / dist / 歴史記録
- テスト採番 t481 以降(BR-15)。正本は `packages/framework/core/`、plugin 鏡像は生成物(BR-11)
- seam: Resolver は `./amadeus-lib.ts` を import せず `amadeus/active-space` カーソルを node:fs で直接読む(不在・不読・不正値は default、safe-name 検証を複製 — isSafeWorkspaceEntryName 相当)

## 実施ステップ

- [ ] Step 1: 移設(FR-1) — `git mv specs/tla amadeus/spaces/default/specs/tla`(9ファイル)+ 自己参照コメント5行の書換(cfg:2 / tla:8 / AsImpl:17 / Core:11,539)+ model-map.json の path 値5箇所を `amadeus/spaces/default/specs/tla/...` へ(identity 不変、BR-7/BR-8)
- [ ] Step 2: E-1 SpecRootResolver の実装(FR-2) — `packages/framework/core/tools/amadeus-formal-verif-model-map.ts` に正本実装。node:fs のみ追加 import。戻り値 { specsRoot, tlaDir, modelMapPath, evidenceRoot }、legacy 検出(E-4/BR-4/BR-6: `<root>/specs/tla` に .tla または model-map.json がある / 新旧両存 → 移設手順付きエラー)、L-1 決定木どおり
- [ ] Step 3: E-2 CanonicalSpecPaths(FR-5) — 同ファイルの正準パス生成(`tlaModelPath`/`tlaCfgPath` ピン :335/:337、auxiliaries :247/:250/:272)を新規約へ。旧パス値の map は reject(BR-13c)
- [ ] Step 4: activation 配線(FR-3/E-3/E-6) — `amadeus-plugin-activation.ts`: `specRootForHost` を Resolver 委譲に置換(:100-102)、watch glob を `tla/**` に(:42、基底は所有ルート)、advisory 文言のターゲット表記を新パスへ(:229/:231/:233/:304-305)、`amadeus-advisory-choice.ts:894-895` も同様
- [ ] Step 5: sensor 配線(FR-2/FR-7) — `amadeus-sensor-model-completeness.ts`: MODEL_MAP_RELATIVE_PATH(:37)と基準解決(:247-250)を Resolver 委譲へ、:507/:535/:760 のテンプレート生成を新パスへ。`sensors/amadeus-model-completeness.md:8` の matches glob を固定深度形 `**/{amadeus/spaces/*/specs/tla/**,...}` へ(実装側エントリは維持、:24 も確認)
- [ ] Step 6: plugin tools 配線(FR-2/FR-4) — `tla-model-loader-internal.ts`(walk-up root 判定 :134-153 から specs/tla 存在チェック :140 を外し Resolver 委譲、:186/:344/:364/:367/:371)、`tla-module-deps.ts`(:4/:38/:59)、`ci-model-check-domain.ts:189`(bind mount src/dst)、`run-model-check-diagnostic.ts:217`、`tla-applicability.ts:361`、`tla-authoring.ts:449` + :189 fallback(留保1)、`tla-evidence.ts:434`(DEFAULT_STORE_ROOT → Resolver evidenceRoot、BR-10 watch 除外維持)、ステージ `formal-model-check.md`(:12/:34/:45-46)、`README.md`(:16/:70/:91)
- [ ] Step 7: core `tla-module-deps.ts`(:4/:38/:59)の path-rewrite
- [ ] Step 8: 鏡像・dist 再生成(BR-11/BR-14) — `bun run build`(plugin 鏡像 byte-identical 再生成 + dist/self-install 再生成。追跡ファイルの不変確認)
- [ ] Step 9: docs(FR-8) — `docs/reference/21-formal-model-following.{md,ja.md}`、`22-formal-model-supply.{md,ja.md}`(tla-evidence 含む)、`07-sensor-system.{md,ja.md}`、`docs/guide/19-plugins.{md,ja.md}`、`docs/amadeus-files.{md,ja.md}` の layout へ `specs/` 追記(英日ペア同期)
- [ ] Step 10: 既存テスト更新(FR-9) — 51ファイル(unit 16 / integration 30 / e2e 2 / support 2 / harness 1)の fixture・期待値を新パスへ。t320(drift 発火)・t382(実レイアウト)・t403(loader)・t-formal-verif-* を含む
- [ ] Step 11: 新規テスト t481+(BR-13/BR-15) — (a) legacy 配置で fail-closed(LegacySpecError)、(b) 新パス spec 変更で drift advisory 発火、(c) 旧パス値 model-map の validator reject、(d) Resolver の space 解決(カーソル不在→default、不正値→default、新旧両存→エラー)
- [ ] Step 12: 検証 — lint / typecheck / 関連テストスイート green / 落ちる実証(a)(b)(c) / 隔離2回ビルド再現性・source-only:check・グラフ不変量(FR-9、BR-14)
- [ ] Step 13: PR 作成 + pr-convergence ループ(report は plugin CLI が機械生成 — 手書き禁止)

## 検収基準(このステージの done)

- 全域 grep で旧パス参照残存 0(歴史記録・派生キャッシュ・生成物を除く)
- 関連テスト green(ベースライン 65 pass からの搬送 + 更新対象スイート)
- lint・typecheck green
- build 再現性・source-only:check・グラフ不変量 green
- pr-convergence-report.md が plugin CLI により生成されている

## 計画承認

autonomy full(grant `intent-grant-648b88290755876fdc10272210387e4a`)の下、agent recommendation により承認済みとして進行する — 計画は承認済み requirements・functional-design(§12a READY)の直接の写しであり、新たな意思決定点を含まない。最終ステージゲートは人間に提示する。
