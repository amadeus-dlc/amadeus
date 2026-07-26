# Decisions(ADR)— metrics 可視化(B1 後続)

上流入力(consumes 全数): requirements.md, architecture.md, component-inventory.md, team-practices.md

## ADR-1: 新規 `scripts/metrics-visualize.ts` として実装する

- **Context**: requirements.md FR-1。codekb architecture.md の挿入点3案(timeseries へ --html / 新規スクリプト / CI 内 inline script)
- **Decision**: 新規スクリプト(案2)。timeseries から読み手 seam を import し fs 書き込みは自前 — retention(metrics-retention.ts:17)と同型
- **Consequences**: AC-1c 契約(metrics-timeseries.ts:3-4)不変。metrics 系は 3→4 ファイル構成へ。lint 対象に自動包含(biome の scripts/ スコープ)
- **Alternatives Rejected**: (a) timeseries へ `--html` 追加 — AC-1c「must not import any fs write API(grep-checkable)」に正面抵触、契約変更+既存テスト改修の連鎖を招く (b) ci.yml 内の inline スクリプト — テスト不能・ローカル手動実行(Q2=C)を満たせない
- **セキュリティ/コンプライアンス**: 変化なし(ネットワーク I/O なし、入力はリポジトリ内 JSON のみ、出力はエスケープ経由 — FR-3)

## ADR-2: 値整形・数値抽出は timeseries 側の export を単一正本とする

- **Context**: requirements.md FR-3 の委譲(「formatValue の export 昇格か別共有関数か」)。parseSnapshot は values 個値を unknown のまま返す(metrics-timeseries.ts:18-19)
- **Decision**: (i) 既存 `formatValue`(:117-119)を export へ昇格(実装不変) (ii) `numericValue(v: unknown): number | null` を timeseries に新設(有限 number のみ通す)。visualize のチャート座標・強調判定はすべて numericValue 経由
- **Consequences**: 表示文字列(formatValue)と数値抽出(numericValue)の妥当性定義が reader 側の1箇所に集まる。NaN/Infinity が SVG 座標へ流れる無音破壊(codekb Q-M3)を型で封鎖
- **Alternatives Rejected**: (a) visualize 側に同等関数を新設 — 妥当性定義の二重実装となり、writer/reader/pruner がパーサを共有する既存契約(metrics-retention.ts:8-9)の精神に反する (b) parseSnapshot の戻り値で values を number | null へ正規化 — parseSnapshot の公開契約(values は unknown のまま、metrics-timeseries.ts:18-19 の明文)の変更となり、既存消費者(renderDigest / renderCollectorTable / retention)と t230 系テストへ改修が連鎖するため過大
- **セキュリティ/コンプライアンス**: 変化なし

## ADR-3: サイズ上限のミラー定数は実駆動テストでピンする(snapshot writer 非改変)

- **Context**: FR-6 の MAX_HTML_BYTES = 16_384 × METRICS_RETENTION_KEEP_LAST × 2。16_384 は metrics-snapshot.ts:150 の**無名リテラル**であり named export が存在しない。scope-document Out 3 は「snapshot writer / retention の変更」を禁止
- **Decision**: `METRICS_RETENTION_KEEP_LAST` は retention の既存 export を import。16_384 は visualize 側にミラー定数(コメントで :150 由来を明記)として置き、**unit テストが writer の export 済み `serializeSnapshot` を 16_384 超の入力で実駆動して throw をピン**する(ミラーが現実から乖離したらテストが赤くなる)
- **Consequences**: writer 完全非改変で drift 検出可能。snapshot への import 依存も回避(component-dependency.md の制約 — lizard/test-size への推移依存を引き込まない)
- **Alternatives Rejected**: (a) snapshot 側で named constant 化して export — 挙動不変でも scope Out「writer の変更」に抵触、260712 の承認境界を破る (b) コメントのみのミラー — 乖離が無音(検証劇場 Forbidden の精神に反する)
- **セキュリティ/コンプライアンス**: 変化なし

## ADR-4: escapeHtml は visualize ローカルの純関数として新設する

- **Context**: 既習の coverageHtmlEscape は tests/run-tests.ts:526(テストランナー所有)
- **Decision**: visualize 内に 5文字(& < > " ')エスケープの小関数を新設し unit テストで固定
- **Consequences**: scripts → tests への import を作らない(依存方向の統制)。約5行の重複
- **Alternatives Rejected**: (a) run-tests.ts から import — 本番系スクリプトがテストランナーへ依存する方向逆転 (b) 共有モジュールへ抽出 — 変更理由が異なる2消費者(テストレポート/メトリクスレポート)の統合は意図ベースの重複排除ノルムに反する
- **セキュリティ/コンプライアンス**: エスケープ対象は commit SHA・tool_version・キー名等の埋め込み文字列全数(FR-3)

## ADR-5: チャートは折れ線 SVG・キー単位の線形スケール

- **Context**: FR-4 S1(1画面把握)。値のスケール差が大きい(coverage.percent ≈ 80 vs loc.tests ≈ 204,428 — codekb 実測)
- **Decision**: コレクタごとに1節、キーごとに1折れ線(キー単位 min/max の線形 y スケール)。null(欠測)はセグメント分断。各点 `<title>` に captured_at + commit 12桁(S3)
- **Consequences**: スケール差はキー別チャートで吸収(正規化・対数軸の複雑さを持ち込まない)。未知コレクタ・キーは discoverCollectors/unionValueKeys のデータ駆動で自動追随(R2)
- **Alternatives Rejected**: (a) コレクタ単位の複合チャート — スケール差で小さい系列が潰れ S1 を満たさない (b) 対数軸 — 0 値(failedFiles 等)の扱いが複雑化し、閾値強調(S2)の直感性を損なう
- **セキュリティ/コンプライアンス**: 変化なし
