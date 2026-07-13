# ユーザーフロー — metrics-observation

## フロー1: 自動 snapshot(第一候補トリガー、main マージ時)

1. Bolt PR がユーザー承認でスカッシュマージ → main 前進
2. 権限付き workflow(release.yml 前例踏襲)が発火 → snapshot ツールを `--write` で実行
3. 全 collector 成功 → `metrics/` へ日付付き JSON をコミット・push(ループ防止: metrics/ は CI トリガーの paths-ignore)
4. いずれか失敗 → workflow が **loud に fail**(snapshot なし)— 通知はゲート赤として既存 CI 経路で可視化
5. 開発者は `git log -- metrics/` / JSON 群で時系列を参照(カバレッジのグラフは Codecov 既存 UI)

## フロー2: 手動 snapshot

1. 開発者が `bun <snapshot-tool> --write` を実行(トリガー選定によらず常に可能)
2. 出力・失敗挙動はフロー1 と同一契約

## フロー3: 定点観測(読み手)

1. 観測者(人間 or エージェント)が metrics/ の JSON 群を読み時集計(jq/スクリプト)
2. 「いつ・どのマージで値が動いたか」は snapshot の commit フィールド+git blame で特定可能
