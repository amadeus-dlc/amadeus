# Requirements — 260720-hold-choice-resolution

上流入力(consumes 全数): intent-statement.md、scope-document.md、business-overview.md、architecture.md、code-structure.md、team-practices.md

実測根拠は RE 一次資料 scan-notes.md(observed f6ab1e48d)。裁定は E-HCRRA1〜3(正本 = leader ブランチ dfb076f01 の record.md、Q3=B のユーザーエスカレーション承認 03:47Z 台の追記込み)。

## 契約変更該当性の判定記録(B-1、ディスパッチ要件(3))

E-HCRRA1=A(追加のみなら非該当)だったが、**E-HCRRA3=B(tie 語彙の置換 = 受理域縮小)採用により e1 留保の反転条件が発動し「該当」へ反転 → 正準リスト(4)のユーザーエスカレーションを実施、B で承認済み(03:47Z 台)**。以後の要件はこの承認済み契約変更を前提とする。再判定条件(e3/e1/e4 の Q1 留保3件 — 全票 GoA2): 非該当は『純追加(既存受理値・既存出力・既存テストピン t236:310 系の全不変)』成立時に限る(e1/e3)。本要件の範囲(承認済み tie 限定置換)を超える受理値・出力・テストピンの変更、または新たな語彙の置換・除去へ滑った時点で、都度ユーザーエスカレーションへ切替える(e4 — 判定根拠3点の実測明記は本節と FR-1 受け入れ基準が担う)。

## FR-1: tie hold の受理語彙を choice 指定へ置換(#1267、E-HCRRA2=A / E-HCRRA3=B)

- `HOLD_RESOLUTIONS.tie`(election.ts:69-74 の tie 行)から `adopted`/`rejected` を除去し、`choice:<internalNo>` 形(E-HCRRA2=A — 既存 `--resolution` フラグの値文法拡張)を受理する。復帰先は `tallied`(現行どおり)。
- **tie 限定**: block / discussion-needed / quorum-short の語彙は不変(e3/e1 留保、E-TCRCG=A 維持)。
- 検証は fail-closed 二段: (i) `choice:` prefix parse (ii) `<internalNo>` が election.choices の実在 internalNo に一致(不一致・非数値・欠落は既存様式の invalid-transition fail — handleHoldResolved :201-207 のテーブル検証様式を拡張)。
- **tie への二値投入は loud 拒否**(e4 留保の実装形 — 置換により adopted/rejected はテーブル不在となり既存 fail 経路が「valid: choice:<n>」を提示するエラー文言で拒否)。受け入れ基準: エラー文言に有効形のヒントを含む。

## FR-2: choice resolution の永続化(human-ruling-persist-through)

- HoldResolution.resolution(election.ts:89-94、string 型)へ `choice:<n>` をそのまま保存 — スキーマ変更なし。trail 行(:402-404)は現行様式で `tie → choice:<n>` を表示。
- 受け入れ基準: tally.json の resolutions 配列に choice 形が保存され、reopen 後も carry-forward される(store.ts:246-253 経路の不変確認)。

## FR-3: 勝者 choice の record 描画(gap point の解消)

- rulingOverride 合成(election.ts:389-393)を拡張: finalRuling.resolution が `choice:<n>` のとき、election.choices から label を引き `裁定: <label>(choice <n> — tie 裁定)` 級の winner 形を合成(様式詳細は design で確定 — rulingText の established 形 record.ts:120-131 と整合させる)。
- 二値(旧形 — 他 reason 由来)の override は現行どおり(採用/不採用)。
- 受け入れ基準: tie hold → choice resolution → render の貫通で record.md 裁定行に勝者 choice label が描画される(閉包テスト)。

## FR-4: テストと落ちる実証

- 閉包: tie hold 発生(t234:413 様式)→ `--resolution choice:<n>` 受理 → tally.json 保存 → record 描画の統合テスト(RE 実測の未カバー面 = tie hold-resolved 経路の新設)。
- loud 拒否: tie への `adopted`/`rejected`/不正 choice(実在しない internalNo・非数値)が exit 1(RE 実測で全欠落だった tie resolution 検証の新設)。
- 落ちる実証: fix コミット後の pre-fix 面切替で新テスト赤 → SHA 明示復元(E-GMECG 手順)。
- docs: 二値語彙(単一提案型 s13-adoption 等)と choice 指定(多肢 clarification 型 tie)の使い分けを1行(e4 留保 — 置き場所は design で確定)。

## FR-5: 検証 green 維持

typecheck / lint / --ci green+deslop+lcov(配線行個別確認)。t238 非接触(W-1 — e4 バッチ面、並行合意の相互通知を維持)。t241 は非改変(scan-notes 実測 — block 経路の既存 hold-resolved テストで、tie 限定変更のため非接触。W-1/e4 合意とは無関係の別根拠)。

## NFR

- NFR-1: 新受理形の検証は既存 fail-closed 様式(invalid-transition + valid ヒント)に整合。
- NFR-2: テスト層 — 純関数化できる parse は unit、CLI 疎通・FS は integration(fs-tests-integration-first)。
- NFR-3: 既存 store 実データの load/verify を壊さない — 対象は「hold 0・winner-schema 0・非空 resolutions 0」の既存データ全数(実測 ref 併記: leader store 62本 / 本 worktree f6ab1e48d 51本 — 定性結論は両 ref 一致、sweep は実装時点の対象 worktree で glob 全数)。

## トレーサビリティ

M-1→FR-1、M-2→FR-2/FR-3、M-3→FR-1(置換の承認済み確定)、M-4→契約判定記録、M-5→FR-5。#1267 の対応方向(choice:<internalNo> 例示)は E-HCRRA2=A で採用確定。
