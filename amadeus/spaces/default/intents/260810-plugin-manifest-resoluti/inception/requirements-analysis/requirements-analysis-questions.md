# Requirements Analysis — 明確化質問

Intent: `260810-plugin-manifest-resoluti` / Scope: `self-fix` / Depth: Minimal
Focus: [Issue #2823](https://github.com/amadeus-dlc/amadeus/issues/2823)(ミラー [#2829](https://github.com/amadeus-dlc/amadeus/issues/2829))
観測 ref: observed = `7b9391be2db4fad791d637293ea442d5a1462bac`(= origin/main)

## 回答の裁定・承認証跡

- **承認(autonomy=full グラントによる自動裁定)**: `2026-08-10T11:02:08Z` — グラント `intent-grant-3f36d239bbdc1e61e34fe015614c8127`(発行済み・allowedInteractionKinds に `stage-gate / phase-gate / walking-skeleton / question` を含む)の記録済み人間宣言に基づく。`question` の自動決定は発行済みグラントの執行であって推論による権限拡大ではない
- 各回答は Issue #2823 本文(完了条件・原因の所在)と RE scan 記録(`codekb/amadeus/re-scans/260810-plugin-manifest-resoluti.md`)の PROVEN 事実から一意に導かれるものであり、`cid:requirements-analysis:c1-xrev-verdict-not-ruling-authority`(Issue 本文が canonical を逐語指名する場合は執行事項)に従う
- 上流入力(consumes 全数): `codekb/amadeus/business-overview.md` / `codekb/amadeus/architecture.md` / `codekb/amadeus/code-structure.md` — 各ファイル現在節の PROVEN 事実(所在非対称・消費者グラフ・dogfood masking)を前提実測として参照

---

## 前提となる実測事実(RE ステージの成果、すべて PROVEN)

- 非対称 1: manifest 読取は `<projectRoot>/plugins/<name>/plugin.json` 固定(`amadeus-advisory-declaration.ts:295-297`)で、composed 面へ `plugin.json` は配送されない(`amadeus-plugin-compose.ts:895` ownedPaths = stages+tools のみ)。不在は `:313` で無音 `return []`(監査・ログなし)
- 非対称 2: evaluator argv は root-relative(`plugins/formal-model-check/plugin.json:61`)、`spawnSync` の cwd = projectRoot(`:350`)。engine 側にも同型の直書き argv あり(`amadeus-advisory-choice.ts:925`)
- 配送規約の固定元: #2790 要件(`260810-plugin-harness-dir-token/.../requirements.md:84/:86/:90`)は拡張子限定分岐の維持・plugin.json を composed 面へ配らない設計を明記
- **新規実測(RE scan)**: `install <path>` verb の persistentInstall 腕(`amadeus-plugin.ts:1117-1118`/`:1160`)は bundle 全文(plugin.json + tools)を `<projectRoot>/plugins/<name>/` へ永続化する。すなわち文書化経路には (a) folder-drop → manifest 不在(fail-open)、(b) install verb → 両方解決(正常)、の 2 腕があり、`requirements.md:90`「repo-root plugins/ を作る運用は想定しない」は install verb 腕によって事実上 falsify されている
- 無音 degradation は `declarationFor` 系(`:393` → `declaredFormalCheckArgv`/`declaredHandoffStage` → `amadeus-advisory-choice.ts:740/:960`)にも同型に存在
- 既存テストは全て dogfood layout(t445:224-226 / t526:59-61 / t528:103-105)。t445:155-160 は無音 fail-open を契約として pin している
- 「解除経路のない hold」は過大: 人間の defer-with-risk は escape hatch として残存(`amadeus-advisory-choice.ts:983-984`)

---

## Q1. 修正軸の裁定(本 intent の中核)

`self-fix` は設計段(application-design)を実行しないため、この裁定はここで確定させる。

- A. **読取側修正** — manifest 解決を多面化(authoring `plugins/` → staging `.amadeus-plugin-src/` の順で探索)し、argv は「実際に見つかった manifest の plugin ルート」基準で解決する。配送規約(#2790 の拡張子限定設計)は不変
- B. 配送側修正 — composed 面へ plugin.json を配送する(#2790 `requirements.md:84/:86` の設計固定と衝突)
- C. 併用 — 読取側 + 配送側の双方を変更
- X. Other (please specify)

[Answer]: A — Issue 完了条件2 の候補「manifest の読取先を composed/staging 面へ改める」「evaluator argv のパス解決規約を定義する」と一致。#2790 で固定された配送設計を維持しつつ、読取規約を配送規約へ整合させる方向が両規約を両立させる唯一の軸(RE scan N 系知見)。B は設計固定と衝突、C は過剰

## Q2. 無音 fail-open の loud 化の形

- A. **可観測化のみ** — manifest 不在時に診断(監査イベントまたは stderr 警告)を出す。fail-open セマンティクス(advisory を発火させない)自体は維持し、「保護が効いていると信じる偽 green」を検出可能にする
- B. fail-closed 化 — manifest 不在をエラー停止にする
- C. 現状維持 — 無音のまま
- X. Other (please specify)

[Answer]: A — Issue 完了条件2 の候補「manifest 不在の無音 `return []` を loud 化する」に一致。B は plugin 未導入環境や段階的導入を破壊しうる過剰な挙動変更。C は Issue の中核主張(偽 green)を未解決に残す。t445:155-160 の pin は「無音であること」ではなく「advisory が発火しないこと」を本質として書き直す

## Q3. evaluator argv のパス解決規約

- A. **plugin-root-relative 規約** — manifest 内 argv の相対パスは「その manifest が実際に見つかった plugin ルート」からの相対とし、`plugin.json:61` を `tools/tla-authoring.ts` へ修正。engine 直書きの `:925` も同一規約に揃える
- B. `{{HARNESS_DIR}}` トークンの `.json` への拡張 — #2790 の拡張子限定設計と衝突(Issue も「要裁定」と注記)
- C. 絶対パス規約 — 配布時にパスが確定しないため不可
- X. Other (please specify)

[Answer]: A — dogfood(authoring tree)と consumer(staging tree)の双方で argv が解決する唯一の規約。B は #2790 `requirements.md:84` の設計固定と衝突するため却下。規約確定後は Q5 のガードが恒久赤にならない(Issue 完了条件3 の注意書きの解消)

## Q4. ドリフトガードの形(Issue 完了条件3)

- A. **新規述語** — `plugins/**/plugin.json` 内の repo-root-relative argv(`"plugins/` 始まり)を検出するガードを追加。Q3-A 確定後は現行ソースが適合するため恒久赤にならない
- B. 既存ガード(t377 / boundary-guard)の述語拡張
- C. 今回は見送り
- X. Other (please specify)

[Answer]: A — Issue 完了条件3 の要求どおり。既存ガードは corpus/述語が別目的(t377 は scripts/ トークン走査)であり、混ぜると責務が曖昧になる。Q3-A の規約と対になる「規約の機械的執行」として独立述語が明確

---

## 問票外の記録事項(質問ではなく執行記録)

- **#2267 との関係**: RE scan 実測により asymmetry 1 と同根だが、argv 非対称・fail-open/fail-closed 分析・`:925`・`declarationFor` 系の無音退化を含まない。別 Issue 維持・リンクとし、本 fix 着地時に #2267 の重複 close をユーザーへ提案する(close 判断はユーザーのみ: `cid:requirements-analysis:issue-selection-user-decides`)。本 intent のコード変更範囲には含めない

回答後の追加ラウンド: なし(曖昧語・矛盾の走査で該当 0 件)


