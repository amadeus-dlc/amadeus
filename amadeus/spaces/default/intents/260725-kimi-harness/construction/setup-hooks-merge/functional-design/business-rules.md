上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Business Rules — setup-hooks-merge

requirements.md の FR-3 と components.md C3、component-methods.md の C3 インターフェースから導出する不変条件。

## 書き込みの不変条件

- BR-1: managed block 外の config 内容は一切変更しない(既存 `[[hooks]]`・ユーザーの他記述をバイト保持)
- BR-2: マーカーは `# >>> amadeus-kimi-hooks >>>` / `# <<< amadeus-kimi-hooks <<<` で固定し、識別は**二重方式**(マーカー行 + `.kimi-code/hooks/amadeus-kimi-adapter.ts` コマンド行の内容シグネチャ)とする。kimi CLI が config を再シリアライズしてコメントを落とすため(Bolt 2 実機発見)、マーカー欠落時も内容で検出して replace・除去できること。adapter シグネチャのないユーザー独自ルールは content 検出しない(誤飲み防止)
- BR-3: 冪等: 同一内容の再適用は noop、旧内容は replace。重複ブロックを作らない
- BR-4: 書き込みは必ずバックアップ作成後・atomic(既存 apply-write の tmp→rename)。途中失敗で config を壊さない
- BR-5: TOML 構文が読めない config は loud fail。推測で修復・上書きしない
- BR-6: UX は既存インストーラ流儀に従う(plan report 差分表示 → wizard confirm → 拒否時は変更なし + 手動手順)。kimi 独自の導線を作らない(ADR-5)
- BR-7: バックアップファイルはユーザーが消せる場所に残し、setup 側で自動削除しない

## 適用範囲

- U3 の完了定義(unit-of-work.md)と FR 対応(unit-of-work-story-map.md の FR-3/FR-7c 行)に適用する
- requirements.md の OC-1(明示承認・バックアップ・マーカー・除去手順)が根拠
- services.md の判定(実行単位は短命)により、rules は全て呼出単位の不変条件とする
