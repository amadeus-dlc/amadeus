# Code Summary — u001-presence-evidence（260705-presence-evidence）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[business-logic-model.md](../functional-design/business-logic-model.md)、[reliability-design.md](../nfr-design/reliability-design.md)

## 現状

- `boundary-section-draft.md`: audit-format.md へ追加する英語 H2 節（`## Evidence Verification Boundary (docs-only declaration)`）の確定文面と、FR-2.3 再読了記録（行番号付き）を作成済み。
- `parity-reason-supplement-draft.md`: parity-map.json #499 エントリの reason へ追補する日本語一文を作成済み。
- `code-generation-plan.md`: 手順 1〜3（record 成果物作成）を完了済みとしてマーク。手順 4〜7（対象 2 ファイルへの反映、検証、PR）は保留としてマーク。

## 保留と理由（BR-7）

対象 2 ファイル（`.agents/amadeus/knowledge/amadeus-shared/audit-format.md`、`dev-scripts/data/parity-map.json`）は、PR #428 が並行して同じファイルを変更中である。BR-7 の指示、および reliability-design.md（REL-2 = BR-7 反映）に従い、これら 2 ファイルへの実書き込みは #428 の merge 通知を確認した後にのみ行う。本ステージでは、反映内容を record 成果物（ドラフト 2 本）として先行確定するに留めた。

## FR カバレッジ

| Requirement | 内容 | 状態 |
|---|---|---|
| FR-1.1 | evidence 検証の設計境界（形式 + 実在照合まで、人間由来の機械証明は対象外）を明記 | 下書き済み・反映待ち |
| FR-1.2 | 防衛線 3 点（GUARD_EXEMPTED の監査記録、人間 PR gate、多体運用の承認転記規律）を明記 | 下書き済み・反映待ち |
| FR-1.3 | 不採用 2 案（presence 相関、GATE_APPROVED 限定）の理由を記録 | 下書き済み・反映待ち |
| FR-1.4 | #497 決定 8 の mint 規律は改定しない旨を明記 | 下書き済み・反映待ち |
| FR-1.5 | 既存 audit-format.md の見出し・語彙・スタイルに合わせる（カウント表記は不変） | 下書き済み・反映待ち |
| FR-2.1 | validator（Intent 指定）+ `npm run test:all` の実行と記録 | pending（#428 merge 後） |
| FR-2.2 | 新規 eval は作らない（既存 test:all の回帰確認で足りる） | pending（#428 merge 後の検証で確認） |
| FR-2.3 | `verifyDocsOnlyEvidence` を code-generation 実行時点で再読了し現行実装と一致確認 | 完了（本ステージで実施。`boundary-section-draft.md` の再読了記録を参照） |
| NFR-1 | 英語での追記（既存スタイル一致） | 下書き済み・反映待ち（下書き自体は英語で作成済み） |
| NFR-2 | 出典（Issue #506、PR #505 review、DECISION_RECORDED requirements-analysis 2026-07-06）の明示 | 下書き済み・反映待ち（下書きの Sources 行に含む） |

## 発見事項

mockups.md の骨子（5 要素 + 出典、および「same-second timestamp ties」の訂正済み文言）と、`verifyDocsOnlyEvidence` / `GUARD_EXEMPTED` emit / `humanActedSinceGate` の現行実装との間に**不一致は見つからなかった**。骨子はそのまま英語本文へ確定できた。

## 反映と検証の記録（#542 解禁後、2026-07-06T01:55 頃 UTC）

- audit-format.md（71 events + RECOMPOSED の実形）の Format Standards 直後・Entry Format の前へ、boundary-section-draft.md の英語本文をそのまま追加した（冒頭カウントは更新せず = AD-2 どおり。本節はイベント表を持たない説明節）。
- parity-map.json の #499 由来 exceptions エントリ（4 対象共有）の reason 末尾へ、独立一文を追補した（diff 1 行。他 3 ファイルの説明と文で分離 = AD-3 どおり）。
- 検証: `npm run parity:check` = ok（39 skills、199 engine files、基準 b67798c3 = #542 後）。`npm run test:all` = pass（exit 0、パイプなし実行）。validator（Intent 指定）= インストーラ以外の指摘なし（Operation ステージ表記のみ。終盤の理由付き skip で解消予定の既知パターン）。
- FR カバレッジ: FR-1.1〜1.5 = 反映済み、FR-2.1 = 記録済み、FR-2.2 = 新規 eval なし（確定どおり）、FR-2.3 = 下書き時の行番号付き再読了記録（本ファイル前段）を執筆根拠として使用。

## §12a review の指摘と修正（2026-07-06）

- 指摘 1（重大）: 反映時に draft の閉じフェンス `` ``` `` を本文と一緒に貼り付け、audit-format.md にフェンスが 1 個混入した（249 行目）。以降の Entry Format 節のフェンス対応が崩れる実害があった。孤立フェンスを削除し、フェンス数が origin/main と同じ 6 個（偶数）へ戻ったことを確認した。test:all / validator は Markdown フェンス対応を検査しないため、初回の「検証 pass」ではこの欠陥を検出できなかった。
- 指摘 2（軽微）: boundary-section-draft.md の再読了記録の行範囲を再照合し、`verifyStageArtifacts` を 905–950 へ補正した（emit 呼び出し 934–937、関数本体 1470–1498 は一致のまま）。`humanActedSinceGate` のコメント開始は反復 2 でも 1445 では不正確と指摘され、実コードのコメントブロック開始 1437（`// --- Human presence at an approval/interview gate ---`）へ再補正した。
- 指摘 3（参考・非ブロッキング）: Defense line 3 の英文は team.md の mint 規律（HUMAN_TURN は中継承認定型文の受信直後だけ mint）を意訳的に言い換えている。趣旨は整合しており本文は変更しない。
- 反復経過: 反復 1 = NOT-READY（重大 1 + 軽微 1 + 参考 1）。反復 2 = NOT-READY（軽微 2 件。重大指摘 1 の修正と audit-format.md の無傷は確認済み）。反復上限（2）到達のため、軽微 2 件の修正（行範囲 1437 への再補正と本節の記述訂正）は gate で確定する。出荷対象の audit-format.md / parity-map.json 自体は反復 2 で問題なしと確認されている。
