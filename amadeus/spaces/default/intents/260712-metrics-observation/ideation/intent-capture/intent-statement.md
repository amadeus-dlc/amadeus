# Intent Statement — メトリクス定点観測(260712-metrics-observation)

## Problem Statement(解決するビジネス課題)

このリポジトリにはコード品質の**回帰防止ゲート**は存在するが、**時系列の観測機構**が存在しない。具体的には(Issue #921 実測、main c3f78fa66 時点、e4/e5 クロスレビューで実在確認済み):

- `tests/complexity-gate.ts` は lizard ベースの CCN ラチェットゲートだが、baseline(`tests/.complexity-baseline.json`)は現在値のみを保持し timestamp 系フィールドはゼロ — 過去時点のメトリクス値は残らない
- カバレッジ(`coverage:ci`)は都度計測・都度出力で、出力先 `coverage/` は `.gitignore` 対象 — コミットされる履歴は構造的に存在しない
- `package.json` scripts・`scripts/`・`.claude/tools/` のいずれにも時系列メトリクス台帳を出力する機構がない(grep 実測)

このため「コードベースが健全な方向に向かっているか」をデータで判断できず、品質改善の効果測定も感覚に頼っている。

## Target Customer(受益者)

**内部顧客: このリポジトリを保守する開発チーム**(ユーザー j5ik2o + claude メンバー e1〜e6)。

- ペイン: LOC・複雑度・テスト数・カバレッジ等の推移を確認する手段がなく、リファクタリングや品質施策の効果を時系列で裏付けられない
- 本機構はリポジトリ内部の観測装置であり、npm 配布物(`@amadeus-dlc/setup` 等)の機能ではない

## Success Metrics(成功の姿)

- ソースコードメトリクスが**定期的に自動計測**され、**リポジトリにコミットされるファイル**に蓄積される
- 任意の2時点間の変化(LOC、ファイル数、関数数と CCN 分布、テスト数、カバレッジ%、dist サイズ等 — 最終選定は requirements)を**機械可読**に比較できる
- 計測は決定的で、同一コミットに対する再計測が同一値を返す(検証劇場の禁止 — 実測値のみを記録)
- 可視化の要否・形式は requirements で確定する(Issue #921 で明示的に「論点」として未決)

## Initiative Trigger(なぜ今か)

**ユーザーの直接要望(2026-07-12)**。bugs-only スコープ運用下で、ユーザーが AskUserQuestion による明示裁定で「今すぐ着手」の例外指定を行った(leader ディスパッチ 2026-07-12T04:33:32Z に記録)。市場圧力・規制・インシデント起点ではない。

## Initial Scope Signal(初期スコープシグナル)

**feature**(Standard 深度)— 新規機構の導入であり、計測スクリプト・出力ファイル・トリガー配線・ドキュメントを含む。leader ディスパッチの想定に一致。最終確定は requirements-analysis で行う。

既知の設計制約(上流から引き継ぎ、requirements/design で消化):

- 既存 `tests/complexity-gate.ts` とは**相補関係**(ゲート=回帰防止、本件=観測)。lizard 計測ロジックの再利用可能性あり(e4 レビュー: gate が lizard を spawn する構造から現実的)
- 追記型台帳を選ぶ場合は shared-ledger-insert-collision ノルム(同一アンカー行への複数 PR 挿入衝突)を考慮する
- トリガー候補(main マージ時 CI / 定期 / 手動)の選定は requirements で確定する
