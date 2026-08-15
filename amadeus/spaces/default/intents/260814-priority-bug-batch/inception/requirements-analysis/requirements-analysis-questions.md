# Requirements Analysis — 明確化質問

> Intent: 260814-priority-bug-batch(self-fix、depth Minimal、autonomy full)
> 回答は Intent autonomy `full` の裁定梯子(`amadeus-bolt decide-question`)で確定する。E-code `E-AD-<hex8>` は当該 AUTO_DECIDED 裁定(intent audit)への参照であり、full grant `intent-grant-4207f80c184e6fbaca459ae85fd4afd8` 下の裁定 ID 先頭 8 hex を大文字化したもの。
> #3035 の是正方向はユーザー直接裁定(2026-08-15 実 HUMAN_TURN: 機能テストから厳密な時間アサーションを排除)で既決のため質問しない(`cid:requirements-analysis:c5` — 既決事項の再質問禁止)。

## Q1. #3065(subprocess stdout の 8192B 読み切り不全)の是正方式

t427 の患部は `scripts/no-silent-drop-evidence-adapter.ts` の `systemCommandRunner`(spawnSync)で、t224 の患部は `packages/framework/core/tools/amadeus-migrate.ts:439-455` の `git()`(`result.error` 未検査)。どの方式で閉じるか。

- A. `systemCommandRunner` を `Bun.spawnSync`(ネイティブ実装)へ切り替える(根本原因が node:child_process 互換層にある仮説へ直接対処。ただし負荷依存のため修正の実証が難しい)
- B. 読み取り完全性の検証+リトライ層を導入する: NUL 終端出力(`ls-tree -z`)は endsNul を完全性述語として不完全時に有限リトライ、`amadeus-migrate.ts` の `git()` は `result.error` を検査して fail-closed 化(`normalizeSpawnOutcome` と同じ契約へ寄せる)。EOF 保証は合成 SpawnOutcome 注入の in-process 検査で機械固定
- C. サイズが事前に不明な出力は一時ファイル経由(`--output` / リダイレクト)にしてパイプ境界自体を回避する
- D. A と B の併用(切替+完全性検証)
- X. Other (please specify)

[Answer]: B — 裁定 E-AD-16EFE5C9(= AUTO_DECIDED auto-decision-16efe5c9d76b6aa415c32cecd41d53f3)。flake の一次原因(部分読み)には完全性述語+リトライで決定的に対処し、t224 の error 未検査は fail-closed 正規化で閉じる。A は根本原因が bun 実装依存で修正実証が困難、C は呼び出し面の変更が大きく surgical でない。

## Q2. #3034(t2851 の fixture 隔離破れ)の是正方式

- A. fixture を自己完結化する(live `promote-self --check` の実経路カバレッジを失う)
- B. live 経路を維持し、テスト冒頭で live `--check` の clean を前提条件プローブし、DIFFERS/ORPHAN 検出時は前提不成立として skip(理由を明示出力)
- C. `promote-self.ts` に repo root の明示指定シームを追加し fixture の projectDir を検査対象にする(本番コードへのテスト都合シーム — port として設計しない限り construction ガードレール抵触)
- X. Other (please specify)

[Answer]: B — 裁定 E-AD-CA3B97CA(= AUTO_DECIDED auto-decision-ca3b97ca34f90c32a67170fc1b4fc0eb)。Issue 完了条件1後段「live を読むならその前提を明示して dirty/generated 投影では skip」に一致し、clean tree(CI)での実経路カバレッジを維持しつつローカル self-dev 中の偽陽性を決定的に排除する。A はカバレッジ喪失、C は本番コードへのテストシーム追加で劣後。

## Q3. #3040(t-pi settled one-shot close の timeout flake)の是正方式

- A. テスト予算の引き上げのみ(`scaleTestTime(3_000)` 等)
- B. driver の状態遷移を是正する: settle を観測した child は timeout レースの対象から外し、`CLEANUP_WAIT_MS` 側の期限だけを適用する(settle 済み child を timed-out と報告する現行意味論の誤分類を修正)。テスト予算は余裕のあるハング検知水準に保つ
- C. `CLEANUP_WAIT_MS` に注入シームを追加してテストから短縮する
- X. Other (please specify)

[Answer]: B — 裁定 E-AD-C38DFF5B(= AUTO_DECIDED auto-decision-c38dff5b6d29f959d4d851688d2a63c3)。Issue 完了条件「settle 検知の決定化」に合致し、ユーザー裁定(機能テストは厳密時間に依存しない)とも整合する。settle 済みの child を timed-out と分類するのは駆動連鎖の遅延をエラーへ誤変換する挙動で、driver 側の是正が筋。A は同クラス flake の温存、C は本番 timeout 契約への介入。

## Ladder Rulings(記録)

- Q1: `auto-decision-16efe5c9d76b6aa415c32cecd41d53f3`(selected: b-retry-failclosed、basis: agent-recommendation、loud degradation: native solo-election 不在)
- Q2: `auto-decision-ca3b97ca34f90c32a67170fc1b4fc0eb`(selected: b-probe-skip、同上)
- Q3: `auto-decision-c38dff5b6d29f959d4d851688d2a63c3`(selected: b-settle-exempt、同上)
- 前提裁定(バッチ構成): `auto-decision-3cd3fd2cbae2a1dd4cf0c09303bbf990` — 単一 unit・単一 Bolt・単一 PR(4 Issue 同梱)。1 Issue = 1 Unit 原則からの逸脱は oq-singleton 制約と recompose 不能(#3074)の下での裁定
