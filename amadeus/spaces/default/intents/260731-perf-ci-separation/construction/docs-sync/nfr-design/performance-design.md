# Performance Design — U4 docs-sync

上流入力(consumes 全数): business-logic-model.md(U4 FD)。nfr-requirements 5成果物は本 scope で同ステージ SKIP のため設計上不存在(consumes_absent expected:true)— requirements.md の FR-6/NFR-1(ii) と FD の台帳ロジックを一次根拠に具体化する。

測定 ref = observed `da51af375`。

## NFR-1 非退行層の実測確定(本 Unit の性能責務)

business-logic-model.md ロジック3 のとおり、移設前後の tests job wall-clock(run ID・測定 ref 付き)を記録し非退行 bound を判定する。文書変更自体の性能影響はゼロ(docs は CI の paths 判定にのみ関与 — 既存 detect-ci-changes の分類は不変)。

## 測定手順(run 一意選定+ノイズ耐性)

- **母集団の一意化**: `gh api repos/{owner}/{repo}/actions/runs?branch=main&event=push&status=success` から (i) before 側 = head_sha が U1 マージコミットより前(祖先)の直近最大3 run (ii) after 側 = head_sha が U3 マージコミット以降の先頭最大3 run。いずれも run_attempt=1 のみ・Tests job が実行された run(full=true 断面)のみを採用 — re-run・schedule・skip 断面を機械的に除外
- **統計量**: 各側の Tests job wall-clock(completed_at − started_at)の**中央値**を比較値とする(1点比較の禁止)
- **非退行判定**: `median(after) ≤ median(before)`(requirements.md NFR-1(ii) の文言どおり許容幅なし)。超過した場合は**無条件合格にせず** NFR-1 不合格として原因を帰属し、帰属の結果「計測ノイズ(採用 run のばらつき・ランナー機種偏り等の証拠付き)」と確定した場合に限り、その証拠を記録して完了できる — 実退行と確定した場合は是正まで完了不可(NFR-1(ii) の帰属条項の設計化。独自の許容幅は置かない — 置くことは承認済み要件からの逸脱になるため)
- **偽合格対策**: before 中央値が過去5 run の中央値から +20% 以上乖離している場合は before 窓を1 run 分後退させて再選定(混雑断面の対照除外)。帰属時のノイズ判定では採用 run の機種(cpuModel)混在を必ず確認する(#1830 の機種差は単一テスト median 比 ~1.3倍 — job wall-clock への影響量は未実測のため、閾値でなく帰属の観点として使う)
- 記録様式: 採用 run ID 列・各 wall-clock・中央値・判定式の代入値を全て記載(numbers-from-command-output-only)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T11:43:47Z
- **Iteration:** 1
- **Scope decision:** none

consumes 引用・陳腐化防止・上流是正の反映は健全。NFR-1 測定手順に run 一意選定基準とノイズ耐性(許容幅/中央値)が未規定で偽合格・偽不合格双方のリスク — この1点で NOT-READY。

### Findings

- [Major] performance-design.md:13: before/after run の一意選定基準(SHA 紐付け・trigger・attempt)と計測ノイズ耐性(複数 run 中央値 or 許容幅)が未規定

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T11:46:58Z
- **Iteration:** 2
- **Scope decision:** none

run 一意選定・中央値化は閉包。新設の 10% 許容幅が承認済み NFR-1(ii)(僅少退行の無条件合格不能・超過は帰属必須)と無申告矛盾し、根拠引用(#1830 の1.3倍)も指標不一致の非整合 — この2点で NOT-READY。

### Findings

- [Major] performance-design.md:15: 10% 許容幅が NFR-1(ii) の禁止する僅少退行の無条件合格を許容(無申告逸脱)
- [Major] 同: 10% の根拠に引用した #1830 1.3倍は別指標(単一テスト median vs job wall-clock)で非整合
