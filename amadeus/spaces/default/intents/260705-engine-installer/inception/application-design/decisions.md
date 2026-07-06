# Decisions — Application Design（260705-engine-installer）

上流入力: [components.md](components.md)

| ID | 判断 | 理由 | 対応 |
|---|---|---|---|
| AD-1 | インストーラは単一ファイル + 責務別関数群とし、層構造・クラス抽象を作らない | 単一用途スクリプトに拡張性の作り込みは Right-Sizing 違反。dev-scripts の既存慣行とも一致 | components.md |
| AD-2 | AMADEUS.md 変換は純関数 `transformAmadeusMd` に分離する | eval の双方向検査（FR-2.6）が I/O なしで直接テストできる | component-methods.md |
| AD-3 | 除去リストの見出しが原本に実在しない場合、インストーラ自身も throw する | eval だけでなく実行時にもリスト陳腐化を検出（ピア協議 Q2 補足の双方向整合の実行時版） | component-methods.md |
| AD-4 | hooks 配線の正は manifest 定数とし、配布元 settings.json からの動的抽出はしない | 配布元の個人設定（env 等）の混入を構造的に排除。配線 11 entry は feasibility で実測済み | components.md |
| AD-5 | smoke の実行方法は O-2 として functional-design で確定する（本ステージでは契約だけ置く） | doctor の起動形態（インストール先での bun 実行パス）は実装詳細のため | component-methods.md |
| AD-6 | mergeSettings は「同一イベント・同一 matcher の hooks ブロックが複数存在する」実データ構造（実測: PostToolUse に同一 matcher の複数ブロックあり）を前提に設計する。ブロック構造の正規化はせず、matcher+command キーの重複排除だけを行う | 実 settings.json の構造を壊さない（CON-2）。詳細契約は functional-design で確定（reviewer 指摘 5 の申し送り） | component-methods.md |
