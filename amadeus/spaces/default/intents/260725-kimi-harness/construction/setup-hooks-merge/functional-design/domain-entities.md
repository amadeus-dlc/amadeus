上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Domain Entities — setup-hooks-merge

requirements.md の FR-3 と components.md C3、component-methods.md の C3 インターフェースをエンティティとして定義する。

## Entity: ManagedBlock(マーカー囲み TOML 断片)

- `# >>> amadeus-kimi-hooks >>>` / `# <<< amadeus-kimi-hooks <<<` で囲まれた文字列
- 内容は snippet 正本(dist/kimi 同梱)の `[[hooks]]` 群 + `[[permission.rules]]` 群
- 識別子: マーカー行そのもの(正規表現で一意に検出)。**重複検出の扱い**: 過去の異常で managed block が2組以上存在する config は loud fail とし、自動修復しない(手動解決を案内。静かに一方を消す/選ぶ判断を機械にさせない)

## 適用範囲

- U3 の完了定義(unit-of-work.md)と unit-of-work-story-map.md の FR-3/FR-7c 行に対応するエンティティ
- services.md の判定(実行単位は短命・無状態)により、エンティティ間の共有状態は導入しない

## Entity: MergePlan

- `{ action: "add" | "replace" | "noop", diffText: string }`
- plan report への差分表示は `diffText` を使う
- loud fail は plan 段階で IoError として表現(Result 型の既存流儀)

## Entity: Backup

- `config.toml.amadeus-backup-<ISO8601>` ファイル。書込み前に作成し、setup は削除しない

## Entity: KimiHome(config.toml の所在解決)

- `$KIMI_CODE_HOME` 環境変数があればそれ、なければ `~/.kimi-code`
- 解決は1箇所に集約し、doctor(Bolt 4)と共用できる形にする

## 関係

- snippet 正本 --renderManagedBlock--> ManagedBlock --planMerge--> MergePlan --(confirm)--> applyMerge + Backup --> config.toml
- ManagedBlock --removeManagedBlock(configText, block)--> config.toml(マーカー領域のみ除去。block は内容検出の identity 参照)
