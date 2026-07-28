# Logical Components — u1-project-sync-skeleton

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

U1 スライスの論理コンポーネント目録と障害ドメインの写像。すべて既存モジュールの拡張(tech-stack-decisions の新規依存ゼロ・既存 runner 再利用)であり、新しいサービス境界を作らない。

## コンポーネント目録(U1 スライス)

| 論理コンポーネント | U1 での責務 | 適用される NFR 設計 |
|---|---|---|
| config(設定解決) | `mirror-projects` の最小 parse(business-logic-model 手順1 — 設定なしは全 skip) | fail-closed 検証(security-design)|
| gateway(GraphQL 到達) | 所属照会・追加・Status 解決・適用の4操作+argv 生成+応答解釈(手順2/3/4/7) | permit ゲート・argv negative assert(security-design)、呼び出し予算(performance-design) |
| policy(期待導出) | `expectedProjectStatus` の canonical 導出+既定マッピング(手順5) | 決定的純関数 — 障害面なし |
| executor(直線経路) | 8ステップの制御フロー全体(business-logic-model) | 冪等分岐・障害分岐の配置(reliability-design) |
| 台帳 codec(永続化) | synced entry の最小形 upsert(手順8) | audit 確定 → state write の既存順序(reliability-requirements) |
| 診断出力 | safety-blocked の観測ログ(手順4/6) | 秘匿(security-requirements の NFR-4 契約 — 設計は security-design の redact 節) |

## 障害ドメインと blast radius

- **gh サブプロセス境界**が唯一の外部障害ドメイン(tech-stack-decisions のプロセスモデル)— 失敗は (a) 照会失敗 → boundary 単位で中断・警告(reliability-design) (b) Project 単位の解決不能 → 当該 Project のみ skip(blast radius = 1 Project)。フレームワーク本体・Issue 面の成果へ波及しない。
- deadline/stdout cap(performance-requirements の既存 profile)がサブプロセスの暴走を時間・容量で封じ込める — 追加の隔離機構は不要。

## 共有リソース

- **state file(git 管理)**: 台帳の唯一の永続面 — 書込は executor → codec の一方向のみ(reliability-requirements のデータ耐久性)。
- **config 3層**: 読み取り専用の共有入力(security-design の fail-closed 検証を通過した値のみが下流へ流れる)。
- **gh credential store**: フレームワーク外の共有シークレット面 — どのコンポーネントも値を保持しない(security-design)。

## 分離戦略

- サービス分離・failure domain 分割の追加設計は N/A — 単発 CLI(scalability-requirements のステートレス構造)では「Project 単位の skip」がそのまま分離単位であり、コンポーネントはプロセス内のモジュール境界(既存の core 構造)で分離される。
