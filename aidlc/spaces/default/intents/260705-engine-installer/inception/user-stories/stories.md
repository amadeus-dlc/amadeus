# User Stories — Engine Installer（260705-engine-installer）

上流入力: [requirements.md](../requirements-analysis/requirements.md)、[personas.md](personas.md)

## ストーリー

| ID | ストーリー | 対応 FR | MoSCoW | 受け入れ条件 |
|---|---|---|---|---|
| US-1 | P1 として、clone したリポジトリから 1 コマンドで自分の workspace へ Amadeus を導入したい。手作業の symlink 張りや設定編集をしたくないため | FR-1.1〜1.7、FR-1.11 | Must | `bun run amadeus:install -- --target <ws>`（または直接実行）が exit 0 で完了し、全工程（wireframes.md の 5 工程 = 配置 / skills / symlink / settings マージ / スモーク）が番号付きで表示され、スモークが pass する |
| US-2 | P1 として、導入をやり直しても壊れないでほしい。試行錯誤や更新で繰り返し実行するため | FR-1.8、FR-2.3 | Must | 2 回実行して差分が収束し、settings.json の hooks に重複が生まれない |
| US-3 | P1 として、自分の既存資産（env、permissions、amadeus* 以外の skills、aidlc/ 記録）には触れないでほしい | FR-1.3、FR-1.6、FR-1.9、FR-2.11 | Must | マージ後も settings.json の非対象キーが不変、amadeus* 以外の既存 skills がバイト単位で無傷、aidlc/ に変更なし |
| US-4 | P1 として、衝突（symlink 位置に自分の実体 dir、壊れた settings.json）があるときは、壊さずに止まって直し方を教えてほしい | FR-1.5、FR-1.6、FR-2.9 | Must | エラー終了し、衝突対象が無傷で、対象と回復方法が stderr に出る |
| US-5 | P1 として、`--target` の指定を間違えたときは、何も変更される前に止まって指定の直し方を教えてほしい | FR-1.1、FR-2.10 | Must | target 不在・非ディレクトリ・書き込み不可の 3 パターンで、工程開始前にエラー終了し、`--target` の指定修正が案内される |
| US-6 | P1 として、導入後に何を確認すればよいかを README で知りたい | FR-3.1 | Must | README の手順どおり doctor と amadeus-validator が実行できる |
| US-7 | P2 として、Codex では `.agents/` の配置だけで Amadeus が成立してほしい | FR-4.1 | Should | eval の `.agents/` 完全性検査が pass する（追加配線なし） |
| US-8 | P3 として、配布の成立が CI で継続検証されてほしい。並行開発でエンジンレイアウトが変わったら早期に気づきたいため | FR-2.1〜2.10 | Must | `npm run test:it:installer` が test:all の連鎖で実行され、マニフェストと実レイアウトの不一致で fail する |
| US-9 | P1 として、利用者向けの AMADEUS.md には本体開発向けの記述（parity、promote、dev-scripts）が混ざらないでほしい | FR-1.4、FR-2.6 | Should | (負方向) 生成された AMADEUS.md に dev 参照パターンが存在せず、(正方向) 節除去リストの見出しが原本 AMADEUS.md に実在する |

## 依存関係と INVEST 適合

- 依存: US-2〜US-5・US-9 は US-1（導入の成立）に依存する。US-8（eval）は全ストーリーの検証手段であり、TDD の実装順では最初に骨格を作る（NFR-1）。US-6（README）は US-1 の確定後に書ける。US-7 は US-1 の配置結果だけに依存する。
- INVEST: 各ストーリーは独立に検証可能（受け入れ条件が eval 項目または手動確認可能な出力に対応）、交渉可能（MoSCoW の Should 2 件は delivery-planning で順序調整可）、価値がある（ペルソナ別の関心に対応）、見積可能・小さい（単一 PR 内のタスク粒度）、テスト可能（各行の受け入れ条件）。

## ストーリー外（明示）

- Windows での導入（BL-2）、bunx 経由の導入（BL-1）は本 Intent のストーリーに含めない（Won't）。
