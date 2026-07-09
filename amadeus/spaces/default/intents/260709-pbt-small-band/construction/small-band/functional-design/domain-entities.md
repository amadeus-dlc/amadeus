# Domain Entities — pbt-small-band(対象型と seam)

> 上流: inception/requirements-analysis/requirements.md(FR-2〜FR-5 の対象型)に基づく。

## 対象ドメイン型(packages/setup、変更なし — テスト対象として列挙)

- `SemVer`(`src/domain/semver.ts`): brand 型+スマートコンストラクタ `SemVer.parse`(Result 返し)、`format(): v${string}`、比較は `semver-factory.ts:15-27`(**同 major.minor.patch の prerelease は非比較** — factory:20)
- `VersionSpec`(`src/domain/version-spec.ts`): `SemVer.parse` に閉じる smart constructor
- `Manifest`(`src/domain/manifest.ts`): parse / build / toJSON、重複 path 拒否の不変条件。FS 依存ゼロ
- `Plan`(`src/domain/plan.ts`): FS 依存あり(readdirSync/statSync:238-240、openSync/readSync:258-262)。純判定 seam のみ本 intent の対象

## 抽出 seam(B3、plan.ts — モジュールレベル named export 化)

| 関数 | 現行 | シグネチャ(変更なし・export のみ付与) |
|---|---|---|
| `classifyAction` | plan.ts:162(private) | `(exists: boolean, force: boolean, cls: FileClass) => PlanAction` |
| `toPlanAction` | plan.ts:209(private) | `(disposition: Disposition) => PlanAction` |
| `classify` | plan.ts:227(private) | `(relPath: string) => FileClass` |

挙動変更なし(export 付与のみ)。FS 依存は seam の外に残す。

## 抽出 seam(B4、amadeus-audit.ts — コア波及)

- 現行: `amadeus-audit.ts:295` インラインの `String(value).replace(/\r?\n/g, "\\n")`(書き)と `:335` の `body.replace(/\\n/g, "\n")`(読み)
- 設計: 書き/読みの対を純関数 `escapeAuditValue(value: string): string` / `unescapeAuditBody(body: string): string` として同ファイル内に export(OQ-2 の解: 既存構造に倣い amadeus-audit.ts 内 — lib への移動は波及を広げるだけで凝集が下がる)
- core 変更のため dist 再生成+promote:self 同一コミット(Mandated)
