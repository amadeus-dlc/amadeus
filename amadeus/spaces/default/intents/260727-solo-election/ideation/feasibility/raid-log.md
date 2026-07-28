# RAID Log — solo-election

上流入力(consumes 全数): intent-statement.md — Risks & Assumptions 節を引き継ぎ、feasibility 実測(feasibility-assessment.md のギャップ一覧)で具体化した。

## Risks

| ID | リスク | 影響 | 緩和 | 状態 |
|---|---|---|---|---|
| R-01 | tally の voters-aware 化がチームモード集計を退行させる | S2 級(選挙全停止/偽裁定) | 既存票数帯の regression テスト+2体新帯の落ちる実証を両方固定(C-01)。純関数なので決定的にテスト可能 | open |
| R-02 | subagent が CLI 投票を完遂せずターン終了(既知クラス) | 選挙が開票不能で停止 | ディスパッチプロンプトに同期完遂の定型文言(cid:builder-prompt-sync-completion)+票未着時の再spawn 1回→なお未着でエスカレーション | open |
| R-03 | 同一モデル2体の相関誤りが 2-0 一致として通る | 誤裁定の即採用 | 発動3類型は反証可能な証拠ベース判断に限定。票に rationale+GoA 必須。運用実績で体数・多様性を再裁定可能 | open(受容済みリスク — intent-statement 記載) |
| R-04 | spawn プロンプト経由のアンカリング(verbatim 規律の破り) | 独立性毀損 | C-03 を requirements の受け入れ基準化+レビュー観点化。transport の構造的 blind が下限を保証 | open |
| R-05 | 5(追加議論)再投票の subagent が fresh でない(resume 時の文脈汚染) | 再投票の独立性低下 | requirements で resume か新規 spawn かを確定(intent-capture diary の open question を引き継ぎ) | open |

## Assumptions

- A-01: fresh subagent 2体の票は実用上十分に独立(コンテキスト独立+自前実測)— 検証は運用実績で。
- A-02: Agent tool 利用可能ハーネスが主対象。不能ハーネスは現行挙動(全件エスカレーション)へ loud 降格。

## Issues

- なし(本 intent 起点の新規 Issue は現時点ゼロ。ミラー Issue #1595 は共有面であり課題ではない)

## Dependencies

- D-01: amadeus-election CLI(選挙 TS 基盤、着地済み)— verb 契約は feasibility-assessment の実測どおり。
- D-02: Agent tool(subagent spawn)+ subagent の Bash 実行権 — 本ハーネスで実証済み。
