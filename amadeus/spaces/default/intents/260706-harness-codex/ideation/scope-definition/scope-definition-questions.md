# Scope Definition Questions — 260706-harness-codex

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[feasibility-assessment.md](../feasibility/feasibility-assessment.md)、[constraint-register.md](../feasibility/constraint-register.md)。
スコープの大枠はディスパッチ（Phase 分割）と feasibility の設計確定（Q1〜Q6、5/5 一致）で決着済みのため、境界の細部 2 問を自己判断（理由付き）で確定し、gate の人間承認で確定する。

## Q1. 上流対応のない amadeus 独自 skill への openai.yaml 付与（raid-log R-2）

前提: 上流 dist/codex は 38 skill。当方の skills/ は amadeus 独自 skill（例: amadeus-validator、amadeus-grilling、amadeus-domain-modeling 等の上流に対応のないもの）を含む。

- A. 上流に対応する skill だけに付与する（純正取り込みの範囲を明確化。独自 skill への付与は Codex ハーネス対応を実際に進める後続作業で判断）
- B. 全 amadeus skill に一律付与する（内容は同一 guard のため安全だが、上流 provenance を持たないファイルが混ざる）
- C. その他
- X. Other (please specify)

[Answer]: A（上流対応 skill のみ）。純正性検証（fresh clone + provenance 照合）の範囲と取り込みファイルの範囲が 1:1 になり、追跡が単純になる。独自 skill への拡張は上流対応物がなく「取り込み」ではなく「新規設計」になるため、本 Intent（適応取り込み）のスコープ外とする。自己判断（理由付き）。

## Q2. harness/codex/ の Phase 1 時点の中身

- A. README（ハーネス契約 = Codex の skill 発見規則、openai.yaml の役割、Phase 2 正準化予定）+ provenance 記録（基準 commit、写像表、再生成手順）の 2 文書のみ（最小）
- B. A に加えて上流 harness/codex の emit.ts / hooks adapter もこの時点で取り込む
- C. その他
- X. Other (please specify)

[Answer]: A（2 文書のみ）。emit.ts / hooks adapter は build 化（Phase 2）と Codex 実行対応（将来）の構成要素であり、Phase 1 = 「openai.yaml 群の適応取り込み + 差分層の置き場新設」の範囲を超える（Right-Sizing、設計確定 Q3 = Phase 1 は tooling 不変とも整合）。自己判断（理由付き）。
