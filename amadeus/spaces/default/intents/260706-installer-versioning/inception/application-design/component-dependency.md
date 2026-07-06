# Component Dependency — 260706-installer-versioning（Issue #543）

上流入力: [components.md](components.md)、[component-methods.md](component-methods.md)

```text
main
 ├─ parseTargetArg（--version-info 対応）
 ├─ VersionInfoCommand ── ManifestStore.read（parse 失敗 = 専用 catch で fix: + exit 1）
 ├─ SourceCommitResolver
 ├─ ManifestStore.read（previous install / bootstrap 判定）
 ├─ [1/5] engine   = copyEngine（書き換え）
 │    ├─ DistEnumerator（engine 7 dirs の再帰列挙）
 │    ├─ TrackedWriter ── ThreeWayJudge（純関数）── BackupWriter（改変時のみ）
 │    ├─ ObsoleteScanner（root 内の削除パス。改変 = 退避 → 削除）── BackupWriter
 │    └─ placeAmadeusMd（変換後内容を TrackedWriter へ）
 ├─ [2/5] skills   = copySkills（書き換え。stale-skill 無条件 rmSync は ObsoleteScanner へ統合）
 │    └─（engine と同じ列挙 → 判定 → 削除パス構成）
 ├─ [3/5] symlinks = relinkClaude（既存のまま。ハッシュ対象なし = 非接続）
 ├─ [4/5] settings = mergeSettings ── TrackedWriter（AD-6 の特則: 新内容 = merge 結果）
 ├─ [5/5] smoke（既存のまま）
 ├─ SummaryReporter（退避総数 = 列挙数、廃止内数、restored 件数）
 └─ ManifestStore.write（成功時のみ・最後に 1 回）
```

- 循環依存なし。ThreeWayJudge / transformAmadeusMd は純関数で eval から単体検証可能。
- FR-2.6 の廃止走査は各コピー段階（1〜2）の削除パスとして実行する。refined-mockups の内部順序項目 4 はこの形で実現され、観測可能な挙動（summary 専用の内数行、退避先の時刻 dir）は不変。
- 依存追加なし（node:crypto の createHash と既存標準 API のみ。sha256 は repo 慣行 = generate-parity-baseline.ts と同じ）。
