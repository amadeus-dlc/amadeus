# Scope Document: PR 収束 opt-in プラグイン(pr-convergence)

上流入力(consumes 全数): intent-statement

## スコープ境界(In / Out)

intent-statement の Problem Statement(PR 収束が指令ループに接続点を持たない構造欠落)と Initial Scope Signal を境界の根拠とする。

### In(本 intent で出荷する)

1. **opt-in プラグイン `pr-convergence`** — install = opt-in 境界(formal-model-check の既習形)。uninstall で可逆
2. **compose の overlay 拡張(要拡張1点)** — 既存ステージ(`code-generation`)の produces へ `pr-convergence-report` を overlay 追記する能力。trust は compose/compile/run の3層前例を踏襲
3. **収束 CLI + thread 台帳生成器** — GitHub GraphQL 実測から機械導出(手書き禁止)。ページング(`pageInfo.hasNextPage`)・bot 判定(`__typename=="Bot"`)・severity 転記・終端処理を含む
4. **収束述語の単一定義** — 4区分(resolved / outdated / replied-unresolved / ignored)+ `mergeStateStatus == CLEAN` + mergeable UNKNOWN-retry
5. **収束ループ工程のステージ本文断片** — 工程(0)競合解消先行〜(5)収束通知。トリアージ基準(2軸判定+境界規則)を含む
6. **センサー manifest(advisory 可視化)** — レポート様式・台帳整合の可視化のみ。執行はセンサーに置かない(advisory 実測)
7. **対実証** — install 済みで batch 前進拒否(落ちる実証)/ 未 install で produces 不変

### Out(非対象 — intent-statement の非対象宣言を継承)

- PR マージの人間承認の変更(収束述語は merged を要求しない — no-AI-merge 不変)
- #1902(PR 発行の保証)の実装 — 責務分担の相互リンクのみ
- #1887(収束結果の台帳化・計測)の実装 — 本レポートを一次入力にできる形の互換のみ配慮
- 既存負債(過去 PR の未収束スレッド)のトリアージ — 別対応中
- 新規ガードコードの追加 — ガード本体は core 既存 `unitCovered` 述語の1定義所有のまま(検証劇場を作らない)
- Issue 却下済み代替案の再検討: config 階層設定での必須性条件化 / optional_produces+散文条件 / 独立ステージ+scope grid

## Requirements への送付事項(Issue 明示残置の決定点)

1. install 後の適用 scope の絞り込み(code-generation を EXECUTE する全 scope か、名指し scope のみか)
2. GitHub 不達時の挙動(park か明示 override か — fail-closed の裏面と gh-scripts-boundary「恒久停止させない」の調停)
3. #1902 R3(approve 時ガード)との発動点所有権の1箇所確定

## シーケンシング方針

依存・リスク優先(dependency + risk-first): compose overlay 拡張が唯一の engine 側要拡張点であり、成立しなければプラグイン全体が空文化するため、walking-skeleton Bolt(self-feature スコープの必須ゲート)として最初に end-to-end で通す。ハードデッドラインなし。

## 成功基準との対応

intent-statement の Success Metrics 3項目(= Issue #1971 受け入れの目安)をそのまま受け入れ境界とし、Requirements Analysis でテスト可能に固定する。
