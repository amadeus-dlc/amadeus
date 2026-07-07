# Scope Definition 質問票 — インストーラの実装

> ステージ: scope-definition (Ideation) / 深度: Standard
> 上流入力: `../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`
> 確定済み前提: `@amadeus-dlc/setup`、npx/bunx 両対応、GitHub タグ取得、非破壊マージ + 差分レポート、対話式 + 非対話フラグ

## Q1. 初回リリースに含める機能(MUST)はどこまでですか?

候補ケイパビリティ: (1) init(新規導入) (2) upgrade(更新+差分レポート) (3) 対話式ウィザード (4) 非対話フラグ (5) --force (6) doctor(導入診断)

- A. init のみ — 最小の価値(導入)に絞り、upgrade は次リリース
- B. init + upgrade — intent の中心課題(導入+更新)を両方満たす
- C. init + upgrade + doctor — 診断まで含めたフルセット
- X. Other (please specify)

[Answer]: B — init + upgrade(対話式ウィザード・非対話フラグ・--force を含む)(2026-07-07, Mode: grilling)

## Q2. 差分レポートの初回スコープはどの水準ですか?

- A. ファイルレベル(追加/更新/スキップの一覧表示)
- B. A + 内容差分(変更ファイルの diff 表示)
- C. 適用後サマリーのみ(事前レポートなし)— ただし market-research の差別化方針と矛盾
- X. Other (please specify)

[Answer]: A — ファイルレベル(追加/更新/スキップの一覧を適用前に表示)(2026-07-07, Mode: grilling)

## Q3. スコープ外(OUT)を確認します。以下を初回リリースから除外してよいですか?(該当するものをすべて選択 = 除外に同意)

- A. 組織一括展開(複数プロジェクト同時インストール)— intent-capture で除外済み
- B. オフラインインストール(dist 同梱)— feasibility Q4 で GitHub 取得を選択済み
- C. ロールバック(更新前スナップショット復元)
- D. 既存導入の自動検出・マイグレーション(手動コピーで導入済みのプロジェクトの取り込み)
- E. npm provenance / CI 自動公開
- X. Other (please specify)

[Answer]: A, B, C, D, E — 5項目すべて初回リリースから除外(2026-07-07, Mode: grilling)

## Q4. 実装の順序付け方針は?

- A. リスク優先 — 非破壊マージ・差分レポート(技術的に最も不確実)を最初に検証
- B. 価値優先 — init(最も多くのユーザーが使う)を最初に完成させる
- C. 依存優先 — 共通基盤(取得・マニフェスト・ファイル操作)→ init → upgrade の順
- X. Other (please specify)

[Answer]: C — 依存優先(共通基盤 → init → upgrade)(2026-07-07, Mode: grilling)

## Q5. bin コマンド名(実行時の名前)はどうしますか?

パッケージ名 `@amadeus-dlc/setup` とは独立に決められます。`bunx @amadeus-dlc/setup` はパッケージ名で直接実行されるため、bin 名は主にグローバルインストール時と補助コマンドで意味を持ちます。

- A. `amadeus-setup` — パッケージ名と一貫
- B. `amadeus` — 短く、将来のサブコマンド拡張(doctor 等)の傘になる
- C. bin なし — `bunx @amadeus-dlc/setup` のみを公式経路とする
- X. Other (please specify)

[Answer]: A — amadeus-setup(パッケージ名と一貫、/amadeus スキルとの混同回避)(2026-07-07, Mode: grilling)
