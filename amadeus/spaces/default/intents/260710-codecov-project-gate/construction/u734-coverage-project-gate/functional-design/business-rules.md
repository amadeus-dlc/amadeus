# Business Rules — u734-coverage-project-gate

> 上流: `../../../inception/requirements-analysis/requirements.md`。判定・運用の決定規則を列挙する。アルゴリズム詳細は `business-logic-model.md`、データ構造は `domain-entities.md`。

## 1. ゲート判定規則(FR-3/FR-4)

- **R1(合格)**: current% >= base% − 0.02(百分点)ならゲートは緑。等号成立(ちょうど 0.02pp 低下)は**合格側**。
- **R2(低下超過)**: current% < base% − 0.02 なら赤(DROP_EXCEEDED)。
- **R3(欠落は失敗)**: current JSON / baseline のいずれかが不在なら赤(旧 `if_not_found: failure` の意味論継承)。
- **R4(破損は失敗)**: JSON パース不能・`schemaVersion !== 1`・hits/lines が非負整数でない・`hits > lines` は赤(MALFORMED)。
- **R5(空母集団は失敗)**: `lines === 0` は「カバレッジ検証不能」であり赤(EMPTY_POPULATION)。0 除算や vacuous 100% への丸めで成功側に倒さない。
- **R6(検証劇場の禁止)**: 判定に使う値はすべて当該 CI 実行の実測ファイル由来。判定結果のハードコード・自己参照比較・実行結果を消費しない検証用フィールドを持たない(team.md Forbidden)。

## 2. 母集団の定義規則(FR-1、選挙 Q1=A)

- **R7**: 母集団は `tests/run-tests.ts` の正規化後 LCOV(`coverage/lcov.info`)全体の Σ LH / Σ LF。`codecov.yml` の `ignore` は適用しない。
- **R8**: 母集団定義の変更(例: 将来 ignore 整合に寄せる)は本ゲートの再設計であり、ベースラインの再測定とセットでのみ行う(PR CI とベースラインで定義が同一であることが判定の正しさの前提)。
- **R9**: 絶対値が Codecov UI の project% と乖離することは仕様(前後比較の一貫性が一次要件)。docs に明記する(FR-7)。

## 3. ベースライン運用規則(FR-5、選挙 Q4=A)

- **R10(更新主体)**: ベースライン更新はカバレッジを向上させた PR の作成者が `--update` で再生成し、同一 PR に含める。レビュー・スカッシュマージの通常フローで承認。
- **R11(自動更新禁止)**: CI・bot がベースラインファイルへ書き込む配線を持たない。`--update` を CI から呼ばない。
- **R12(一方向性)**: 上げる更新が既定。**意図的な引き下げはユーザー承認事項** — PR 説明に理由を明記し、ユーザーの明示承認を得てからマージする(既存 ratchet と同じ運用構造。エスカレーション正準リストの「例外承認」に該当)。
- **R13(更新の前提)**: `--update` は直近の `bun run coverage:ci` の emit を入力とする。emit 不在時は更新を拒否する(古い値の再コミット防止)。

## 4. 構成資産の変更規則(FR-6)

- **R14**: `codecov.yml` は `coverage.status.project` セクションの削除のみ。`patch` / `ignore` / `fixes` はバイト不変。
- **R15**: Codecov project status の将来の再導入は、本 intent のスコープ外の新規判断として Issue 起票から始める(自前ゲートとの二重化を無断で発生させない)。

## 5. ライフサイクル規則(FR-8)

- **R16**: 本 intent の実装 PR マージ時に、PR #717 と Issue #734 を supersede 根拠コメント付きで close する(実行主体は leader のマージ執行フロー、no-AI-merge 準拠)。

## 6. 実証規則(NFR-1)

- **R17**: R1〜R5 の各規則は、失敗側の注入で**実際に exit 1 になること**をテストで実証してから完成扱いにする(temp-tree 注入+`spawnSync` 実測、および `evaluateGate` 純関数の境界値 in-process テストの2層)。
- **R18**: 閾値境界は両側をテストする — ちょうど −0.02pp(緑)と −0.02pp を厳密に下回る最小ケース(赤)。整数厳密比較(BigInt)の実装がこの境界で正しいことを固定する。
