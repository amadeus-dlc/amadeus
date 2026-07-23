# Intent Statement — 260723-archived-status-guard

## 意図(何を達成したいか)

「誤って再開してはいけない intent」を**機構が守る**状態にしたい。現状、intent registry の status は自由文字列(`updateIntentStatus` は `status: string` を無検証受理 — amadeus-lib.ts:2163-2172 直読実測)で、260713-swarm-driver-migration のクローズは ad hoc な `closed` 文字列に留まり、エンジンは cursor 設定 → `next` による再開を拒否しない(Issue #1396 の leader 構造確認)。ユーザー裁定で閉じた intent が、機構的にはいつでも code-generation 途中から再開できてしまう。

## 達成基準(Issue #1396 提案、ユーザー着手承認済み 2026-07-23)

1. **status 語彙の enum 化**: in-flight / parked / complete / archived の一級語彙(#1309 ライフサイクルレコード共通契約と整合 — 同契約の status 正規化と同一ドメイン)
2. **誤再開ガード**: archived intent への cursor 設定・`next`・unpark を **loud エラーで拒否**(明示 override — ユーザー承認を記録する専用 verb — がある場合のみ解除)
3. **既存データの移行**: 260713-swarm-driver-migration を `closed` → `archived` へ(closure-note.md を根拠に)
4. **落ちる実証**: archived intent への `next` が実際に赤くなることを完成条件に含める(org.md Mandated)

## 現況実測(2026-07-23、engineer-1 worktree HEAD)

- registry 69 rows の status 分布: `complete` 65 / `in-flight` 3 / `closed` 1(= 260713 のみ)— ad hoc 値は移行対象の1件に閉じており、enum 化の既存データ影響は最小
- `parked` は現状 registry に出現しない(park 状態は record の amadeus-state.md 側で保持され、registry は in-flight のまま)— enum への parked 編入と registry 追跡の関係は設計判断(questions Q2)

## 裁定済みの設計方向(選挙 E-ASGIC1/2、2026-07-23、各 3-0)

- **override 形態(Q1=A)**: `archive` / `unarchive` の**対の専用 verb** を新設し、いずれも human-presence(実 HUMAN_TURN)必須+監査イベント記録(symmetric-pair — 片方向実装の非対称クラスを設計段で排除)
- **parked の扱い(Q2=A)**: enum に `parked` を**語彙契約として**含めるが、registry への parked 書込は本 intent 非対象 — 既存 park/unpark 挙動は不変(#1309 契約との語彙整合のみ確保)

## スコープ境界

- In: status enum 化+archived ガード+override verb+260713 移行+落ちる実証
- Out: #1309 の投影・Catalog・共通契約 interface の実装(e2 intent の非目標を継承)、elections 側の構造統一(e2 intent のスコープ)、`complete` 既存意味論の変更

## 由来

- GitHub Issue #1396(enhancement / P2、クロスレビュー e4/e6 実在確認済み、ユーザー着手承認 2026-07-23 — issue-selection-user-decides 充足)
- 関連: #1309(status 語彙の正規化は同一ドメイン — 実装時に intent 260722-space-record-catalog の設計成果物を参照)
