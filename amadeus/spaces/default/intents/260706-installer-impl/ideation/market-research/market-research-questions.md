# Market Research 質問票 — インストーラの実装

> ステージ: market-research (Ideation) / 深度: Standard
> 上流入力: `../intent-capture/intent-statement.md`(npm公開CLI + bunxワンライナー、全ハーネス対応、非破壊マージの方向性が確定済み)

## Q1. 競合・参照とすべき配布モデルはどれですか?(該当するものをすべて選択)

類似の「AIコーディング用ワークフローセット/設定ファイル群を配布する」プロダクトの配布方式を比較対象にします。

- A. スキャフォールドCLI型 — `npx create-*` / `bunx giget` 系(一度生成したら終わり、更新なし)
- B. コンポーネント配布CLI型 — shadcn/ui 方式(`npx shadcn add`、ファイルをプロジェクトにコピーし所有権を移す)
- C. スペック駆動フレームワーク型 — GitHub spec-kit(`uvx specify init`)、cc-sdd(`npx cc-sdd`)など直接競合
- D. プラグイン/マーケットプレイス型 — Claude Code plugins、VS Code拡張のような集中配布
- E. パッケージマネージャ型 — npm dependencies として導入しツールが参照(コピーせず参照)
- X. Other (please specify)

[Answer]: C, E — スペック駆動フレームワーク型(cc-sdd を特に参考にしたい。更新もできるように)+ パッケージマネージャ型も比較対象に含める(2026-07-07, Mode: guided)

## Q2. インストーラのUXで「テーブルステークス(当然の期待)」とすべき水準は?

- A. 対話式ウィザード(ハーネス選択・確認プロンプト付き)+ 非対話フラグ完備
- B. 非対話デフォルト(引数指定のみで完結)、対話は最小限
- C. 対話式のみ(CI等の非対話ニーズは初回スコープ外)
- X. Other (please specify)

[Answer]: A — 対話式ウィザード + 非対話フラグ完備(2026-07-07, Mode: guided)

## Q3. 更新(upgrade)体験の差別化ポイントをどこに置きますか?

- A. バージョン検出 + 差分レポート(何が変わるかを事前に表示してから適用)
- B. 単純上書き更新(非破壊マージのみ保証、差分表示なし)
- C. A + ロールバック(更新前スナップショットから復元可能)
- X. Other (please specify)

[Answer]: A — バージョン検出 + 差分レポート(2026-07-07, Mode: guided)

## Q4. build-vs-buy: インストーラ基盤に既存OSSツールを使いますか?

- A. 完全自作 — bun/TypeScript でゼロから(既存の scripts/package.ts 資産と整合)
- B. giget / degit 等のテンプレート取得ライブラリを内部利用
- C. unbuild/citty 等のCLIフレームワークを利用しつつコピー処理は自作
- X. Other (please specify)

[Answer]: A — 完全自作(bun/TypeScript、既存 scripts/package.ts 資産と整合、依存ゼロ)(2026-07-07, Mode: guided)

## Q5. 市場ポジショニング: インストーラを何として打ち出しますか?

- A. 単なる導入手段(README の cp -r の置き換え、控えめな位置づけ)
- B. プロダクトの顔 — 「1コマンドで始められるAI-DLC」として README/ドキュメントの先頭に据える
- C. エコシステムの入口 — 将来の doctor/update/telemetry 等サブコマンド群の基盤
- X. Other (please specify)

[Answer]: B — プロダクトの顔(「1コマンドで始められるAI-DLC」としてドキュメント先頭に)(2026-07-07, Mode: guided)
