# Components — 260706-installer-versioning（Issue #543）

上流入力: [requirements.md](../requirements-analysis/requirements.md)、[stories.md](../user-stories/stories.md)、[architecture.md](../../../../codekb/amadeus/architecture.md)、[component-inventory.md](../../../../codekb/amadeus/component-inventory.md)、[team-practices.md](../practices-discovery/team-practices.md)

既存アーキテクチャ（#451 = 単一スクリプト scripts/amadeus-install.ts、純関数 + 手続きの平坦構成）を維持し、同一ファイル内の関数群として追加する。新規ファイル・新規依存は作らない。

| コンポーネント | 責務 | 対応 FR |
|---|---|---|
| ManifestStore | `.amadeus-install.json` の読み込み（不在 = bootstrap 判定）と書き出し（辞書順、全コピー後 1 回） | FR-1 |
| TrackedWriter | すべてのコピー対象書き込みの単一入口。書き込み内容の sha256 を計上し、書き込み前に ThreeWayJudge を通す | FR-1.1、FR-2.1 |
| ThreeWayJudge | 記録ハッシュ / 新内容ハッシュ / 導入先現状ハッシュから象限（overwrite / backup-then-overwrite / restore / skip）を決める純関数 | FR-2.1、FR-2.4 |
| BackupWriter | 時刻 dir（実行につき 1 個、遅延作成）へ target 相対 path で退避 | FR-2.2 |
| DistEnumerator | 配布元の管理対象 root（engine 7 dirs、amadeus* skills ×2 root）配下の全ファイルを再帰列挙し、relPath と内容を供給する | FR-1.1、FR-2.1（判定単位の供給） |
| ObsoleteScanner | 管理対象 root 配下の導入先ファイル・skill dir のうち新配布物に無いものを走査し、改変分を退避してから削除する（copySkills の既存無条件 rmSync を置き換える。各コピー段階の内側で実行） | FR-2.6 |
| SummaryReporter | 退避・廃止・restored の件数集計（ヘッダ = 総数 = 列挙数）と summary 行の出力 | FR-2.3、集計ルール |
| VersionInfoCommand | `--version-info` の処理（manifest 読み → 1 行出力 / 不在 = exit 1 + fix:） | FR-3.1〜3.2 |
| SourceCommitResolver | 配布元 repo で `git rev-parse HEAD`（失敗 = "unknown" + 告知） | FR-1.1、確定 5 |

## 既存コンポーネントへの接続（構造変更を明示）

実装の実態（実測訂正）: 書き込みは copyEngine / copySkills の **rmSync → cpSync（ディレクトリ丸ごと削除 → 再帰コピー）×2** と、placeAmadeusMd / mergeSettings の **writeFileSync ×2** である。feasibility 実測 5 の「copyFileSync / writeFileSync の 3 箇所」は誤記（正 = cpSync ×2 + writeFileSync ×2 の 4 経路）であり、本ステージで訂正する。

- **copyEngine / copySkills は全面書き換えになる**: rm → cp の丸ごと置換は「判定前に導入先現状を破壊する」ため、ファイル単位の 3-way と両立しない。DistEnumerator で配布元を列挙 → ファイルごとに TrackedWriter（判定 → 必要なら退避 → 書き込み）→ 同 root の削除パス（ObsoleteScanner = 新配布物に無い導入先ファイルを、改変なら退避してから削除。copySkills の既存 stale-skill 無条件 rmSync はこの経路に統合して置き換える）。
- placeAmadeusMd / mergeSettings は writeFileSync を TrackedWriter 経由へ差し替える（settings.json の特則は decisions.md AD-6）。
- relinkClaude（symlinks）はハッシュ対象の書き込みを持たないため接続しない（AD-5。依存図に非接続として明記）。
- main の起動部へ previous install found / bootstrap / unknown 告知、末尾へ SummaryReporter と ManifestStore.write を接続。
- parseTargetArg を `--version-info` 対応へ拡張（併用必須の検査を含む）。`--version-info` 経路の manifest parse 失敗は runStep を通らないため、専用 catch で fix: 付き stderr + exit 1 に変換する。
