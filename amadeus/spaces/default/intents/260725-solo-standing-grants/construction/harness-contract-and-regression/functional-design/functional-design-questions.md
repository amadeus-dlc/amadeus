# Functional Design Questions: harness-contract-and-regression

## 回答方針と入力

ユーザーの包括指示に従い推奨案を採用した。`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`を根拠とする。

## Q1. Harness source

- A. canonical sourceだけを編集し、全6 harnessを再生成する（推奨）
- B. 各harness生成物を直接編集する
- X. その他

[Answer]: A（E-1466-FD-U3-Q1、2026-07-25T06:28:40Z）

## Q2. Contract wording

- A. route carrier、auto-report、typed fallback、human再開を同じ意味で記述する（推奨）
- B. harnessごとに異なる制御フローを許す
- X. その他

[Answer]: A（E-1466-FD-U3-Q2、2026-07-25T06:28:40Z）

## Q3. Regression baseline

- A. team leader/delegationとhuman approveのdirective/state/audit/wireをgolden化する（推奨）
- B. solo testsだけ追加する
- X. その他

[Answer]: A（E-1466-FD-U3-Q3、2026-07-25T06:28:40Z）

## Q4. Public docs

- A. help/doctor/referenceの変更要否を契約ごとに判定し、必要最小限だけ更新する（推奨）
- B. 全文書を全面改稿する
- X. その他

[Answer]: A（E-1466-FD-U3-Q4、2026-07-25T06:28:40Z）

## Q5. Verification convergence

- A. type、関連test、全test、dist/self driftをすべてblockingにする（推奨）
- B. 関連testだけで完了する
- X. その他

[Answer]: A（E-1466-FD-U3-Q5、2026-07-25T06:28:40Z）

## Q6. UI

- A. harness/document/test unitでありfrontend componentは作らない（推奨）
- B. UIを追加する
- X. その他

[Answer]: A（E-1466-FD-U3-Q6、2026-07-25T06:28:40Z）

## 曖昧性分析

- 「同一意味論」は表示文言のbyte一致ではなく、directive input、state transition、audit outcome、fallback再開契約の一致を指す。
- doctorは新event/fieldの存在を常に列挙するtoolではないため、既存doctor responsibilityに該当する場合だけ更新する。
- generated artifactsは検証対象であり編集ownerではない。
- U2に残るroute-intent binding判断はU3で迂回実装せず、Functional Design gateで解決する。
