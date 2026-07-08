# Unit of Work — `@amadeus-dlc/setup`(installer-distribution)

> ステージ: units-generation (2.7) / 作成: 2026-07-08
> 上流入力: `../application-design/components.md`・`component-methods.md`・`services.md`・`component-dependency.md`・`decisions.md`、`../requirements-analysis/requirements.md`、`../user-stories/stories.md`
> 決定の出典: `units-generation-questions.md` Q1・Q2

## Unit 定義

### U1: setup-foundation(規模: M)

- **内容**: `packages/setup` のパッケージ骨格(package.json 正メタデータ、bin、`bun build` 単一バンドル設定 — ADR-002)、lint(Biome)/型検査(tsc)配線(team.md Mandated、同一 PR)、基盤3モジュール(resolver / fetcher / manifest)の実装
- **所有**: バージョン解決(FR-006)、アーカイブ取得+リトライ+エラー分類(FR-012)、マニフェスト読み書き(FR-016)、ビルドパイプライン
- **配置**: `packages/setup` 内(単一パッケージの一部)
- **規模の正当化**: 3モジュールは各々小さい(HTTP ラッパ+SemVer 比較+JSON スキーマ)が、パッケージ骨格と検査配線の初期コストを含むため M。**再利用棚卸し**: 既存 tests/run-tests.sh 4層ランナー・biome.json・tsconfig 群・CI ジョブをそのまま使い、新規のテストランナー/CI ジョブ/ツールは追加しない
- **制約**: 実行時依存ゼロ(NFR-005)。ADR-003 の REST+codeload 契約

### U2: install-flow(規模: L)

- **内容**: `install` サブコマンド一式 — cli(引数解析・ヘルプ・ウィザード・TTY 判定)、planner(install 側: 衝突・導入済み検出)、applier、verifier、reporter
- **所有**: CLI 契約(対称文法)、FR-003/004/010/011/013、US-A1〜A7
- **規模の正当化**: 8モジュール中5つの初版を含む最大 Unit。ただし planner/applier/reporter は U3 と共有される基盤でもあり、ここで plan/apply 分離(application-design Q1)を確立する。walking skeleton の最小縦スライス(取得→展開→検証)はこの Unit の中核経路
- **制約**: 導入済み検出で中断+upgrade 案内(FR-004、`--force` 例外)

### U3: upgrade-flow(規模: L)

- **内容**: `upgrade` サブコマンド一式 — planner(upgrade 側: 導入状態分類・md5 照合・バージョン境界)、applier の退避経路(`$namefile.$timestamp.bk`)、差分レポート
- **所有**: FR-005/007/008/009 の upgrade 側、US-B1〜B5
- **規模の正当化**: U2 の planner/applier/reporter 基盤を再利用するため新規コードは分類・境界判定・退避に集中する。それでもバージョン境界5ケース+ファイル分類3種の組み合わせテストが厚く L
- **制約**: NFR-002(サイレント破壊禁止)。`--force` でもバックアップ維持

### U4: publish-readiness(規模: M)

- **内容**: npm 公開整備 — pack ファイルリスト契約テスト(FR-018、integration 層)、publish 手順書(FR-015: ビルド→検証→手動 publish→公開後確認、`vX.Y.Z` タグ発行、setup 独立 semver・プレリリース運用)、`npm pack --dry-run` の実ツール検証
- **所有**: FR-001(メタデータ)/015/017/018、US-C1〜C3
- **規模の正当化**: コードは薄い(テスト+docs 中心)が、「落ちる実証」(team.md Mandated)として失敗注入の実証を含むため M
- **制約**: CI 自動 publish はスコープ外(CON-004)。root package.json の I1/I2 是正もここで実施

### U5: docs-rollout(規模: S)

- **内容**: README の導入セクションをワンライナーへ刷新(FR-014)、CHANGELOG・framework 版バンプ・README バッジ同期(CON-006、t68)
- **所有**: FR-014、US-C4、成功指標2の達成確認
- **規模の正当化**: docs のみ。t68 が同期を機械検証するため作業は小さく S
- **制約**: バンプは user-visible 変更を含む PR で実施(Mandated)

## 配置モデル

全 Unit は単一の配布物 `packages/setup`(+U5 の repo docs)に属する。独立デプロイはなく、publish 単位は1パッケージ(services.md のトポロジーどおり)。
