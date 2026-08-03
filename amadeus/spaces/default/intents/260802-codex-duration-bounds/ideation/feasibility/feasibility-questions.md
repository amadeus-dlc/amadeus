# Feasibility 質問 — 260802-codex-duration-bounds

> モード: Guide me（全1問）
> 上流入力: `ideation/intent-capture/intent-statement.md`
> Market Research は scope により SKIP され、`competitive-analysis`、`market-trends`、`build-vs-buy` は存在しない。欠損を推測で補完しない。
> 既決事項・実測で確定できる事項は質問を再演せず、以下の前提として成果物へ直接反映する。
> ユーザー裁定の承認証跡: 2026-08-02T02:18:20Z と 2026-08-02T02:19:20Z の `QUESTION_ANSWERED` により、Codex 専用ゲートという前提を再考するよう指示された。

## 事前に確定している前提

- 既存統合面: Amadeus の state・audit・runtime graph、Stop hook、orchestrator、swarm、Git worktree、GitHub Issue、Codex CLI、複数 harness の package/promote 投影。
- 技術スタック: TypeScript／ESM、Bun `1.3.13`、Codex CLI `0.146.0`。正本は `packages/framework/core/` と `packages/framework/harness/<name>/` で、生成物の直接編集は禁止。
- AWS: 常駐サービス、AWS account、ネットワーク、データストアの新設は不要。AWS Platform 観点では N/A であり、CLI／ローカルファイル境界へクラウド要件を機械適用しない。
- Compliance: 新しい個人データ・規制対象データは扱わない。audit の真正性、モデル／harness／時刻の由来、secret や prompt 内容を telemetry に混入させないことが主要な統制面。
- 組織制約: `self-feature` の walking-skeleton gate、人間によるマージ判断、1 Issue = 1 Bolt、短命 worktree、各 Bolt 着地後の後続 rebase、package/promote 後の park／fresh-session resume を維持する。
- 期限・費用: 固定納期・金額予算は未設定。目的は所要時間と非終端リスクの削減であり、検証自体が無制限な live 実行を要求してはならない。
- takt 比較: current main `4e2453544183f9963a99f6ebd3090b1924f953fa` で、`LoopDetector` がステップ名だけを連続カウントし、既定10回超過と `warn`／`abort` を決定的に判定すること、および exec-loop monitor が別層で所見減少・収束を評価することを確認済み。
- Amadeus 現行機序: Stop hook は `Current Stage + audit shard line count` を進捗シグネチャにし、swarm は `cap-exhausted` の理由語彙を持つが同一 Unit 再試行の数値カウンタを所有しない。
- ゲート境界: 合否規則は共有 core の harness-neutral な conformance 契約として一つにする。harness 固有なのは native hook payload、model／version 取得可否、live journey driver などの adapter 実証であり、別ポリシーゲートにはしない。

## Q1. （撤回）live Codex dogfood をどの強さのゲートにするか

この質問は、効果測定の一次対象が Codex であることから、Codex 専用ゲートの要否へ論理を飛躍させていたため撤回する。

再考後の契約は次の三層で統一する。

1. 共有 core の決定的な合否規則を単一の正本とする。
2. 影響を受ける全 harness の package／self-install 投影と adapter conformance を、同じ合否規則へ接続して blocking 検証する。
3. 実モデル journey は harness ごとの driver と capability 条件で実証する。Codex は本 Intent の一次 dogfood 対象だが、その live probe を別ポリシーゲートとして扱わない。

Codex 固有ゲートを追加できるのは、Codex にしか存在しない native lifecycle／hook 意味論が共有契約へ写像できず、共通 predicate では欠陥を検出不能であることを実測した場合だけとする。現時点の4 Issueにはその証拠がない。

[Answer]: 撤回 — ユーザー指摘を受けて論理境界を再考し、統一 conformance ゲート＋harness 別 adapter／live probe に訂正した（2026-08-02）

## Q2. Feasibility の訂正から、次回以降にも残す project rule はどれか

fresh voter 2名の選挙は c1 と c5 で同票になった。両票の留保を反映し、次のいずれかを選ぶ。

A. **c5 を適用範囲限定で保存（推奨）** — 複数 harness に影響する性能・有界性変更では、性能改善率は環境別に評価してよいが、影響を受ける harness の停止性・予算・終了理由と adapter 証拠は共有契約として扱う
B. c1 を保存 — Codex を一次 dogfood 対象とし、合否規則を共有 core の統一 conformance 契約、harness 固有面を adapter／live probe とする
C. 0件 — 本 Intent の record にだけ保存し、project rule へ追加しない
X. Other (please specify)

[Answer]: A. c5 を適用範囲限定で保存（推奨）（2026-08-02T02:31:02Z）

## Q3. 次回のために追加で残すことはあるか

A. 追加なし（推奨）
X. Other (追加内容を自由記述。内容がある場合は Interpretation／Deviation／Tradeoff／Open question の分類を続けて確認する)

[Answer]: A. 追加なし（推奨）（2026-08-02T02:31:49Z）
