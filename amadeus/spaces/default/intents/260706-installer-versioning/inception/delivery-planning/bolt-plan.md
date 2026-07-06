# Bolt Plan — 260706-installer-versioning（Issue #543）

上流入力: [unit-of-work.md](../units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md)、[components.md](../application-design/components.md)、[mockups.md](../refined-mockups/mockups.md)、[requirements.md](../requirements-analysis/requirements.md)、[team-practices.md](../practices-discovery/team-practices.md)

## Bolt 一覧（2 本直列、対象 Unit = u001-installer-versioning）

| Bolt | 内容 | 対応 FR / eval | gate |
|---|---|---|---|
| B001-manifest-skeleton【walking skeleton】 | 端から端まで通る最薄の縦切り: DistEnumerator + TrackedWriter（判定なしの計上のみ）+ ManifestStore（読み書き）+ SourceCommitResolver + `--version-info`（正常 / 不在 / usage エラー）+ previous install found 告知。copyEngine / copySkills のファイル単位化はこの Bolt で行う（計上の前提）が、3-way 判定は常に overwrite（従来挙動と同一） | FR-1、FR-3、FR-4.1（従来出力維持）/ eval (a)(e) 先行 RED | 人間の個別確認（auto 委任の例外） |
| B002-threeway-backup | ThreeWayJudge（4 象限 + bootstrap）+ BackupWriter + ObsoleteScanner（stale rmSync の置き換え）+ settings 特則（AD-6）+ 退避・restored・obsolete の告知と集計 + README 英日 + 既知の限界注記 | FR-2、FR-5.1 (b)(c)(d)(f)(g)(h)、FR-6.1 / eval 先行 RED | auto 委任 |

## walking skeleton の定義（B001）

「導入 → manifest 記録 → 版確認」の全経路が実配線で動き、eval が端から端を検証する。B001 完了時点で利用者可視の挙動変化は「manifest が増える + previous install found 行 + --version-info が使える」だけで、更新の上書き挙動は従来と同一（3-way は B002 まで常に overwrite）。

## 実行様式

- 直列（B001 の merge を待たず同一 branch 上で B002 へ進むが、B001 の gate 承認 = 人間個別確認を待ってから B002 に着手する）。
- PR は Intent 全体で 1 本（draft）。Bolt gate は Bolt 単位の中継/個別承認で刻む（本日の #506 以降の運用と同一）。
- 各 Bolt とも TDD: eval の追加 assertion を先行して RED を確認してから実装する（DR 系実践）。
