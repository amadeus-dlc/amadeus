# Feasibility Assessment — 260722-tla-plugin

上流入力(consumes 全数): intent-statement(読了・依拠)。competitive-analysis / market-trends / build-vs-buy は market-research SKIP のため設計どおり不在(expected — 内容は補完しない)

## 技術的実現性(Technical Viability)

判定: **GO** — 主要構成要素はすべて実測済みの既存資産の再配置・一般化であり、新規未実証技術はない。

| 構成要素 | 実現性根拠(実測) |
|---|---|
| .tla 外部ファイル化 | モデルは tla-arm.ts:329 に `MODEL_SOURCE` 文字列として実在。外部化は読み込み経路の変更のみ。モデル同一性は fs-tlc-toolchain の moduleIdentity 検証(SOURCE_DRIFT 検出)がそのまま使える |
| run-model-check.ts 一般化 | TLC 実行コア(fs-tlc-toolchain.ts、1456行)は prepare→spawn→normalize の fail-closed 契約込みで実在。実験ハーネス(run-skeleton-ci.ts)から汎用エントリポイントへの切り出しは既存コードの再配線 |
| プラグイン供給 | plugin 合成エンジン(scripts/plugin-composition.ts)実在。stages コピー+sensors シーム追記は test-pro リファレンス+t254 で E2E 実証済み。formal-model-check ステージ+完備性 sensor は宣言可能な貢献種別に収まる |
| CI 統合(Linux + Docker) | Q3 ユーザー裁定: GitHub ランナー自体が隔離環境のため sandbox-exec は不要。TLC は既成 Docker イメージ(digest 固定)で供給(Q4/Q5)。ubuntu ランナーで完結し、macOS ランナー(分単価10倍)依存を解消 |
| 完備性 sensor | sensor 機構(deterministic manifest + fire)実在。モデル⇔実装対応のドリフト検出(Q4 裁定 @intent-capture)は既存 sensor と同型の決定的述語で実装可能 |

## リスク分析(Risk Analysis)

- **最大の技術リスク**: fs-tlc-toolchain の実行 provider が DarwinSandboxExecProvider(sandbox-exec)前提でハードコードされている点。Linux CI(Docker 経由)対応には実行 provider の抽象化(ローカル macOS = sandbox-exec / CI Linux = Docker またはコンテナ内直接実行)が必要 — 規模は provider 境界の追加であり、fail-closed 契約(completion marker + state 統計)は provider 非依存に保てる
- **供給チェーンリスク**: 既成 Docker イメージ依存(Q5)は digest 固定で改竄・変動を遮断。イメージの実在・内容(TLC 版・JDK 系列)は設計段で実測確認してから確定する(external-seam 実測ノルム)
- **実行時間リスク**: 実験実測で FormalElection の完全探索は CI タイムアウト(30分)内に完走済み。モデル追加時のスケールは将来intentの検討事項

## AWS/インフラ観点(aws-platform 視点)

- 本intentはクラウドインフラを新設しない。CI は GitHub Actions ホステッドランナー(ubuntu)のみで、AWS アカウント・サービスへの依存はゼロ
- ランナーコスト: workflow_dispatch 専用(既決の二層検証態勢)のため発火は手動時のみ。Linux 化により macOS 分単価10倍の懸念も消滅

## コンプライアンス/セキュリティ観点(compliance 視点)

- 規制要件(PCI/HIPAA 等)への該当なし — 対象は OSS フレームワークの開発検証基盤
- サプライチェーン統制: Docker イメージは digest 固定 pull(Q5)、モデル/設定バイトは既存の identity 検証(SOURCE_DRIFT)で改竄検出
- Bun-only Forbidden との整理は Q1 裁定(opt-in 例外の明文化+JDK/Docker 不在時 loud エラー)で充足 — 文書化義務は constraint-register に登録

## 総合判定

**GO**(条件なし)。全判断が grilling で裁定済み、未実証の外部前提は「既成イメージの具体選定」のみで、設計段の実測確認タスクとして raid-log に登録する。
