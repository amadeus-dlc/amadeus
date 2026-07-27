# 論理コンポーネント — U3 host-projection-all

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## 実装モジュール構成

パス・関数名は component-methods.md C3 と `business-logic-model.md` フロー 1/2 からの転記。既存公開面(C2)は変更しない。

| モジュール | 内容 | 由来 |
|---|---|---|
| `scripts/package.ts`(編入セクション) | `discoverPluginSources` → 0-plugin no-op 分岐(performance-design.md)→ `HarnessProjectionSpec[]` 構成 → 面別ループ | business-logic-model フロー 1 |
| projection モジュール: `projectPluginForHarness(plugin, harness, outDir): ProjectionResult` | per-harness 投影。clazz 判別 union switch(native-manifest / folder-drop-auto / manual-only — scalability-design.md の 3 分岐集約) | component-methods C3 |
| 同: `checkPluginProjections(): DriftReport` | `--check` 編入。`DriftEntry[]`(stale / orphan) | component-methods C3、business-logic-model フロー 2 |
| 同: `computeProjectionHash(bytes): string` | write⇔check 共有の唯一 hash 定義(reliability-design.md) | REL-U3-2 の設計具体化 |
| 同: `classifyOutDir(outDir, probe): OutDirVerdict` | 拒否集合の純関数判定(security-design.md 層 1)。fs 非依存 | SEC-U3-1 の設計具体化 |
| トークン置換 | 既存 harness-transform の再利用(新設なし) | SEC-U3-2、BR-U3-1 |

型は functional-domain-modeling-ts に従い判別 union Result(`ProjectionResult` / `OutDirVerdict` / `DriftEntry`)。marketplace metadata(`business-logic-model.md` フロー 3)は native-manifest クラスの switch 分岐内に閉じる。

## 保証機構の層別

| 層 | 保証 | 対応 ID |
|---|---|---|
| 純関数層(`classifyOutDir`) | 拒否分類の決定性 — probe 入力の全列挙テストが可能 | `security-requirements.md` SEC-U3-1 |
| 投影ループ層 | plan 段拒否 → mutation の順序契約・面間独立・失敗収集 loud | `reliability-requirements.md` REL-U3-3/4、`scalability-requirements.md` SCALE-U3-1 |
| 検査層(`checkPluginProjections`) | write⇔check 対称・drift ガード編入 | `reliability-requirements.md` REL-U3-2、`performance-requirements.md` PERF-U3-2 |

## テスト層配置

fs を触る検証は最初から integration 層へ置く(team.md fs-tests-integration-first — unit allowlist を増やさない):

- **unit(純関数のみ)**: `classifyOutDir` の probe 全列挙(拒否 5 分類+ok — fs 非依存)、`computeProjectionHash` の決定性
- **integration(実 FS fixture)**: 投影の期待位置生成・トークン置換・stale/orphan fixture の `--check` 赤・部分失敗 loud・0-plugin byte-identical(baseline hash 比較 — U7 と共有)・両側実測(正当な既存投影で赤くならない)
- **既存ゲート**: `dist:check` / `promote:self:check` の drift ガード(手編集 fixture の落ちる実証)、t253 系アトミック性 green 維持
- in-process seam: 編入セクションは argv/deps パラメータ化して export し spawn 盲点を回避(seam-export-handler-amend)

## 障害分離(failure domains / blast radius / isolation / shared resources)

- **failure domains**: (1) **純関数判定面**(`classifyOutDir` / `computeProjectionHash` — fs 非接触)、(2) **投影ループ面**(`projectPluginForHarness` の面別実行 — 各 harness 面が独立の障害単位。`scripts/package.ts` 編入セクションが同居)、(3) **検査面**(`checkPluginProjections` — `--check` 経路、読取のみ)。
- **blast radius**: 投影ループ面の 1 面の I/O 失敗は当該面の出力に閉じる — 失敗は即 throw せず収集し全面処理後に列挙して exit 非 0(reliability-design REL-U3-3。面間に共有可変状態がないため面 A の失敗は面 B の整合を壊さない — SCALE-U3-1)。outDir 拒否(plan 段)は書込ゼロで exit — mutation 前に止まる(security-design 層 2)。I/O 失敗で中間状態が残っても check 面が stale/orphan として検出可能(無音残存なし)。検査面の赤は CI を止めるだけで正本・workspace は不変。engine のアトミック commit/recovery 経路には触れない(書込先は `dist/plugins/` 投影 outDir のみ — REL-U3-4)。
- **component isolation strategy**: 判定の純関数化(probe を引数で受け fs に触れない — 層 1)、「plan 段拒否 → mutation」の呼出し順序契約(層 2)、面間独立ループ+失敗収集(fail-loud 単一エラー表面)、write⇔check の同一 hash 関数共有(check 専用再実装の禁止)。
- **shared resources**: **dist/plugins/ 投影 outDir**(書込所有者 = U3。ただし U2 新設の claude projector 面は不変 — U3 は残面のみ追加)、**投影 metadata(hash 記録+isPriorProjection マーカー)**(write 側が書き check 側が読む — U3 内の対称ペア)、**U1 マトリクスの機械可読列挙(BR-U1-7)**(読取のみ — HarnessProjectionSpec[] の導出元)、**0-plugin baseline hash**(U7 適合テストと共有し二重実装しない)。

(nfr-design Step 6 の必須内容 — U2 ND レビュー iteration 1 Major 指摘の是正 2026-07-27)
