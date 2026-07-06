# RAID ログ — Engine Installer（260705-engine-installer）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[constraint-register.md](constraint-register.md)

## Risks（リスク）

| ID | リスク | 影響 | 緩和 |
|---|---|---|---|
| R-1 | 並行 Intent（#428 上流同期、bug 束ね）の merge でエンジンレイアウト（dir 構成、hooks 一覧）が変わり、インストーラの列挙と食い違う | インストール漏れ・配線漏れ | 配布対象の列挙を 1 箇所（マニフェスト定数）に集約し、専用 eval が実レイアウトとの一致を検査する。merge 検知時に追従（ディスパッチ申し送り） |
| R-2 | 利用者 workspace に既存の `.claude/` 実体 dir（symlink でない）があると再作成が衝突する | インストール失敗・既存物の破壊 | 上書き規則を明示（symlink は再作成、実体 dir が既にある場合の扱いを設計で確定）。冪等再実行の eval で担保 |
| R-3 | settings.json のマージが利用者の JSON 構造（コメント無し前提など）と合わない | 設定破壊 | hooks 配線のみの最小マージ + マージ前後の検証。壊せない領域（CON-2）を eval で確認 |

## Assumptions（前提）

| ID | 前提 | 検証方法 |
|---|---|---|
| A-1 | エンジンの hooks / tools は環境変数（settings.json の env）に依存せず module load できる | 専用 eval（cold cache + オフライン相当で全 tools + 全 hooks を駆動）で検証する |
| A-2 | 配布元（clone した本リポジトリ）の `.agents/amadeus/` は常に正であり、インストーラはこれを読むだけでよい | CON-7 の設計で保証する |

## Issues（課題）

| ID | 課題 | 扱い |
|---|---|---|
| I-1 | 正準手順の不在により #441 の受け入れ条件が検証不能 | 本 Intent の解決対象（専用 eval が検証土台になる） |

## Dependencies（依存）

| ID | 依存 | 状態 |
|---|---|---|
| D-1 | #441（OTel 計装基盤）が本 Intent の成果（正準手順 + eval）に依存する | 本 Intent を先行して解決する（Issue #451 関連） |
| D-2 | 並行 Intent #428（上流同期）と bug 束ね Intent（エンジン tools + validator 変更） | 並行可能（CON-7）。merge 時にレイアウト追従（R-1） |
