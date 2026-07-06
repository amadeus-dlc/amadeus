# Domain Entities — u001-installer-versioning（260706-installer-versioning）

上流入力: [business-logic-model.md](business-logic-model.md)、application-design の [component-methods.md](../../../inception/application-design/component-methods.md)

| エンティティ | 定義 | 備考 |
|---|---|---|
| InstallManifest | 版とハッシュ表（business-logic-model の型） | 導入先 target 直下の単一 JSON |
| WriteResult | 1 書き込みの結果（relPath、hash、action、obsolete） | SummaryReporter と manifest 構築の入力 |
| WriteAction | created / overwritten / backed-up / restored / skipped | 判定表の出力語彙。eval の期待値語彙と一致させる |
| 退避物 | `.amadeus-install-backup/<時刻>/<relPath>` | 実行につき時刻 dir 1 個。manifest 追跡対象外 |
| ObsoleteResult | 廃止 path と退避有無（business-logic-model の型） | scanObsolete の出力。summary の obsolete 内数の入力 |
| 管理対象 root | engine 7 dirs、amadeus* skills ×2 root、AMADEUS.md、settings.json | DistEnumerator / scanObsolete の走査域。skills root の走査は配布元・導入先とも `amadeus*` prefix フィルタを適用（非 amadeus skill 不可侵 = #451 eval の既存 assertion 名 FR-2.11） |
