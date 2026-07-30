# Performance Test Instructions — 260730-skill-reviewer-fixes

上流入力(consumes 全数): fix-1736-skill-new-intent/code-generation/code-generation-plan.md・code-summary.md、fix-1711-unitname-resolution/code-generation/code-generation-plan.md・code-summary.md — 検証対象・手順・検証済み証拠は両 unit の plan/summary から導出した。

## 判定: N/A(反証可能根拠付き)

requirements.md に性能 NFR は存在しない(N-1〜N-4 は surgical/同期/CI/自 intent 手順の制約で、時間・スループット閾値を持たない)。変更面は (1) SKILL 散文の1行 (2) directive 発行時の readdirSync 1回+集合減算 — 常駐サービスでも hot path でもなく、承認済み NFR へ trace できる負荷検査対象が無いため、比例選定(bt-proportional-selection)により性能テストは生成しない。実行時間の退行は既存 CI の Tests ジョブ(wall-clock drift 検査)が横断的に監視する。

## 再判定条件

後続 intent が directive 発行経路へ計測可能な性能 NFR(閾値付き)を導入した場合、本判定は失効し、タイミングシームによる決定的検証(bt-timeout-verification-shape)を優先して再選定する。
