# Feasibility Questions

**Mode:** Chat

**ユーザー承認**: 2026-07-17T22:01:28Z — Q1〜Q6 の A と Q7 の Conditional GO を Confirm

**上流入力:** [`intent-statement.md`](../intent-capture/intent-statement.md)

## Q1. 既存システムとの統合境界

本変更が統合すべき既存面をどこまでとするか。

- A. conductor、Claude／Codex harness、監査、既存レフェリー、関連文書・テストに限定する
- B. 新しい汎用 driver／adapter 境界まで導入する
- C. 外部の agent orchestration／messaging 基盤とも統合する
- D. upstream のレフェリー設計も変更する
- E. 調査結果を見てから決める
- X. Other（自由記述）

[Answer]: A. conductor、Claude／Codex harness、監査、既存レフェリー、関連文書・テストに限定する — User input: `1` — 2026-07-17T22:01:28Z — Mode: Chat

## Q2. 規制・コンプライアンス

今回の変更に新たな規制、個人データ、顧客データ、データ所在地の要件があるか。

- A. 新規該当なし。既存の監査完全性と repository security を維持すればよい
- B. PCI-DSS の対象である
- C. HIPAA の対象である
- D. GDPR／個人データ処理の対象である
- E. SOC 2 等の追加統制が必要である
- X. Other（自由記述）

[Answer]: A. 新規該当なし。既存の監査完全性と repository security を維持すればよい — User input: `1` — 2026-07-17T22:01:28Z — Mode: Chat

## Q3. 技術スタックと実行能力

成立性評価で前提とする stack／能力をどのように扱うか。

- A. 現行 TypeScript・Bun・Codex CLI ≥ 0.139.0・Claude／Codex native tools を前提に、未確認能力は実測する
- B. 新しい外部 runtime／SDK を導入する
- C. Codex は従来の headless `codex exec` worker を維持する
- D. provider の文書上の記載だけで成立とみなす
- E. stack 自体を再選定する
- X. Other（自由記述）

[Answer]: A. 現行 TypeScript・Bun・Codex CLI ≥ 0.139.0・Claude／Codex native tools を前提に、未確認能力は実測する — User input: `1` — 2026-07-17T22:01:28Z — Mode: Chat

## Q4. 予算・時間・規模の制約

軽量再始動の制約をどのように判定するか。

- A. 固定の行数・金額・期限上限は置かず、Units Generation の概算行数レンジと凝集性で過大化を止める
- B. 固定の最大行数を設定する
- C. 固定の納期を設定する
- D. 固定の費用上限を設定する
- E. 規模制約を設けない
- X. Other（自由記述）

[Answer]: A. 固定の行数・金額・期限上限は置かず、Units Generation の概算行数レンジと凝集性で過大化を止める — User input: `1` — 2026-07-17T22:01:28Z — Mode: Chat

## Q5. 組織上の阻害要因

既知の change freeze、競合優先事項、承認依存があるか。

- A. 新規の阻害要因なし。AI-DLC の人間承認ゲートと CI／review を通常どおり適用する
- B. change freeze がある
- C. 先行して解決すべき競合 Initiative がある
- D. 外部チームの承認待ちがある
- E. 調査が完了するまで未確定とする
- X. Other（自由記述）

[Answer]: A. 新規の阻害要因なし。AI-DLC の人間承認ゲートと CI／review を通常どおり適用する — User input: `1` — 2026-07-17T22:01:28Z — Mode: Chat

## Q6. AWS サービスとアカウント

AWS landscape が本変更の成立性や配布に影響するか。

- A. 影響なし。本変更は repository 内の harness／conductor 契約であり、AWS resource を追加・変更しない
- B. 既存 AWS account／service との統合が必要である
- C. 新しい AWS resource を作成する
- D. AWS 上の実行検証が必要である
- E. AWS 利用状況の追加棚卸しが必要である
- X. Other（自由記述）

[Answer]: A. 影響なし。本変更は repository 内の harness／conductor 契約であり、AWS resource を追加・変更しない — User input: `1` — 2026-07-17T22:01:28Z — Mode: Chat

## Q7. 実測後の Feasibility 裁定

2026-07-17T21:54:35Z 以降、reasoning effort に `ultra` を指定した三つの native subagent probe を同一セッションで並列実行した。

- 並列 spawn: 3 child が同時に `running` となり成立
- 結果回収: 3 child の final result を親セッションで回収し成立
- effort 指定: `reasoning_effort=ultra` が API に受理され、各 child が完了。ただし実際に honor された effort を示す telemetry は提供されない
- 追加制約: native spawn API に child ごとの `cwd` がなく、prepared Bolt worktree への隔離書き込みと writable-root 境界は未実測
- 既存 seam: referee の `prepare/check/finalize` は driver 非依存で維持可能。一方、`AMADEUS_USE_SWARM` の解釈は現状 prose にあり、未知値の fail-closed を機械保証する境界が不足

この結果を次のように裁定してよいか。

- A. Conditional GO。Q1=A、Q2=A、Q3=A、Q4=A、Q5=A、Q6=A とし、Requirements で確約する前に Bolt worktree 隔離書き込みを実証する。`ultra` は指定受理までを現在の証拠限界として明記する
- B. `ultra` が実際に honor された telemetry を必須とし、現時点では No-Go とする
- C. `codex-ultra` を今回のスコープから外し、通常の native subagent floor だけで進める
- D. prepared Bolt worktree を使う追加の侵襲的 probe を Ideation 中に実行してから判断する
- E. Initiative 全体を No-Go とする
- X. Other（自由記述）

[Answer]: A. Conditional GO。Requirements で確約する前に Bolt worktree 隔離書き込みを実証し、`ultra` は指定受理までを現在の証拠限界として明記する — User input: `1` — 2026-07-17T22:01:28Z — Mode: Chat
