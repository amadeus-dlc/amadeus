# Business Rules — u7-mirror-model

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## BR-U7-1: TDD 必須(コード面)

v2 スキーマ・移行・SOURCE_DRIFT 検出のコード面は TDD 既定(NFR-2)。.tla/.cfg 自体はテスト対象でなく TLC 完全探索+落ちる実証が検証形(two-layer-verification-posture の専用ジョブ面)。

## BR-U7-2: 縮約の申告

ADR-3 の縮約(MaxReceipts=3、boundary 4種、parked/manual 外)に加え、**遷移縮約(21 種 → receipt-lifecycle+project-sync 系 14 種、T2 の申告)**も .tla 冒頭コメントに全数明記する(finite-exploration-not-detected-proof — 縮約は検査したい不変量を保存する範囲でのみ。status を変える遷移の除外ゼロを実装時 grep で assert)。

## BR-U7-3: 実装無変更

mirror 系実装(coordinator 含む)への変更は禁止(I5 — #1838 修正は Won't)。model-map エントリの SHA ピンは現 HEAD の実装バイトに対して張る。

## BR-U7-4: v2 移行の一方向性

model-map v1 → v2 は同一 PR 内で完結し、v1 読取互換・フォールバックを残さない(org.md Forbidden)。全読み手(loader / check / update / u6 の --impl-only / **ADR-2 の plugin 側複製 amadeus-formal-verif-model-map.ts — drift guard が同一 PR 同期を機械強制**)の v2 対応を同一変更で行い、consumer 棚卸しは変数名+リテラル(schemaVersion)の2キーで grep(dual-key-consumer-inventory)。

## BR-U7-5: 検証コマンド集合

BR-U1-6 と同一+formal-verif 系テスト+TLC ジョブ(workflow_dispatch)の run/verify green — green 対象は **AsIntended のみ**(AsImplemented は恒常ジョブ外の一度限り実証 — T3 の CI 統合契約)。

## BR-U7-6: 出典の焼き込み

各 invariant・縮約・変種には出典(FR 番号 / Issue 番号 / cid)をコメントで焼き込む(FR-C2 の裁定どおり)。
