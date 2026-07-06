# Component Methods — Engine Installer（260705-engine-installer）

上流入力: [components.md](components.md)

## 主要関数の契約

| 関数 | 入力 | 出力・作用 | エラー時 |
|---|---|---|---|
| `preflight(target)` | target path | 存在・ディレクトリ・書き込み可を検査 | 3 パターンの reason（interaction-spec の文言表）で throw → exit 1、変更なし |
| `copyEngine(src, target)` | 配布元 root、target | `.agents/amadeus/` 7 dir を rm → cp -R 相当で全置換 | I/O 失敗は工程名付きで throw |
| `copySkills(src, target)` | 同上 | manifest の glob に一致する skills だけ全置換。非対象は触れない | 同上 |
| `transformAmadeusMd(src)` | 原本 AMADEUS.md のテキスト | 節除去リスト適用済みテキストを返す（純関数） | 除去リストの見出しが原本にない場合は throw（リスト陳腐化の即時検出） |
| `placeAmadeusMd(src, target)` | 配布元 root、target | 原本を読み `transformAmadeusMd` を適用し、target root の `AMADEUS.md` へ書き込む（全置換 = FR-1.4、FR-1.8）。工程 [1/5] 内で `copyEngine` に続けて実行する | transformAmadeusMd の throw を工程名付きで伝播 |
| `relinkClaude(target)` | target | 7 entry を lstat で判定: symlink → 再作成、不在 → 作成、それ以外 → throw（対象 path + fix 案内） | 衝突対象は変更しない |
| `mergeSettings(target, wiring)` | target、manifest の hooks 配線 | JSON.parse → hooks へ matcher+command キーの union（順序保持）→ 書き戻し。不在時は最小 JSON 作成 | parse 失敗は throw（ファイル無変更） |
| `smoke(target)` | target | インストール先で doctor 相当を起動し結果を返す（実行方法は functional-design で確定 = O-2） | 未確定（O-2） |

## eval harness の検証群（FR-2 系との対応）

| 検証 | FR |
|---|---|
| 実インストール（一時 dir） | FR-2.1 |
| `test:it:installer` の登録と test:it:all への連鎖 | FR-2.4 |
| cold cache + オフライン相当での全 tools + hooks module load | FR-2.2 |
| 2 回実行の収束・hooks 非重複 | FR-2.3 |
| マニフェストと配布元実レイアウトの一致 | FR-2.5 |
| AMADEUS.md 双方向検査 | FR-2.6 |
| settings マージの再読込・非対象キー不変・順序保持 | FR-2.7 |
| エラー中断の非破壊（実体衝突・不正 JSON） | FR-2.9 |
| 事前チェック 3 パターン | FR-2.10 |
| 非対象 skills の不変 | FR-2.11 |
| .agents/ 完全性（Codex 成立） | FR-4.1 |
| 一時 dir の片付け（try/finally） | FR-2.8 |
