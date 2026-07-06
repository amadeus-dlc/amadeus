# Component Methods — 260706-installer-versioning（Issue #543）

上流入力: [components.md](components.md)、refined-mockups の [mockups.md](../refined-mockups/mockups.md) / [interaction-spec.md](../refined-mockups/interaction-spec.md)

シグネチャは実装確定形ではなく責務の輪郭（functional-design で最終化）。

| メソッド | 入出力 | 要点 |
|---|---|---|
| `readManifest(target): Manifest \| null` | manifest JSON か null（不在） | parse 失敗は InstallError（fix: 付き） |
| `writeManifest(target, m): void` | files を辞書順 stringify | 全コピー後 1 回。途中失敗時は呼ばれない |
| `judge(recorded, newHash, currentHash \| null): "overwrite" \| "backup" \| "restore" \| "skip"` | 純関数 | bootstrap は recorded = null で「不一致 = backup」へ写像（FR-2.4） |
| `trackedWrite(relPath, content): WriteResult` | 書き込み + 計上 | judge の結果に従い BackupWriter を先行呼び出し。WriteResult = { hash, action } |
| `backup(relPath, currentContent): void` | 時刻 dir へ保存 | dir は初回のみ mkdir（mkdtemp ではなく決定論 path） |
| `enumerateDist(root): { relPath, content }[]` | 配布元 root の再帰列挙 | FR-1.1 の全ファイル計上と判定単位の供給。DistEnumerator |
| `scanObsolete(root, distSet): ObsoleteResult[]` | 管理対象 root 内で新配布物に無い導入先 path | 改変分は backup → 削除、未改変は削除。各コピー段階の削除パスとして実行（copySkills の旧 無条件 rmSync を置き換え） |
| `reportSummary(results): void` | stdout | ヘッダ件数 = backed up 総数 = 列挙行数。内数行・restored 行は該当時のみ |
| `printVersionInfo(target): never` | exit 0 / 1 | 1 行形式は mockups.md 第 3 節の文字列 |
| `resolveSourceCommit(repoRoot): string` | 40 桁 hex か "unknown" | child_process 不使用なら Bun.spawnSync（既存依存の範囲で functional-design が確定） |
