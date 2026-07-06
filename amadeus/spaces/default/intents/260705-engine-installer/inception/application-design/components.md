# Components — Engine Installer（260705-engine-installer）

上流入力: [requirements.md](../requirements-analysis/requirements.md)、[interaction-spec.md](../refined-mockups/interaction-spec.md)

## コンポーネント構成

インストーラは単一ファイル `scripts/amadeus-install.ts` に、責務ごとの関数群として実装する（単一用途スクリプトに層構造の抽象は作らない = Right-Sizing）。専用 eval は `dev-scripts/evals/installer/check.ts` に置く。

| コンポーネント | 責務 | 対応 FR |
|---|---|---|
| manifest（定数） | 配布対象の宣言的列挙: エンジン 7 dir、skills glob 2 系統、symlink 7 entry、AMADEUS.md 節除去リスト、dev 参照パターン、hooks 配線。`aidlc/` はいかなる形でも対象に含めない（FR-1.9、CON-1 の構造的担保） | FR-1.10、FR-1.9 |
| cli（entry） | 引数解釈（--target 必須）、事前チェック、工程の逐次実行と表示、終了コード | FR-1.1 |
| copyEngine | エンジン 7 dir の全置換コピー | FR-1.2 |
| placeAmadeusMd | transformAmadeusMd の結果を対象 workspace root の AMADEUS.md へ書き込む（工程 [1/5] 内で copyEngine に続けて実行） | FR-1.4 |
| copySkills | amadeus* skills 2 系統の全置換コピー（非対象 skills 不変） | FR-1.3 |
| transformAmadeusMd | 節除去リストに基づく AMADEUS.md の変換生成 | FR-1.4 |
| relinkClaude | .claude/ 7 entry の相対 symlink 再作成（非 symlink 実体はエラー中断） | FR-1.5 |
| mergeSettings | settings.json の hooks 限定冪等マージ（解析不能はエラー中断） | FR-1.6 |
| smoke | 配置直後の軽量スモーク実行 | FR-1.7 |
| eval harness | 一時 workspace への実インストール + 検証群（FR-2.1〜2.11） | FR-2 系 |

## 配置

- `scripts/amadeus-install.ts` — 利用者向け入口（新設 dir。ピア協議 Q1 = A）
- `dev-scripts/evals/installer/check.ts` — 開発用検証（test:it:installer）
- `package.json` — `amadeus:install`、`test:it:installer` の 2 script 追記（CON-8、FR-1.11、FR-2.4）
- README（FR-3.1）は実行時コンポーネントではないため本設計の対象外とし、Construction（code-generation）で直接執筆する
