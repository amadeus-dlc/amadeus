# Infrastructure Services — u001-registry-issues-field

上流入力: [reliability-design.md](../nfr-design/reliability-design.md)、[logical-components.md](../nfr-design/logical-components.md)、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)、[services.md](../../../inception/application-design/services.md)、[constraint-register.md](../../../ideation/feasibility/constraint-register.md)

## 設計

外部サービス依存は無い。U001 は `intents.json` の手編集と互換検証テストだけで完結し、GitHub API 呼び出しを含まない（board 反映は U002 の範囲）。AWS その他のインフラサービスも使わない（repo 内限定の暫定開発ツール、C02 / C07）。

## 判断の位置づけ

repo 内限定・暫定機構（C02 / C07）のため、インフラは「無し」を明示するのが本設計の内容である。新しいインフラ要素を導入しない。
