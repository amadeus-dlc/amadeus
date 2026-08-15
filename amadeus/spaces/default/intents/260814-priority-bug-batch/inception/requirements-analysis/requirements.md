# Requirements — 260814-priority-bug-batch

> Scope: self-fix / Depth: Minimal / Autonomy: full。upstream 入力: 本 intent の RE が更新した codekb(`amadeus/spaces/default/codekb/amadeus/` の business-overview.md、architecture.md、code-structure.md — いずれも本 intent の差分リフレッシュ済み断面、observed `d64fd7cac`)。患部の file:line は RE の Developer スキャン報告と conductor 直読で実測済み。

## Intent 分析

CI / merge queue を偽陽性で赤くする優先度の高い open バグ 4 件(#3065 P2、#3034 P2、#3040 P3、#3035 P3)を単一バッチで修正し、trunk のテスト信号を安定化する。4 件中 3 件(#3065/#3040/#3035)は「負荷下のプロセス境界イベントを実時間予算で待つ」同一クラス、1 件(#3034)は fixture 隔離破れ(code-structure.md が記す self-install 投影機構と結合したテスト)。ユーザー裁定(2026-08-15): 機能テストに厳密な時間アサーションを混ぜない — 時間は余裕を持ったハング検知のみ、性能検証は承認済み NFR に trace できる場合だけ別枠。

## 機能要件

### FR-1: NUL 終端出力の完全読み取り保証(#3065 / t427)

`scripts/no-silent-drop-evidence-adapter.ts` の `systemCommandRunner` 経由で読む `git ls-tree -z` 出力に完全性述語(末尾 NUL)を適用し、不完全(exit 0 かつ非 NUL 終端)なら有限回リトライして完全な stdout を得る。既存の fail-closed NUL 終端ガード(`parseTree`)は維持する。
受け入れ確認: 合成 SpawnOutcome(部分読み → 完全読み)を注入した in-process テストで、リトライにより成功へ回復すること・リトライ上限超過で既存ガードが発火することの両方を Red→Green で実証。

### FR-2: migration git ランナーの fail-closed 化(#3065 / t224)

`packages/framework/core/tools/amadeus-migrate.ts` の `git()`(現行 :439-455、`result.status === 0` のみで ok 判定し `result.error` 未検査)を、`systemCommandRunner` の `normalizeSpawnOutcome` と同じ契約(error が立てば非ゼロへ潰す)へ寄せる。
受け入れ確認: `result.error` 付き合成結果を注入したテストが ok:false になることを Red→Green で実証。t224 の既存ケースは全て green を維持。

### FR-3: t2851 の live 検査経路に前提条件プローブを追加(#3034)

`tests/integration/t2851-doctor-self-install-freshness.serial.test.ts` の最終ケース(live `promote-self --check` を spawn する `repositoryCheckFixture` 経路)の冒頭で live `--check` の clean を前提条件としてプローブし、DIFFERS/ORPHAN 検出時は理由を明示して skip する。他ケース(`strictCheckFixture` 系)は変更しない。
受け入れ確認: clean tree では従来どおり実行・green(CI 経路のカバレッジ維持)。ローカルで `bun run build` / plugin compose 後の dirty 投影下では skip となり赤にならないこと(skip 理由の出力を確認)。

### FR-4: settle 済み child の timeout 除外(#3040)

`packages/framework/harness/pi/drivers/amadeus-pi-driver.ts` の状態遷移を是正し、settle を観測した child は `timeoutMs` レースの対象から外して cleanup 期限のみ適用する(settle 済み child を `timed-out` と報告する誤分類の修正)。テスト側 `timeoutMs` は余裕のあるハング検知水準とする。
受け入れ確認: settle 通知後に close が `timeoutMs` を超えて遅延するケースを決定的に構成(タイミングシーム)し、`succeeded` になることを Red→Green で実証。settle 前の真のハングが引き続き `timed-out` になることも実証。

### FR-5: t07 の壁時計アサーション削除(#3035、ユーザー裁定)

`tests/unit/t07-hook-audit-logger.serial.test.ts` の 300ms(skip path)/500ms(logging path)壁時計アサーションを削除し、機能検証(skip path は監査レコードを書かない・logging path は書く — いずれも既存 assert が担保)に絞る。300/500ms に trace できる NFR は存在しない(RE で不在確認済み)。
受け入れ確認: 当該 2 テストが時間比較を含まず、機能 assert のみで green。`grep -n "toBeLessThan" tests/unit/t07-hook-audit-logger.serial.test.ts` が 0 hit。

### FR-6: リグレッションの横断確認

FR-1〜FR-5 適用後、既存スイート全体が green(self-fix の Testing Posture: 対象バグへのリグレッションテスト追加+既存スイート green 維持)。テストファイル追加時は `tests/.coverage-registry.json` の regen、患部が allowlist / model-map の台帳セレクタに掛かる場合は同一変更で resync(`cid:build-and-test:bt-ledger-resync` / `c1`)。
受け入れ確認: リモート CI(`ci-success` 集約)green を正とする(remote-first 検証順序)。ローカルは typecheck / lint / targeted テスト / coverage-patch-quick advisory まで。

## 非機能要件

- NFR-1: 本バッチは性能目標を新設しない。時間に関する検査はハング検知(余裕のある timeout)のみとし、削除する 300/500ms 予算の代替となる性能検査は作らない(`cid:build-and-test:c2-no-test-theatre-for-absent-nfr` — 適用可能な NFR が存在しないという判定。覆す条件: skip path のレイテンシ目標が要件として宣言されたとき)。

## 制約

- 単一 unit・単一 Bolt・単一 PR で 4 Issue を修正(裁定 `auto-decision-3cd3fd2cbae2a1dd4cf0c09303bbf990`。oq-singleton 制約と recompose 不能 #3074 の下で 1 Issue = 1 Unit 原則から逸脱)。record checkpoint の同梱は可
- 実装バッチ組み込み前に各 Issue のクロスレビュー 2 名成立(進行中: 8 レビュアー派遣済み)
- TDD 既定(実装前に失敗テスト → 最小実装、vertical slice 反復)。Bolt 実装は worktree 分離
- FR-4 は本番コード(driver)の挙動変更を含むが、settle 済み child の timed-out 報告は仕様への回復(誤分類の修正)であり仕様変更に非該当。ユーザー可視契約(CLI 契約等)への影響なし

## 前提

- 4 Issue とも現行 HEAD `d64fd7cac` で成立(RE で実測、既修正なし)
- 修正方式は裁定済み: FR-1/2 = `auto-decision-16efe5c9…`、FR-3 = `auto-decision-ca3b97ca…`、FR-4 = `auto-decision-c38dff5b…`(requirements-analysis-questions.md 参照)

## Out of Scope

- #3074(recompose ガードの phase 非依存拒否)— 別 intent
- #3075(時間アサーション横展開 27 箇所の棚卸し是正)— 別 intent。本バッチは t07 の 2 箇所(FR-5)のみ
- #3031 / #3032(別機序の P3)、perf スイート(`tests/perf/`)の予算群

## Open Questions

- なし(方式裁定は完了。実装中の逸脱は P3 に従い停止 → 裁定)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-14T23:44:34Z
- **Iteration:** 1
- **Scope decision:** none

4件のバグ(#3065/#3034/#3040/#3035)すべてがFR-1〜FR-5で網羅され、各受け入れ確認は測定可能(Red→Green実証・grep述語・CI集約green)で検証劇場は見当たらない。Minimal深度のFR件数帯(5-10)を6件で満たし、1 Issue=1 Unit原則からの逸脱も裁定ID付きで制約節に明記されている。

### Findings

- FOLLOW-UP | requirements.md の本文はcode-structure.md(FR-3の根拠)のみを名指しで引用しており、consumesに宣言されたbusiness-overview.mdとarchitecture.mdは冒頭ヘッダーの列挙にとどまり本文で内容を引用または『レビュー済み・本バッチには非該当』と明示していない。一行の明示を足すとセンサー失敗と規範逸脱(cid:requirements-analysis:c4)の双方を予防できる
- FOLLOW-UP | FR-4(#3040)の『本番コード挙動変更だが仕様への回復であり仕様変更に非該当』という判定根拠がFR-4本文とconstraints節に重複散在している。次段レビュアーの追跡性のため1箇所へ集約するとよい
- NIT | Q1〜Q3の選択肢文中でSpawnOutcome等のコード識別子由来の用語を定義なしに使用しているが、想定読者が自律裁定ラダーであり実害は小さい
