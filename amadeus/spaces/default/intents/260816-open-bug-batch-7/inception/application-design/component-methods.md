# Component Methods — 260816-open-bug-batch-7

既存メソッド・定数面の変更のみ(新規公開 API なし)。詳細な業務規則は functional-design に委ね、ここでは公開面の変更契約を列挙する。根拠は `requirements.md` の各 FR と codekb `component-inventory.md` の file:line。

## C-PI の変更契約

| 面 | 変更 | 入出力/エラー処理 |
|---|---|---|
| `SELF_INSTALL_HARNESSES`(plugin-projection.ts:59) | `"pi"` を追加 | const 配列。型は as const 維持 |
| `managedDirs`(promote-self.ts:64-71) | `{ src: "dist/pi/.pi", dst: ".pi" }` を追加 | 不在 src は既存の promote-self エラー経路(loud fail)に従う |
| `GENERATED_SELF_INSTALL_ROOTS`(self-install-allowlist.ts:12-19) | `.pi` ルートを追加 | 生成 `.gitignore` / `.gitattributes` へ機械投影 |
| 生成 ignore 面 | `.pi` 一括 ignore と pi dot-gitignore の `!/.pi/vendor/` 否定パターンの両立 | 検証は 2 方向: (a) 追跡汚染 0 件 (b) vendor 配下の既追跡ファイルが `git ls-files` で脱落しない(RA レビュー FOLLOW-UP 2 への応答 — 逆方向検査を facet 化) |

## C-NSD の変更契約(D1 = 退役)

| 面 | 変更 | 入出力/エラー処理 |
|---|---|---|
| `loadTrustedPreviousLedgers`(bootstrap.ts:435-461) | `:448` の events 存在分岐を除去し events-only 化。events 不在の trustedSha は fail-closed の型付き診断 + 非 0 終了 | 「fallback で救済」から「明示エラー」へ — 無音劣化を作らない |
| `validateBootstrapHistory` / provenance 検証チェーン(bootstrap.ts) | 削除(parseProvenance / validateEvidenceBundle 等の bootstrap-provenance 消費系) | 削除後、`bootstrap-provenance.json` 参照 0 件を grep 述語で機械確認 |
| `baselineAtRevision`(ledger.ts:226-227)/ `CANONICAL_PATHS.baseline`(:301-302) | 削除(不在ファイル参照の死経路) | 唯一の呼出である negative test(gate.test.ts:839)は events 前提の検査へ書換 |
| `tests/no-silent-drop/bootstrap-provenance.json` / `bootstrap/` fixtures | 削除 | — |
| gate テスト(no-silent-drop-gate.test.ts / t427) | fixture 構築(bootstrapRepository)と :1222-1244 の検査群を events-only 前提へ再構成 | 「events 欠落 → fail-closed」の negative test を落ちる実証つきで残す |

## C-SEN の変更契約

| 面 | 変更 | 入出力/エラー処理 |
|---|---|---|
| 07-sensor-system.md / .ja.md の matches 表(:199-207) | 欠落 4 行追加 + 陳腐化 2 行是正(13 件へ同期) | en/ja 同一変更 |
| t3028 `tableRows()` / `covers:` | 対象へ 07 en/ja を追加。07 用の期待集合は `derivedCorpus()` の matches 宣言サブセット(件数フリー) | 不一致は既存の toEqual 失敗様式(diff 表示)に従う |
