# Code Summary — Bolt 2: fix-2330-advisory-store-recovery

上流入力(consumes 全数): `requirements`(注: stage frontmatter の `unit-of-work` consume は units-generation SKIP により設計どおり不在)(`amadeus/spaces/default/intents/260807-failclosed-recovery-path/inception/requirements-analysis/requirements.md` — FR-2.1〜2.6 / AC-2a〜2e を実装と検証の合否面として消費)。

## 実装結果

- **ブランチ**: `bolt/fix-2330-advisory-store-recovery`、head `82d5235d2f01577e7edb81646711d83fc0a24219`(**再接地後** base = `edfee5818` — Bolt 1 の2 PR 着地を取り込み。rebase 競合ゼロ、merge-tree 非破壊プローブでマーカー 0 を事前実測、3コミット保持)
- **コミット**: `6cb9bb4d8` fix(advisory): add a recovery verb for schema 1 advisory choice stores / `bce4adb00` test(advisory): record t470 as a deterministic CLI spawner / `7b8b5ac60` fix(advisory): defend a receipts-only store from cross-intent recovery
- **verb**: `recover-schema-1`。CLI 契約: `bun .claude/tools/amadeus-advisory-choice.ts recover-schema-1 [--project-dir <path>]` — 成功時 stdout 1行 `{"recovered":true,"pending_salvaged":N,"receipts_dropped":M,"re_presentation_required":bool,"run_now_receipts_reset":K}` exit 0 / 失敗時 stderr 理由 exit 1
- seam: `recoverSchema1AdvisoryStore` / `recoverSchema1AdvisoryStoreCli`(全ロジック in-process 被覆、module 行は dispatch 1行のみ = allowlist 1エントリ)

## FR 対応

| FR | 実装 |
|---|---|
| FR-2.1 | `parseStore` 無変更。salvage 別関数(`parsePending` 再利用)。schema 1 receipts は翻訳せず破棄 |
| FR-2.2 | 単一 store のみ(`--project-dir`、既定 cwd 解決 active intent)。探索なし |
| FR-2.3(精密化込み) | pending identity 検証 + **receipts-only store では `foreignReceiptIntentRuns` が receipts の `identity.intentRun` を防御的に読み不一致を loud 拒否**(読めない receipt は何も返さない = 拒否を足すことはあっても許可を広げない)。実装時精密化はユーザー承認(2026-08-07)済み・requirements FR-2.3 に反映済み |
| FR-2.4 | dropped 件数 / re_presentation_required / run_now_receipts_reset を出力 |
| FR-2.5 | t458 無改変 green(diff --numstat 0行)。allowlist 1エントリ(:1629 に一意解決を実測 — 当初 :1614、行シフト後の再解決を確認)。EXPECTED_NONE_TO_CLI 追記 |
| FR-2.6 | 12-state-machine.md / .ja.md / audit-format.md の3面に移行経路を記述(FR-2.3 精密化の帰結で docs 記述も同一コミットで整合) |

## TDD Red 実測(assertion 実文、5サイクル)

1. `SyntaxError: Export named 'recoverSchema1AdvisoryStore' not found`
2. FR-2.4: `expect(received).toEqual(expected)` — `- "formalCheckAttemptsReset": 2 / - "rePresentationRequired": true`
3. FR-2.3(pending): `Expected: false / Received: true`(回復が黙って通っていた)
4. `SyntaxError: Export named 'recoverSchema1AdvisoryStoreCli' not found`
5. FR-2.3(receipts-only 精密化): `Expected: false / Received: true`(t470 「pendingが0件でもreceiptsが別intentのものならloudに拒否される」)

申告: 上記5サイクル以外の9テストは駆動済み実装の帰結を固定する characterization(初回 Green — builder が正直申告)。

## 落ちる実証(AC-2b)

- pending ガード: `pending.find(() => false)` 注入 → 2 tests 赤 → 復元 14 pass
- receipts ガード: `owner !== intentRun` → `false` 注入 → **新テストのみ 1 fail**(pending 側は green のまま = 新テストが旧ガード経由で通っていないことの対照)→ 復元 14 pass、注入残渣ゼロ(コミット前 status クリーン)

## 検証(builder、全 exit 0)

typecheck 0 / lint 0(変更ファイル指摘 0)/ t470+t458+record CLI 39 tests 0 fail / 広域 advisory 13ファイル 180 tests 0 fail / docs 消費ガード 83 tests 0 fail / complexity 0 / build 後 status --porcelain 空 / gen-coverage-registry・unchecked-cast・callsite・deletion・source-only 全 0 / no-silent-drop gate(base b8e3e664f)`NO_SILENT_DROP_OK`。
`run-tests.sh --ci` / coverage は PR CI で判定(単独所有)。coverage-patch-gate はローカル lcov 不在のため未判定 — 代替として allowlist 591 エントリ全件の `resolveAllowlistEntries` 解決検証(failures 0)を実測。

## §12a i1 BLOCKER/FOLLOW-UP の閉包(最終 base `edfee5818` で実測)

**NFR-5 の3点セット(builder 再実測、census は最終 base で採り直し)**:
- (0) 解決性: allowlist 全 591 エントリ resolve / failures **0**。`amadeus-advisory-choice.ts` 紐づき 19 エントリ(既存18 + 新規1)、本ブランチの追加行 107 行(1456..1629)
- (a) **reason 直読照合: 19/19 一致(無音転位ゼロ)** — 例: 新規 [18] は `:1629` の `if (process.argv[2] === "recover-schema-1") process.exit(recoverSchema1AdvisoryStoreCli(…));` に一意解決し reason 逐語と一致。既存 [7] は anchor 分断の自己是正後 `:1630-1633` の4行へ正しく解決
- (b) **span 膨張検査: 既存18件の span は base↔head で全件不変、追加 107 行を覆う既存レンジ 0 件**(straddle なし)。新規エントリのみが自分の追加行 1629 を1行覆う

**characterization 9テストの分類**(全件が駆動済み5サイクルの帰結と確認 — 新規未検証分岐なし): #5/#6 = C2 の述語バリエーション、#7/#8 = C1 の拒否アーム、#9/#10 = C1(+C2)の下流帰結(AC-2c 両分岐)、#12 = C4 失敗アーム × C3/C5 ガード出力(落ちる実証で赤転する実効テスト)、#13 = C4 の実配線(in-process では踏めない面)、#14 = C4 の回帰面。

**隔離2回ビルド再現性**: ローカル単発 build + status 確認はこの検査の**代替ではない** — 判定は PR CI の `Reproducible build` job に委ねる(CI 委譲)。

**FR-2.6 の docs 面数**: requirements は2面を名指すが `.ja.md` を含む3面を更新 — 対訳同時更新は project.md Mandated(EN/JA 同一変更)の**機械的執行**であり判断を要する逸脱ではない(停止不要の位置付け)。

## 注記

- runner-bypass の偽赤1回(t458 が bun 既定 5s timeout で赤 → 正準ランナー既定 30s 明示で 39 pass 4.14s。`cid:code-generation:c6-runner-bypass-loses-defaults` の実例、本 Bolt 未変更ファイル)
- allowlist anchor 分断の自己検出→dispatch 行の配置換えで既存 anchor 無傷化(builder 報告)
