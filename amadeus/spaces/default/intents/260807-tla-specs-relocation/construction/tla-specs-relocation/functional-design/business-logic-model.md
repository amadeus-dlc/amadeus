# Business Logic Model — Unit tla-specs-relocation

上流: `inception/requirements-analysis/requirements.md`(FR-1〜FR-9)、`domain-entities.md`(E-1〜E-6)、`business-rules.md`(BR-1〜BR-15)。本書は処理フローと決定木を定義する。

## 上流参照(consumes 全数)

- `inception/requirements-analysis/requirements.md` — FR-1〜FR-9 / NFR-1〜4 / Constraints / 留保3件
- (absent by design: unit-of-work.md・application-design/* — self-refactor scope は units-generation / application-design を SKIP。欠損の内容は捏造せず、requirements と codekb の実コード知識を入力とする)

## L-1: spec root 解決フロー(E-1 SpecRootResolver)

```
入力: projectDir(呼出し側の基準 dir)
1. workspace root を特定する(既存の workspaceRoot 解決 — amadeus/ 屋根を持つルート)
2. active-space を読む(`amadeus/active-space` カーソルファイルの直接読取、不在・不読時は default — E-1 seam。`./amadeus-lib.ts` は import しない)
3. legacy 検出(BR-4/BR-6):
   - <root>/specs/tla/ に .tla または model-map.json が存在する → LegacySpecError
     (メッセージに移設手順: git mv specs/tla amadeus/spaces/<space>/specs/tla + 参照更新の案内)
   - 新旧両存も同じエラー(曖昧性の排除)
4. 返却: { specsRoot: <root>/amadeus/spaces/<space>/specs,
           tlaDir: <specsRoot>/tla,
           modelMapPath: <specsRoot>/tla/model-map.json,
           evidenceRoot: <specsRoot>/tla-evidence }
```

決定木(消費者ごとの分岐なし — 全消費者がこのフローを共有):

| 条件 | 結果 |
|---|---|
| legacy のみ存在 | LegacySpecError(fail-closed) |
| 新旧両存 | LegacySpecError(fail-closed) |
| 新パスのみ存在 | 新パスを返却 |
| どちらも存在しない | 新パスを返却(呼出し側の not-found 処理に委ねる — 現行と同じ) |

## L-2: 移設手順フロー(FR-1、本 repo の self-development として1回だけ実行)

```
1. git mv specs/tla amadeus/spaces/default/specs/tla(9ファイル)
2. specs/tla 内の自己参照コメント5行を新パスへ書換(BR-7 の許容変更)
3. model-map.json の path 値5箇所を amadeus/spaces/default/specs/tla/... へ書換
   (identity は再計算しない — BR-8)
4. 参照面(B クラス16ファイル)を新パス/新規約へ書換
5. テスト51ファイルの fixture・期待値を新パスへ書換 + 新規テスト t481 以降
6. docs 8ファイル+amadeus-files 英日へ specs/ layout 追記(FR-8)
7. bun run build で dist・鏡像を再生成(BR-11)
```

## L-3: watch / drift advisory フロー(FR-3、E-3/E-6)

```
activation 時:
1. WatchDeclaration を Resolver から取得(基底 amadeus/spaces/<space>/specs/、glob tla/**)
2. 基底配下の spec 集合のハッシュを計算・記録
3. 後続の checkpoint で再計算し、drift 時に advisory を発火
   - 文言: ターゲット表記を新正準パスへ更新(E-6)。verdict 語彙は不変(BR-7)
4. evidence store(<specsRoot>/tla-evidence)は glob 外 — 変更しても drift を鳴らさない(BR-10)
```

## L-4: loader / validator フロー(FR-5、E-2)

```
model ロード:
1. Resolver から modelMapPath を取得し parseTlaModelMap
2. parseAssetIdentity が path 値を正準生成値(amadeus/spaces/<space>/specs/tla/<name>.{tla,cfg})と照合
   - 旧パス値を持つ map → validator reject(BR-13c の実証面)
3. identity 照合(コンテンツ base)は現行どおり
loader の root 判定:
- 現行: findRepositoryRoot が .git + package.json + specs/tla 存在で遡上(tla-model-loader-internal.ts:134-153、:140)
- 新規: walk-up の停止条件から specs/tla 存在チェックを外し、workspace root 特定後は Resolver に委譲
  (loader は plugin 配布先のユーザー workspace でも同じ規約で解決する — FR-8)
```

## L-5: evidence store 解決フロー(FR-4、E-5)

```
tla-authoring / tla-evidence の store root 解決:
1. 明示指定(env・引数)があればそれを使う(現行契約を維持)
2. fallback(tla-authoring.ts:189)は Resolver の evidenceRoot を返す
   — 静的文字列 DEFAULT_STORE_ROOT への直接参照を残さない(留保1)
```

## L-6: 配布フロー(FR-8、BR-11/BR-12/BR-14)

```
1. 正本は packages/framework/core/ と plugins/formal-model-check/ のソース
2. bun run build → dist/ 8ハーネス + self-install 面を再生成(477 occurrences の焼き込みはこれで追従)
3. 隔離2回ビルドの再現性・source-only:check・グラフ不変量を検証
4. plugin 利用者は INSTALL/README/docs の記述どおり新パス規約で workspace を構成
```

## エラー・エッジケース

| ケース | 振る舞い | 根拠 |
|---|---|---|
| legacy specs/tla に spec あり | LegacySpecError(移設手順付き)で停止 | BR-4 |
| 新旧両存 | 同上(曖昧性停止) | BR-4 |
| spec なし(新規 workspace) | 新パスを返却、呼出し側 not-found 処理 | 現行踏襲 |
| active-space カーソル不在 | default に解決(activeSpace の既存既定) | BR-2 |
| evidence store 未生成 | 初回実行時に新パスへ生成(watch 対象外) | FR-4/BR-10 |
| 旧パス値の model-map | validator reject(fail-closed) | FR-5/BR-13c |

## 検証マッピング(FR-9 / BR-13)

| 実証 | 手段 |
|---|---|
| (a) 旧パス非検出+fail-closed | 新規テスト(t481 以降): fixture に旧パス spec を配置 → LegacySpecError を assert。加えて全域 grep で旧パス参照残存 0(歴史記録除く) |
| (b) 新パス drift 発火 | 既存 t320(activation-spec-hash)系を新パス fixture で更新し、spec 変更で advisory 発火を assert |
| (c) 旧パス値 map の reject | 既存 validator テスト更新 + 旧パス値を reject する否定ケース |
| 回帰 | 更新対象 51 テストファイルのスイート green(ベースライン 65 pass からの搬送) |
| 配布 | 隔離2回ビルド・source-only:check・グラフ不変量・plugin-conformance |

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T11:11:47Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER(E-1 seam: 鏡像からの amadeus-lib import 不能)を cursor 直接読取の seam 決定で解消。node:fs 単独・3レイアウトで実装可能、in-tree 先例 activeSpaceLocal あり。引用 :134-153 修正済み、E-3 glob 固定深度形は両エンジン適合を実測。BLOCKER 0。

### Findings

- FOLLOW-UP | E-1 seam の cursor reader は safe-name 検証(isSafeWorkspaceEntryName)を複製してからパスセグメント化すること — 設計へ反映済み(domain-entities.md E-1)
