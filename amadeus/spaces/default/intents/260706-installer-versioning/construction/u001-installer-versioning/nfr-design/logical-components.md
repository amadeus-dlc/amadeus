# Logical Components — u001-installer-versioning（260706-installer-versioning）

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、application-design の [component-dependency.md](../../../inception/application-design/component-dependency.md)

NFR の担い手をコンポーネントへ対応付ける（application-design の 9 コンポーネント + 既存関数）。

| NFR | 担うコンポーネント |
|---|---|
| REL-1 | ManifestStore（main 末尾 1 回）+ ThreeWayJudge（グローバル優先規則） |
| REL-2 | TrackedWriter（judge → backup → write の順序を関数内に固定）+ BackupWriter |
| REL-3 | SourceCommitResolver |
| SEC-1 | ManifestStore（スキーマ関数） |
| SEC-2 | ManifestStore.read 直後の assertSafeRelPath（新規の検証ヘルパ） |
| SEC-3 | SourceCommitResolver |
| PERF-1 | TrackedWriter（1 read + 1 write + 1 hash）|
