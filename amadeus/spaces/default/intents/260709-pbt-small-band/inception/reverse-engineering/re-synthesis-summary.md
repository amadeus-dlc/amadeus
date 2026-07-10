# RE 合成サマリ — 260709-pbt-small-band(#697 / #684 Phase B)

> reverse-engineering(2.1)Architect 合成成果物。Developer スキャン(`developer-scan.md`)を最終化。
> #707 新契約(per-intent re-scan 記録)の初運用。

## スキャンメタ(確定値)

- **base**: `none`(`re-scans/` 初レコード、他 intent にも re-scan 記録皆無 → 新契約の「記録皆無なら none」)
- **observed**: `9a2f5c7205795a255f258628710820def2ab3f8c`(`git rev-parse HEAD` 実測)
- **date**: 2026-07-09
- **focus**: packages/setup ドメイン seam(semver/manifest/plan)、setup テスト、#700 size 分類器、amadeus-audit エスケープ、fast-check 導入面
- **差分結論**: `162553b99..HEAD` は焦点領域(`packages/setup/**`・setup テスト・`test-size.ts`・`amadeus-audit.ts`)に触れず(差分は framework/CI/release-sync のみ)。prior codekb 本文が有効なため、本文への反映は最小に留めた。

## 更新したファイル

| ファイル | 種別 | 変更内容 |
| --- | --- | --- |
| `codekb/amadeus/re-scans/260709-pbt-small-band.md` | **新設** | #707 per-intent re-scan 記録の初レコード。base=none / observed / focus / date / 差分の焦点影響 |
| `codekb/amadeus/reverse-engineering-timestamp.md` | 更新 | 鮮度ポインタを本スキャンに上書き(last-writer-wins)。「ベース点の真実源ではない」注記を維持し、per-intent 記録を読む旨を明記 |
| `codekb/amadeus/code-structure.md` | 追記 | 「packages/setup ドメイン seam」節(semver/manifest/plan/version-spec の純関数面 + plan.ts の FS 依存と純判定 seam を file:line 付き)+「#700 test-size 土台」節 |
| `codekb/amadeus/component-inventory.md` | 追記 | ドメイン型 seam・test-size/PBT 支援コンポーネントの棚卸し(file:line 付き) |
| その他 codekb 本文(business-overview / architecture / api-documentation / technology-stack / dependencies / code-quality-assessment) | **無変更** | 焦点領域に差分がなく、prior が有効なため意図的に非更新 |

## 後続ステージへの引き継ぎ

### requirements-analysis 向け

**(a) semver の prerelease 非全順序**
`internal/semver-factory.ts:20` の `isLaterThan` は同 `major.minor.patch` で prerelease 順序を比較しない(コメント「out of scope」)。prerelease 違いの2値は互いに `isLaterThan===false`(同順位)。**全順序(非反射・非対称・推移)を主張する PBT は stable 集合に閉じる**か、同順位を明示許容する形で書く。prerelease を跨ぐ全順序を主張すると反例が出る(要件で「stable 全順序」と「prerelease は latestStableOf から除外(BR-F02)」を分けて固定すべき)。

**(d) fast-check の #688 確定方針**(requirements にテスト可能な契約として落とす)
1. 分類: PBT は Developer Testing 軸足、置き場所は既存 unit スイート内。高 numRuns の QA 深掘りは新規 CI ジョブを作らず既存 `--release` テスト層に接続。
2. numRuns 層別: 通常 CI=既定(低)/ release 層=高。予算は #684 の size 軸と同じ表で定義(タイムアウト由来の根拠強制)。
3. 固定シード / 再現性: 失敗時に seed + counterexample を CI ログへ必ず出力。
4. シュリンク反例のピン留め: shrink 済み具体値を example-based 回帰テストとしてコミット(flaky 化回避)。
5. 生成器の所有権: arbitrary はドメイン型コンパニオン(スマートコンストラクタ)の隣に併置し、**ブランド型を破って生成しない**(`SemVer.parse`/`ManifestFiles.fromEntries` を通す)。
6. 第1弾スコープ: fast-check 導入 + semver/detect の2対象 + シード運用規約に限定。tar/manifest/パス解決は #678 等の修正 Bolt に随伴。
- fast-check は **devDependency 追加のみ**(新設 package ではない → package 別 CI 配線ルール対象外。runtime 依存でないため project.md Forbidden にも抵触しない)。lint スコープ `tests/ packages/setup/` 内に PBT を置けば既存配線で足りる。

### functional-design / code-generation 向け

**(b) plan.ts の純判定 seam は全て private、export 方式の設計確定が必要**
`classify`(`plan.ts:227-233`)/ `classifyAction`(`:162-168`)/ `toPlanAction`(`:209-218`)はプリミティブ/enum/判別ユニオンのみを取る純関数だが、現状すべて未 export。in-process Small テスト + coverage 計上のために export が必要。**方式(`Plan` sub-namespace vs `plan-classify.ts` 併置)を functional-design で確定**する。トレードオフ: public 化はドメイン公開面を広げる。FS を掴む `walkFiles`/`md5OfFileSync`/`buildEntries`/`buildUpgradeEntries` は medium のまま(in-process 化しない)。

**(c) audit-escape はコア波及コスト大 → Bolt 粒度判断**
監査エスケープ(`amadeus-audit.ts:295` の `String(value).replace(/\r?\n/g, "\\n")`)は `appendAuditEntry`(`:287-298`)内インラインで未 export。PBT 化には純関数として切り出す必要があるが、`amadeus-audit.ts` は framework core であり、**core 編集 → `bun scripts/package.ts`(dist 再生成)+ `bun run promote:self`(セルフインストール昇格)を同一コミット**に含める Mandated 制約が効く(setup 配下より波及大)。**#697 第1弾に含めるかは delivery-planning で Bolt 粒度として判断**。第1弾は semver を確実に、manifest roundtrip/重複 path は既存 Small テストへの PBT 追記で完結、plan-seam/audit-escape は Bolt 粒度で取捨。

### 事実確認: (e) bun --coverage spawn 非計測 Correction の所在

- Developer スキャンは「`bun --coverage は spawn サブプロセス非計測 → in-process seam` の Corrections が `memory/*.md` に見当たらない」と指摘した。**本ブランチ(origin/main 起点)の memory には確かに未反映**(`grep -i "spawn\|blindspot" memory/*.md` = 0 件)。
- 事実確認(read-only git log 実施):
  - `git log origin/claude-leader --grep coverage -i --oneline -3` → 該当コミット **`bbff7ed74`**("Delegate integrity build-and-test gate; persist bun-coverage spawn blindspot correction")を確認。
  - `git show bbff7ed74 --name-only` → **`amadeus/spaces/default/memory/team.md` を変更**(project.md は非変更)。追記内容は:
    > bun --coverage は spawn したサブプロセスの実行を計測しない — カバレッジ対象にしたいロジックは CLI 直叩きテストだけでなく in-process の seam(関数直接呼び出し)でテストする。Codecov patch ゲート導入後は新規行がこの盲点に入るとゲートが赤になるため、seam 設計を実装時点で行う(learned 2026-07-09、integrity-batch B2 で実測)`<!-- cid:requirements-analysis:requirements-analysis:bun-coverage-spawn-blindspot -->`
  - `git merge-base --is-ancestor bbff7ed74 HEAD` → **NO(未マージ)**。
- **結論**: leader の「persist 済み」報告は正しい。当該 Correction は `origin/claude-leader` の `team.md` に存在するが、本ブランチ(origin/main 起点)へは**まだマージされていないだけ**。Developer スキャンの推定どおり。本合成では memory 編集は行わない(方針どおり)。マージ流入で本ブランチにも反映される見込み。なお同機構の説明(`run-tests.ts` の別プロセス spawn → in-process seam が coverage 計上に効く)は上記 code-structure.md「#700 test-size 土台」節に技術事実として記載済み。

## 第1弾 PBT 対象の推奨(delivery/requirements への提案)

1. **確実な第1弾 = semver**(既に Small・FS ゼロ・比較律明快)。version-spec は `SemVer.parse` 委譲不変を1プロパティ追加。
2. **manifest roundtrip / 重複 path** = 既存 Small テストへの PBT 追記で完結(新規 FS 不要)。
3. **plan seam** = export 方式確定後に別 Small ファイルで `classify`/`classifyAction`/`toPlanAction` を in-process テスト。
4. **audit-escape** = 波及コスト大、Bolt 粒度で取捨。
