# Business Rules — stage-stats-cli(functional-design)

上流入力(consumes 全数): unit-of-work(U1 の実装ノート・制約を BR の適用範囲として消費)、unit-of-work-story-map(FR 全数写像を BR 被覆確認に消費)、requirements(FR/NFR/C の AC を BR の正本として消費)、components(責務分割を BR の所有コンポーネント帰属に消費)、component-methods(エラー処理方針を BR-3/BR-11 の契約として消費)、services(単一 CLI 構成を BR 適用単位として消費)

## 不変条件(violate 不能に設計する規則)

- **BR-1 二世代正規化**: schemaVersion 1/2 の両方を読む。片側のみの実装は 73.4% を取り落とすため欠陥(FR-1b)。所有: C1(`readJournalRecords` 消費)
- **BR-2 パス由来帰属**: intent 帰属は `intentId` 属性を使わず、spaceRoot 相対パス第 2 セグメントのみ(FR-1a)。所有: C1
- **BR-3 fail-loud**: 読取不能シャード ≥1 → exit 1。無音スキップ禁止 — 全ての読取失敗はカウンタへ(FR-1c)。所有: C1(計数)+ C9(exit 変換)
- **BR-4 除外バケット閉集合**: バケットは `ExclusionCounts` の **8 フィールド**(corpus 2 / windowing 5 / review 1)に閉じ、全バケット件数を必ず出力(FR-2c、ADR-6)。バケット追加は型変更 → レンダラの網羅がコンパイル境界で強制。所有: C2/C3(振り分け)+ C8(報告)。第 8 バケット `invalidTimestamp` は明示改訂 R-1(domain-entities「入力層/窓・計測層」節が正本)で追加 — 追加は閉集合の拡張であり、既存 7 バケットの意味論と恒等式の参加集合は不変
- **BR-4b 不正タイムスタンプの非流入**(明示改訂 R-1): `Date.parse` が NaN を返すタイムスタンプを持つイベントは、窓化(A2)と idle 区間構成(A3)のいずれにも入れず `invalidTimestamp` へ計数する。NaN を `rawSeconds` 経由で統計へ流さない(BR-13 の NaN 伝播は「空母集団」の意味論であり、汚染された値の伝播ではない)。所有: C2/C3
- **BR-5 黙示救済禁止**: 未クローズ idle 開始を持つ窓は net 統計から除外+件数報告。0 扱い・仮終端の補完等の黙示既定での救済は禁止(FR-2c)。所有: C3
- **BR-6 負値禁止**: `netSeconds >= 0` を `MeasuredWindow` コンストラクタで enforce。クリップにより構造的に成立(FR-2 AC iv)。所有: C3
- **BR-7 二重減算禁止**: idle 区間はクリップ後に重複マージしてから合算(FR-2 AC ii)。所有: C3
- **BR-8 決定的順序**: 全出力形で固定順(count-desc, key-asc)。同一入力 2 回実行 byte 一致(FR-6 AC i)。所有: C8
- **BR-9 仮説明記**: 出力ヘッダに「net は idle 減算による推定であり、実作業時間との一致は未検証の仮説」の固定文言を必須表示(FR-6c、A-1)。`StageStatsReport` の必須フィールド。所有: C8
- **BR-10 read-only**: fs write API を import しない(grep/AST 検査可能 — FR-7a)。audit/state 変更ゼロ。所有: 全コンポーネント(自動テストで検査)
- **BR-11 parse-don't-validate**: 未知フラグ・不正値は `UsageError` → exit 2。検証済み値は `CliOptions` 型で運ぶ(FR-7b)。所有: C9
- **BR-12 UNKNOWN fail-closed**: モデル帰属不能な行は UNKNOWN として可視化し、帰属可能数/全数を明示(FR-5a/5b)。所有: C6
- **BR-13 空入力 NaN 伝播**: 統計(mean/median/p95)は空母集団で NaN を返し、0 等へ丸めない(FR-6a)。所有: C7
- **BR-14 母集団恒等(層別)**: 恒等 W `構成済み窓数 = net 統計母集団数 + unclosedIdle + zeroSecond` と恒等 M `attributable + unresolved = total` を出力上で検証可能にする(FR-2 AC vi / FR-5 AC — 「全窓」の定義は構成済み StageWindow[] の総数)。unmatchedStart / orphanComplete / invalidTimestamp(いずれも窓未満のイベント計数)・corpus グループ(brokenLine / unreadableShard)・review グループ(unparseableReviewHeading)は互いに素な母集団の独立カウンタであり恒等式に参加しない — 正本は domain-entities「母集団恒等」節。所有: C7/C6/C8

## 条件付き挙動

- 0 秒窓(FR-2d): 分解能外として `zeroSecond` 計数+レポート明記(除外バケットの一種として母集団から除く)
- `{unit-name}` リテラルパス(FR-3b): 是正せずそのままバケット表示
- 接尾辞付き Review 見出し(FR-3a): `unparseableReviewHeading` 計数(黙って捨てない)
- センサー fired=0 のステージ: failedRate は NaN(BR-13 と同族 — 0% と偽らない)

## 検証面(NFR 由来)

- BR-3/BR-4/BR-5 は NFR-5 落ちる実証の対象(fixture 注入で赤の実働確認)
- 全 BR は t481(unit: 純関数)/ t482(integration: 実 FS+spawn)の twin で検証、独立オラクル必須(自己参照比較禁止 — NFR-2)
