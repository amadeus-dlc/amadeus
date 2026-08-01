# Business Rules — u4-tools-distribution

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## BR-U4-1: TDD 必須

挙動追加のため TDD 既定(NFR-2)。M1〜M4 の各 seam へ失敗テスト先行(t379)。

## BR-U4-2: SessionStart 自動化の禁止

一括 compose は明示 verb 実行時のみ(FR-B1 の P4 境界 — services.md の CLI 面契約)。hook からの自動起動を仕込まない。

## BR-U4-3: digest 対称の落ちる実証

M2 の digest 拡張は「tools を含む compose → drop が全 tools を削除する」correctness テストに加え、「digest 算出元を stages のみに戻した変種で drop が拒否される」ことを注入で実証(falling-proof — AD reviewer が指摘した欠陥形状そのものを恒久ピン)。

## BR-U4-4: 検証コマンド集合

BR-U1-6 と同一+t379+既存 plugin テスト群(t303/t310/t311/t356/t341 — services.md の配布面契約)全 green。

## BR-U4-5: 他ハーネスツリーへの書込は compose 経路のみ

.codex/.cursor 等への書込は compose エンジンの正規経路に限る — 手動コピー・シンボリックリンクで代替しない(検証劇場回避+drop 可能性の保証)。
