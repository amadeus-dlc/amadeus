# スコープ、深度、テスト戦略

> 言語: [English](05-scopes-and-depth.md) | **日本語**

スコープは**どのステージを実行するか**を制御します。深度は各ステージが生成する**詳細の量**を制御します。テスト戦略は**生成されるテストの数**を制御します。これらを組み合わせることで、ライフサイクルをあなたのタスクに適応させます — 包括的なエンタープライズ機能から、素早いバグ修正まで。

---

## 10 のスコープ

すべてのワークフローは、名前付きの 10 のスコープのいずれかの下で実行されます。各スコープはステージ集合とデフォルトの深度レベルを定義します。

### enterprise

**使う場面:** 完全な監査証跡、コンプライアンスレビュー、本番グレードの運用を必要とする、規制対象のエンタープライズ機能を構築するとき。

- **ステージ:** 全 32
- **デフォルト深度:** Comprehensive
- **含むもの:** 完全なコンプライアンス、セキュリティ、運用のステージ

### feature

**使う場面:** 任意の規模の新機能を構築するとき。AI-DLC がより具体的な一致を判定できない場合のデフォルトスコープです。

- **ステージ:** 全 32
- **デフォルト深度:** Standard
- **含むもの:** すべてのステージ、標準的な成果物の詳細度

### mvp

**使う場面:** グリーンフィールドの実用最小限の製品(MVP)を構築するとき。後段の運用ステージをスキップしますが、完全な設計と構築は保持します。

- **ステージ:** 32 のうち 22
- **デフォルト深度:** Standard
- **スキップ:** 7 つの Operation ステージすべて(デプロイパイプライン、環境プロビジョニング、デプロイ実行、可観測性、インシデント対応、パフォーマンス検証、フィードバック)に加えて、Ideation の Market Research、Team Formation、Approval Handoff(10 個スキップ、22 個実行)

### poc

**使う場面:** 実現可能性を素早く実証するとき。ほとんどの Ideation と Inception のステージをスキップし、素早くコードに到達することに焦点を当てます。

- **ステージ:** 32 のうち 8
- **デフォルト深度:** Minimal
- **スキップ:** Market Research、Feasibility、Team Formation、Mockups、User Stories、ほとんどの Operation ステージ

### bugfix

**使う場面:** 特定のバグを修正するとき。intent の把握からコード生成とテストまでの合理化されたパスです。

- **ステージ:** 32 のうち 7
- **デフォルト深度:** Minimal
- **スキップ:** Market Research、Feasibility、Team Formation、Mockups、ほとんどの設計・アーキテクチャステージ、すべての Operation ステージ

### chore

**使う場面:** 開発スクリプト・docs・CI 設定などユーザー可視契約に触れない、1〜数ファイルの小さな自己完結の修正を行うとき。

- **ステージ:** 32 のうち 5
- **デフォルト深度:** Minimal
- **スキップ:** すべての Ideation ステージ、すべての Inception ステージ(reverse engineering、requirements analysis 以降)、Functional Design、すべての Operation ステージ — 実行するのは初期化の3ブートストラップステージと Code Generation、Build and Test のみ

### refactor

**使う場面:** 機能を変更せずに既存コードをクリーンアップまたは再構築するとき。

- **ステージ:** 32 のうち 8
- **デフォルト深度:** Minimal
- **スキップ:** bugfix と同様 — コード分析、設計、実装に焦点を当てる

### infra

**使う場面:** インフラ変更(新環境、CDK/CloudFormation の更新、コスト最適化)を行うとき。

- **ステージ:** 32 のうち 13
- **デフォルト深度:** Standard
- **スキップ:** ユーザー向けステージ(ストーリー、モックアップ、ユーザーフロー) — アーキテクチャ、インフラ、デプロイに焦点を当てる

### security-patch

**使う場面:** CVE またはセキュリティ脆弱性に対応するとき。セキュリティ関連ステージを通過する高速パスです。

- **ステージ:** 32 のうち 10
- **デフォルト深度:** Minimal
- **スキップ:** Market Research、Team Formation、Mockups、セキュリティ以外の設計ステージ

### workshop

**使う場面:** AI-DLC ワークショップまたはトレーニングセッションを実施するとき。プロジェクトはファシリテーターによって事前に決定されており、参加者はモブとして inception、construction、operation を進めます。

- **ステージ:** 32 のうち 25
- **デフォルト深度:** Standard
- **デフォルトテスト戦略:** Minimal(Nyquist) — ワークショップのペースを速く保つ
- **スキップ:** すべての Ideation ステージ(1.1-1.7) — プロジェクトスコープは事前決定済み

複数開発者向けの手動レシピとクレームのセマンティクスについては、[ワークショップモード](workshop-mode.ja.md) を参照してください。

---

## スコープルーティングテーブル

正式なデータは `.claude/scopes/amadeus-<name>.md` ファイル(スコープの識別情報)と、各ステージの `scopes:` フロントマター(メンバーシップ)にあり、`.claude/tools/data/scope-grid.json` にコンパイルされます。ライブでコンパイルされたテーブルを取得するには `bun .claude/tools/amadeus-utility.ts scope-table` を実行してください(ユーザー向けの一行説明には `bun .claude/tools/amadeus-utility.ts help`)。

| スコープ | EXECUTE / 合計 | 深度 | テスト戦略 | ユースケース |
|-------|-----------------|-------|---------------|----------|
| `enterprise` | 32 / 32 | Comprehensive | Comprehensive | 規制対象のエンタープライズ機能、完全な監査証跡 |
| `feature` | 32 / 32 | Standard | Standard | 新機能のデフォルト |
| `mvp` | 22 / 32 | Standard | Standard | グリーンフィールド、後段の運用をスキップ |
| `poc` | 8 / 32 | Minimal | Minimal | 実現可能性を素早く実証 |
| `bugfix` | 7 / 32 | Minimal | Minimal | 特定のバグを修正 |
| `chore` | 5 / 32 | Minimal | Minimal | 小さな自己完結の修正 |
| `refactor` | 8 / 32 | Minimal | Minimal | 既存コードをクリーンアップ |
| `infra` | 13 / 32 | Standard | Standard | インフラ変更 |
| `security-patch` | 10 / 32 | Minimal | Minimal | CVE 対応 |
| `workshop` | 25 / 32 | Standard | **Minimal** | AI-DLC ワークショップまたはトレーニングセッション |
| (自動検出) | 可変 | 可変 | 可変 | AI が自由記述の intent から判定 |

> **プロジェクトごとのデフォルトスコープ:** チームは `.claude/settings.json` に `AMADEUS_DEFAULT_SCOPE` を設定することで、プロジェクトのデフォルトスコープを事前設定できます — 全参加者がフラグを覚えずに `workshop` から開始すべきワークショップに便利です。[カスタマイズ § プロジェクトごとのデフォルトスコープ](13-customization.ja.md#per-project-default-scope) を参照してください。

---

## 自由記述の Intent からの自動検出

スコープを明示的に指定する必要はありません。やりたいことを記述すれば、オーケストレーターがキーワードから適切なスコープを検出します:

```
/amadeus Build a REST API for inventory management
```

エンジンはあなたの intent をキーワードパターンに照らして分析します:

| キーワード | 検出されるスコープ |
|----------|---------------|
| "fix"、"bug"、"broken" | `bugfix` |
| "chore"、"tweak" | `chore` |
| "refactor"、"clean up"、"simplify" | `refactor` |
| "infrastructure"、"deploy"、"infra" | `infra` |
| "security"、"CVE"、"vulnerability"、"patch" | `security-patch` |
| "proof of concept"、"prototype"、"poc"、"spike" | `poc` |
| "mvp"、"minimum viable" | `mvp` |
| "workshop"、"lab"、"training" | `workshop` |
| その他すべて | `feature` |

**曖昧性解消ルール:** 入力にスコープキーワードとより長いプロジェクト説明(5 語超)の両方が含まれる場合、その一致は偶発的なものとして扱われ、代わりに compose の提案(後述)が発火します。これにより、"Fix the infrastructure monitoring dashboard" のような入力が、より適切なのは調整された計画であるにもかかわらず `infra` にルーティングされる、といったミスマッチを防ぎます。

明確なキーワード一致の後、一致した(MATCHED)スコープ名を示す一行確認が表示されます:

```
Starting a "bugfix" workflow for: "fix login bug". Confirm to proceed,
name a different scope, or say "compose" for a tailored plan.
```

続行するには確認するか、ワークフロー開始前に軌道修正するために別のスコープ(または `compose`)で応答してください。

---

## 適応型コンポーザー

既製のスコープが明確に合致しない場合(豊かな散文、キーワードヒットなし、または長い説明に埋もれたキーワード)、`/amadeus` は静かに `feature` にデフォルトする代わりに、調整された計画を COMPOSE することを提案します。強制することもできます:

```
/amadeus compose "harden the deployment pipeline and add observability"
/amadeus-compose "same thing, as a typeable shortcut"
/amadeus compose --report sonar.json     # スキャンレポートから compose
/amadeus --new-scope "..."               # 既製の一致があってもカスタムスコープを強制
```

コンポーザーエージェントはあなたのタスクとワークスペースのスキャン(brownfield/greenfield、言語)を読み取り、合致する EXECUTE/SKIP グリッドを、スキップされる各ステージの理由とともに提案します。あなたはゲートで承認、編集、または却下します。明示的な承認の前には何も書き込まれず、ワークフローも開始されません。承認時:

- 提案が既製のスコープに一致(MATCHED)した場合、ワークフローはそのスコープで直接誕生します(コードレベルの発見でいっぱいのスキャンレポートは、通常この方法で `bugfix` または `security-patch` にルーティングされます)。
- カスタムグリッドの場合、コンポーザーは実際のスコープ(`scopes/amadeus-<name>.md` と `scope-grid.json` エントリ)を作成し、同じターンでワークフローがそれに基づいて誕生します。作成されたスコープは、その後は既製のスコープと同様に解決され(`/amadeus --scope <name>`)、グラフの再コンパイルにも耐えます: `amadeus-graph.ts compile` は、ステージフロントマターだけからグリッドを再構築するのではなく、作成されたグリッドエントリを再生成された `scope-grid.json` に折り込み直します。

**キーワード衛生:** 作成されたスコープは `keywords: []` で出荷されるため、一度きりの計画がキーワード自動検出に参加することは決してありません。作成されたスコープを将来のプロンプトで推論可能にするかどうかは、ゲートでの明示的な質問であり、副作用ではありません。

**進行中の再コンポーズ:** ワークフローの途中で、`/amadeus compose` は実行中のワークフローの PENDING ステージの再構成を提案します — もはや不要になったものをスキップし、必要だと気づいた pending ステージを追加し直します。フリップは pending でカーソルより先のステージにのみ適用され(完了済みおよび進行中のステージは凍結されます)、残りのステージが必要な入力を欠かないように検証され、`RECOMPOSED` 監査イベントとともに監査ロックの下で決定論的な `recompose` 動詞を通じて反映されます。Construction の最初の EXECUTE ステージ(walking-skeleton ゲートのアンカー)はフリップできません。

リテラルな動詞は不要です: 「market research をスキップできますか?この市場はすでにわかっています」といった普通のチャットは、ワークフロー途中で再構成リクエストとして認識され、同じゲートと同じ `recompose` 動詞を通じてルーティングされます。ステージを自分で指定した場合(「market-research と team-formation を外して」)、コンダクターはコンポーザーエージェントをディスパッチせずにゲートを直接提示することがあります — どちらの場合も承認ゲートと検証は同一です。Kiro と Codex では、リテラルな `/amadeus compose "<request>"` 動詞が、文書化された信頼できるパスであり続けます。

---

## 3 つの深度レベル

深度は、各ステージで生成される成果物の詳細レベルを制御します。スコープがデフォルトの深度を設定しますが、上書きできます。

| 深度 | 成果物の詳細度 | 使う場面 |
|-------|----------------|-------------|
| **Minimal** | 核心的な要点のみ。短い文書、主要な意思決定、最小限の補助分析。 | 素早い修正、パッチ、概念実証 |
| **Standard** | バランスの取れた詳細度。完全な要件、根拠付きのアーキテクチャ決定、徹底したテスト計画。 | ほとんどの機能と MVP |
| **Comprehensive** | 完全なエンタープライズ詳細度。網羅的な要件、コンプライアンスマトリクス、詳細な NFR 仕様、完全な監査文書。 | 規制対象の機能、エンタープライズデプロイ |

### 深度がステージに与える影響

各ステージで、エージェントはアクティブな深度に基づいて出力を調整します:

- **Minimal:** 1〜2 ページの成果物、主要な意思決定のみ、任意のセクションはスキップ
- **Standard:** 完全な成果物、すべての必須セクション、簡潔な根拠
- **Comprehensive:** 拡張された成果物、任意のセクションを含む、詳細な正当化、コンプライアンスの相互参照

### 深度の上書き

深度は 3 つのポイントで変更できます:

1. **`--depth` CLI フラグ経由** — 呼び出し時に深度を上書き:
   ```
   /amadeus --depth comprehensive
   /amadeus --scope bugfix --depth standard
   /amadeus --stage code-generation --depth minimal
   ```
2. **スコープ確認時** — オーケストレーターが検出されたスコープを確認するとき、単に確認するのではなく `--depth <level>` で応答します
3. **任意の承認ゲート** — フィードバックの一部として別の深度レベルを要求します

各セッションの最初の完了メッセージがあなたに思い出させます:

```
**Project depth**: Standard — depth adapts artifact detail.
**Test strategy**: Standard — test strategy controls test volume.
You can request different depth or test strategy at any approval gate.
```

---

## スコープを直接指定する

### 明示的なスコープ

```
/amadeus feature
/amadeus bugfix
/amadeus enterprise
```

### 説明付きのスコープ

```
/amadeus bugfix Fix the login timeout issue
/amadeus poc Build a quick prototype for the search feature
```

### ユーティリティコマンドでスコープを上書き

```
/amadeus --scope bugfix
/amadeus --scope enterprise --stage code-generation
```

`--scope` フラグは、ジャンプ操作のために `--stage`、`--phase`、`--depth` と組み合わせ可能です。

### 深度を上書き

```
/amadeus --depth minimal
/amadeus --scope bugfix --depth comprehensive
/amadeus --scope enterprise --depth standard --stage code-generation
```

`--depth` フラグは、スコープのデフォルト深度レベルを上書きします。有効な値: `minimal`、`standard`、`comprehensive`(大文字小文字を区別しません)。

### テスト戦略を上書き

```
/amadeus --test-strategy minimal
/amadeus --depth standard --test-strategy minimal
```

`--test-strategy` フラグは、深度とは独立してテスト戦略を上書きします。完全な説明は、後述の [3 つのテスト戦略レベル](#the-3-test-strategy-levels) を参照してください。

---

## 3 つのテスト戦略レベル

テスト戦略は、**生成されるテストの数**と**含まれるテストの種類**を制御します。これは深度とは独立しています — 深度は成果物の詳細度(文書、図、質問)を制御し、テスト戦略はテストの量のみを制御します。この分離により、テストカバレッジよりも速度が重要な場合に、Minimal テストで完全な Standard 深度のワークフローを実行できます。

### Minimal — Nyquist モデル

信号処理の Nyquist レート(信号を再構成するために必要な最小サンプリング周波数)に着想を得ています。Minimal テスト戦略は、すべての要件を検証するために必要な最小限のテストを生成します — それ以上でもそれ以下でもありません。

- **識別された要件ごとに 1 テスト**(コンポーネント駆動ではなく要件駆動)
- **ハッピーパスの下限:** どのコンポーネントも、対応する要件がなくても、少なくとも 1 つのハッピーパス単体テストを得る
- **単体テストのみ** — 統合、E2E、パフォーマンス、セキュリティテストはスキップ
- 典型的なプロジェクトで**合計 ~5〜15 テスト**
- ソフトガイドライン — 安全上重要なコンテキストが要求する場合、エージェントは超過できる

**最適な場面:** ワークショップ、トレーニングセッション、概念実証、素早いバグ修正 — 完全なテストスイートに投資せずに正しさを検証したいあらゆるコンテキスト。

### Standard — コンポーネント単位モデル

コンポーネント間の境界を検証する、バランスの取れたテストカバレッジ。

- **コンポーネントごとに 5〜8 テスト**
- **単体 + 統合テスト**(コンポーネント間の主要な境界)
- E2E、パフォーマンス、セキュリティテストは、NFR 要件が明示的に要求する場合のみ
- **テストピラミッドの比率:** ~75% 単体 / ~20% 統合 / ~5% E2E
- ソフトガイドライン

**最適な場面:** ほとんどの機能と MVP — テストに過剰投資せずに良好なカバレッジ。

### Comprehensive — 完全カバレッジモデル

すべてのテスト種類にわたる徹底したテストカバレッジ。

- **コンポーネントごとに 10〜15 テスト**
- **すべてのテスト種類:** 単体 + 統合 + E2E + パフォーマンス(NFR が存在する場合) + セキュリティ(NFR が存在する場合)
- **テストピラミッドの比率**がすべての種類にわたって適用される
- ソフトガイドライン

**最適な場面:** エンタープライズ機能、規制対象システム、テストカバレッジの監査証跡を必要とするあらゆるコンテキスト。

### テスト戦略のデフォルトの仕組み

テスト戦略は、ほとんどのスコープで**深度レベル**にデフォルトします — 深度が Standard なら、テスト戦略も Standard です。ただし、一部のスコープは独自のデフォルトを宣言します:

| スコープ | 深度 | テスト戦略 | なぜ異なるのか? |
|-------|-------|---------------|----------------|
| `workshop` | Standard | **Minimal** | 学習のための完全な成果物、ただしペースを保つための高速な Nyquist テスト |

その他のすべてのスコープは、テスト戦略を深度から継承します。`--test-strategy` でいつでも上書きできます。

### テスト戦略の上書き

テスト戦略は 3 つのポイントで変更できます:

1. **`--test-strategy` CLI フラグ経由** — 呼び出し時に上書き:
   ```
   /amadeus --test-strategy minimal
   /amadeus --depth standard --test-strategy minimal
   /amadeus --scope bugfix --test-strategy comprehensive
   ```
2. **ワークフロー途中** — アクティブなワークフローのテスト戦略を変更:
   ```
   /amadeus --test-strategy comprehensive
   ```
3. **任意の承認ゲート** — フィードバックの一部として別のテスト戦略を要求

### よくある深度 + テスト戦略の組み合わせ

| 深度 | テスト戦略 | 効果 | 使う場面 |
|-------|--------------|--------|-------------|
| Standard | Standard | 完全な成果物、バランスの取れたテスト | ほとんどの機能(デフォルト) |
| Standard | Minimal | 完全な成果物、Nyquist テスト | ワークショップ、時間制約のあるセッション |
| Minimal | Minimal | 軽量な成果物、軽量なテスト | 素早いバグ修正、パッチ |
| Comprehensive | Comprehensive | すべて完全 | 規制対象のエンタープライズ機能 |
| Comprehensive | Standard | 完全な成果物、バランスの取れたテスト | 実用的なテストを伴うエンタープライズ |
| Minimal | Comprehensive | 軽量な成果物、徹底したテスト | 信頼性を必要とする重要なバグ修正 |

---

## 適切なスコープの選択

| 状況 | 推奨スコープ |
|-----------|------------------|
| 本番アプリケーションの新機能 | `feature` |
| ゼロからのグリーンフィールド製品 | `mvp` または `feature` |
| アプローチの素早い検証 | `poc` |
| 既知のバグの修正 | `bugfix` |
| 小さな自己完結の修正 — 開発スクリプト・docs・CI 設定などユーザー可視契約に触れない1〜数ファイルの変更 | `chore` |
| 挙動を変えないコードクリーンアップ | `refactor` |
| 新しい AWS 環境または CDK 変更 | `infra` |
| CVE またはセキュリティ脆弱性への対応 | `security-patch` |
| コンプライアンスを必要とする規制対象機能 | `enterprise` |
| AI-DLC ワークショップまたはトレーニングラボ | `workshop` |

迷ったら `feature` から始めてください — 全 32 ステージを含み、各ステージの承認ゲートで個々のステージをスキップできます。

---

## 次のステップ

- [フェーズとステージ](04-phases-and-stages.ja.md) — 各ステージが何をするか
- [エージェント](06-agents.ja.md) — どのエージェントがどのスコープに参加するか
- [スキルとランナーコマンド](17-skills.ja.md) — bugfix、feature、mvp、security-patch 向けの一語 `/amadeus-<scope>` ランナー
- [CLI コマンド](12-cli-commands.ja.md) — 完全なコマンドリファレンス
- [用語集](glossary.ja.md) — 用語リファレンス
