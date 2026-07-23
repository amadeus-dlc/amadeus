# Functional Design Questions — guard-integration

Leader approval evidence: ユーザー承認 2026-07-23T08:37:19Z

## Q0. Interaction mode

このUnitのFunctional Design質問へどの形式で回答しますか。

A. Guided — 1問ずつ回答する（推奨）
B. All-at-once — 全質問へまとめて回答する
X. Other (please specify)

[Answer]: A — Guided（2026-07-23T08:32:39Z）

## Q1. Archived rejection contract

selector、`next`、`unpark`の拒否診断をどう統一しますか。

A. 共通typed error dataを生成し、各CLI境界が既存形式へrenderする（推奨）
B. 各toolが独自のerror stringを組み立てる
C. すべて同じ汎用exit messageだけを返す
X. Other (please specify)

[Answer]: A — 共通typed error dataを生成し、各CLI境界が既存形式へrenderする（2026-07-23T08:33:22Z）

## Q2. Public error shape

各入口の公開エラー形式をどうしますか。

A. `next`は`kind: "error"` directive、selector/unparkは既存の非ゼロCLI errorを維持する（推奨）
B. 全入口をJSON error directiveへ変更する
C. 全入口をthrow + stderrへ統一する
X. Other (please specify)

[Answer]: A — `next`は`kind: "error"` directive、selector/unparkは既存の非ゼロCLI errorを維持する（2026-07-23T08:35:13Z）

## Q3. Guard bypass corpus check

cursor書込みやstage開始の新しいcallerがguardを迂回しないことを、どう固定しますか。

A. repositoryから対象callsiteをdiscoverし、全callerが共通preflight/guardへ到達することをcorpus testで検証する（推奨）
B. 現在のcaller名を手書きallowlistに固定する
C. 3つのend-to-end testだけで保証する
X. Other (please specify)

[Answer]: A — repositoryから対象callsiteをdiscoverし、全callerが共通preflight/guardへ到達することをcorpus testで検証する（2026-07-23T08:36:27Z）

## Q4. Functional Design plan

次の設計境界で成果物を生成しますか。

- 共通typed rejection dataを各公開境界が既存形式へrender
- selectorはcursor write前、`next`はdirective生成前、`unpark`はmarker変更前に拒否
- 全入口はpreflight recovery後のstatusだけを読む
- utilityはselector lock解放後にstate subprocessへ委譲し、state側が再検証
- 対象不在とarchived拒否を別のdiagnostic variantにする
- corpus discoveryと3 falling proofsで迂回0件を検証
- frontend/UI成果物は生成しない

A. Approve Plan（推奨）
B. Revise Plan
X. Other (please specify)

[Answer]: A — Approve Plan（2026-07-23T08:37:19Z）

## Q5. 次回へ残す学び

Functional Design全3 Unitから、今後のAI-DLC実行へ永続化する学びはありますか。

A. 追加なし（推奨）
X. Other (please specify)

[Answer]: A — 追加なし（2026-07-23T08:42:45Z）
