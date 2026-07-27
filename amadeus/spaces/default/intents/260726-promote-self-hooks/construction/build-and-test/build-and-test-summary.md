# Build and Test Summary — 260726-promote-self-hooks

上流入力 (consumes 全数): code-generation-plan.md, code-summary.md

## ビルド状態

build-ready / test-ready。全ゲートコマンド green (build-test-results.md 参照)。

## テスト種別インベントリ (戦略: Comprehensive)

| 種別 | ファイル | 備考 |
|---|---|---|
| 単体 | unit-test-instructions.md | 既存 unit の追随更新が主 (新規はサイズ規約で integration へ) |
| 結合 | integration-test-instructions.md | 本変更の中核検証層 (t299 新規 + t-kimi-doctor-arm 更新) |
| 性能 | performance-test-instructions.md | N/A (NFR 性能要件なし — bugfix スコープ) |
| セキュリティ | security-test-instructions.md | ユーザー級 config 書込の保証を既存テストで担保 (新規攻撃面テストなし) |

## カバレッジ期待

- FR-1 (マージステップ): t299 の4経路 (追加/noop/replace/非発火) + --check hermetic ピン
- FR-2 (doctor 文言分岐): t-kimi-doctor-arm の3ケース (自己開発/配布/workspaceDir 省略)
- 実地検証: WT での promote-self --apply が実 config に対し冪等 noop で発火

## 既知の制限・残件

- e2e t-print-kimi-doctor.serial.test.ts は LIVE GATE つきのため未実行 (期待値は両文言共通の部分文字列で整合確認済)
- wall-clock drift 2件 (t-codex-hooks-migration, t225) は本変更無関係の既存事象。サイズ宣言更新は別途
- bolt マージ (amadeus-bolt complete --merge)、ワークスペース成果物 (codekb/intent record/.kimi-code scope レジストリ) のコミットはゲート承認後
- OQ-1 (managed block 消失シナリオの犯人追跡) は別 intent 候補
