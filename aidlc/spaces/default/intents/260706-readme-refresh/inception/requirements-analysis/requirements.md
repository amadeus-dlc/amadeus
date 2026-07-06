# Requirements：260706-readme-refresh

## Intent 分析

### 目的

README.md / README.ja.md の全記載を、記載を正とせずコードベースの実体を正として照合し、乖離をすべて解消する（Issue #535）。達成したい状態は次の 2 点である。

1. README.md / README.ja.md の全記載（skill 名、scope、ステージ数、パス、リンク）が実体と一致している。
2. 実在しない参照が 0 件であり、その機械検査の結果が PR に記載されている。

### 上流の位置づけ

- 要求の正は Issue #535（乖離 6 系統は Maintainer が実測済みで本文に記載）である。intent-statement / scope-document は scope（refactor）により SKIP のため存在せず、Issue とディスパッチ定型文（reverse-engineering 宛 DECISION_RECORDED に転記済み）が上流入力を代替する。
- コードベース知識は `aidlc/spaces/default/codekb/amadeus/`（本 Intent の reverse-engineering で 7829d99a 基準へ差分更新済み）を補助参照とする。ただし README 照合の正は codekb ではなく実体（`.claude/skills/` / `.agents/skills/` / `.agents/amadeus/scopes/` / `docs/amadeus/lifecycle/` / `.agents/amadeus/tools/data/stage-graph.json`）である（Maintainer 指定の作業方法）。
- 言語方針は merge 済みの `docs/amadeus/language-policy.md`（英語 README.md = 正、README.ja.md = 同期、両方を同一 PR で更新）に従う。
- 接触面の確認は完了している（engineer4 の #534、engineer1 の #428 とも README 非接触の回答を受領。先勝ちで進行）。

## 機能要求

Issue #535 の乖離 6 系統を FR-1〜FR-6 に、本 Intent の実測で追加確認した乖離を FR-7 に、日本語版の同期を FR-8 に割り当てる。行番号は現行 README.md のものである。

### FR-1: 存在しない skill への言及の解消（乖離 1）

- FR-1.1: 補助入口の一覧（L100〜L104）を、実在する 3 skill（`amadeus-grilling`、`amadeus-domain-modeling`、`amadeus-validator`）に更新する。`amadeus-event-storming`（L100、L133）と `amadeus-domain-grilling`（L103、L134）への言及を削除する。
- FR-1.2: Typical Flow 直後の補助入口の説明文（L132〜L135）を、実在する 3 skill の説明に置き換える。

### FR-2: 存在しないディレクトリへのリンクの解消（乖離 2）

- FR-2.1: `examples/` へのリンク（L12、L161）を削除する。examples は退役済みで、ディレクトリは存在しない（`ls examples` で不在を実測確認済み）。

### FR-3: scope 一覧の更新（乖離 3）

- FR-3.1: Highlights の scope 列挙（L11）に `pdm` を加え、`.agents/amadeus/scopes/` の実在 10 ファイル（bugfix、enterprise、feature、infra、mvp、pdm、poc、refactor、security-patch、workshop）と一致させる。

### FR-4: 旧 skill 命名の解消（乖離 4）

- FR-4.1: Internal Skills 表（L111〜L116）の `amadeus-<phase>-<stage>` 形式（`amadeus-ideation-intent-capture` など 22 個）を、現行の `amadeus-<stage>` 形式へ更新する。実在一覧は `.claude/skills/` / `.agents/skills/`（両方 41 skill、一致を実測確認済み）を正とする。
- FR-4.2: 実在しない `amadeus-decision-review`、`amadeus-history-review`、`amadeus-learning-review`（L116）を削除する。
- FR-4.3: 表の分類は実在 skill の役割に合わせて再構成する: ステージ実行 skill（29 個 = 32 ステージ − Initialization 3）、scope 焼き込み shortcut（`amadeus-bugfix` / `amadeus-feature` / `amadeus-mvp` / `amadeus-security-patch`）と `amadeus-init`、読み取り専用ユーティリティ（`amadeus-outcomes-pack` / `amadeus-replay` / `amadeus-session-cost`）。

### FR-5: ステージ数の更新（乖離 5）

- FR-5.1: 「22 stages」（L11、L162）を、stage-graph の実体（`.agents/amadeus/tools/data/stage-graph.json` = 32 ステージ、Initialization / Ideation / Inception / Construction / Operation の 5 phase）に合わせて更新する。

### FR-6: インストーラ導入手順の整合（乖離 6）

- FR-6.1: 「Install into a Workspace」節（L38〜L79）を `scripts/amadeus-install.ts` の実装と照合する。実測結果: engineDirs 7 個（agents、amadeus-common、hooks、knowledge、scopes、sensors、tools）は `.agents/amadeus/` の実体と一致し、`npm run amadeus:install` は package.json の scripts に実在し、`.claude/<name>` symlink の対象（claudeSymlinks）は engineDirs と同一 7 個であり、post-install verification の `doctor` サブコマンドは `amadeus-utility.ts` に実在する。節の記載は現状正確である。照合の証跡を残し、乖離が見つかった場合だけ修正する。

### FR-7: 実測で追加確認した乖離の解消（乖離 6 系統の「上記以外」）

- FR-7.1: `amadeus-steering`（L93、L128）は実在しない。ライフサイクル入口の番号リストと Typical Flow の該当行を、単一入口 `amadeus`（エンジン駆動）の実態に合わせて書き直す。
- FR-7.2: `npm run validate:all`（L142）は package.json に存在しない。Validation 節を実在する `validate:workspace` の用法に更新する。
- FR-7.3: Boundaries の `intents/intents.md`（L178）は廃止済み（GD009。正準台帳は `intents/intents.json`）。記述を現行契約へ更新する。
- FR-7.4: skill-forge 段落（L118〜L120）は、引用先の team.md に定義が存在しない（`grep skill-forge` で全 normative docs に不在を実測確認済み）。段落を削除する。
- FR-7.5: 「stage routing driven by `aidlc-state.md`」（L10）と Usage のライフサイクル入口説明（L91）を、エンジン駆動（`amadeus-orchestrate.ts` の next / report forwarding loop）の実態に合わせて更新する。
- FR-7.6: Documentation 節に、merge 済みの `docs/amadeus/language-policy.md` へのリンクを追加する（PR #536 で新設された正準文書の反映）。
- FR-7.7: Issue 項目 6 が名指しした新機能 2 点は、確認のうえ README への追記は不要と判断する。(a) 多体連携（leader + engineer1〜3）は Amadeus 自己開発チームの運用ポリシー（team.md「多体連携の運用」節）であり、README の対象読者（Amadeus を自分の workspace に導入する利用者）向けの機能ではない。(b) docs-only 宣言（`amadeus-state.ts declare-docs-only`）はエンジンのサブコマンド契約であり、README の Usage は skill 入口の粒度で書かれておりエンジンのサブコマンドを列挙しない（既存のどのサブコマンドも README に載っていない）。いずれも「反映すべきで欠落」ではなく「README のスコープ外」として扱う。

### FR-8: README.ja.md の同期（言語方針）

- FR-8.1: README.ja.md を README.md（英語、正）と同一内容の対訳として同一 PR で更新する（`docs/amadeus/language-policy.md` の同期規約の実践）。

## 非機能要求

- NFR-1: 両 README の全リンク（相対パス・アンカー）の解決可能性を機械検査し、実在しない参照 0 件の結果を PR 説明に記載する。検査はセッションの scratchpad に置く一時スクリプト（リポジトリにはコミットしない）で実施し、検査コマンドと結果を PR 説明に転記する。これにより C-1（変更対象は README 2 ファイルに限る）と矛盾しない。修正前ベースラインの実測では examples/ の 4 件（各 README 2 件）が検出済みであり、検査の検出力を確認済みである。
- NFR-2: README.ja.md は japanese-tech-writing 規範に従う。
- NFR-3: 照合の証跡（照合対象と実測コマンド）を record（code-summary.md または diary）に残す。

## 制約

- C-1: 変更対象は README.md / README.ja.md の 2 ファイルに限る。実装コード・テストコード・他の docs は変更しない。
- C-2: PR 作成前に対象 Intent の validator と `npm run test:all` を実行し、結果を記録する。
- C-3: PR の merge は人間が行う。

## 前提

- A-1: 乖離 6 系統は Issue #535 本文の Maintainer 実測を正とする（本 Intent で再実測して確認する）。
- A-2: 基点は origin/main = 7829d99a（PR #536 merge 後）である。README への並行接触はない（engineer4 / engineer1 の回答受領済み）。

## スコープ外

- README の構成再編（入口 + 詳細ガイド委譲の構成検討は #533 の epic に委ねる）。
- AMADEUS.md、docs/amadeus/**、CONTRIBUTING.md など README 以外の文書の乖離修正。
- examples/ 機構そのものの復活・代替の検討。

## 未解決事項

なし（小さな構造判断は questions ファイルに記録し、gate の承認で確定する）。
