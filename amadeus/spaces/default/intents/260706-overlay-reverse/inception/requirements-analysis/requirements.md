# Requirements — 260706-overlay-reverse（Issue #579）

上流入力: [business-overview.md](../../../../codekb/amadeus/business-overview.md)、[architecture.md](../../../../codekb/amadeus/architecture.md)、[code-structure.md](../../../../codekb/amadeus/code-structure.md)（codekb 採用 + 差分更新 = reverse-engineering）、Issue #579 本文、ディスパッチ decision（state-init 宛）

## 前提実測

1. 発生機構: インストーラ（`scripts/amadeus-install.ts`）の engineDirs は `agents` を含み、`.agents/amadeus/agents/*.md` を per-file コピーする（#543 の AD-7 転換後は `enumerateDistFiles` → `trackedWrite`）。開発環境は #554 overlay 適用済みのため、`amadeus-architect-agent.md` と `amadeus-design-agent.md` の `modelOverride: fable` がそのまま配布される（実測: 現ツリーで 2 ファイルが `fable`、他は `opus` / `sonnet`）。
2. overlay 宣言の正: `dev-scripts/data/model-overrides.json`。現物は agents 2 件（architect / design、いずれも `model: fable` / `base: opus`）と `fallbacks: { fable: opus }`。
3. 流用元の逆変換実装: `dev-scripts/parity-check.ts` の `normalizeModelOverlay`（229〜252 行目付近）。base 記録済み、かつ実値が管理値集合（宣言モデル ∪ 宣言済み fallback 先）と一致する場合に限り、`modelOverride` 行を base 値へトークン一致置換する。base 未記録（bootstrap window）や管理外値は置換しない。
4. #543 との整合の論証（feasibility 実測済み）: manifest は「書き込んだ内容」の sha256 を記録するため、逆変換をコピー内容へ適用してから `trackedWrite` に渡せば、manifest hash = 逆変換後の配布内容となり、次回更新時の 3-way 判定は通常の上書き象限に落ちる。本 Intent はこの整合を eval で実証する。
5. 流用面の実測: `normalizeModelOverlay` 自体は parity-check.ts 内の非 export 関数だが、それが依存する `readModelOverrideLine` / `setModelOverrideLine` は `dev-scripts/apply-model-overrides.ts`（76・82 行目）で export 済みであり、parity-check.ts 自身が import して使い（30 行目）、`dev-scripts/evals/model-overlay/check.ts` が直接単体テストしている。同ファイルは `import.meta.main` guard（219 行目）を持ち import 副作用はない。#451 の NFR-2（外部依存なし）は npm 外部パッケージの禁止であり、repo 内モジュールの import を禁じてはいない。実装方式は questions の Q1 で確定済み: export 済み helper を import し、管理値集合の判定だけを installer 内に書く（[requirements-analysis-questions.md](requirements-analysis-questions.md) Q1 = A）。

## 機能要求

### FR-1: 配布物の modelOverride を overlay base 値にする

- FR-1.1: インストーラが agent md（`.agents/amadeus/agents/*.md`）を配布するとき、overlay 宣言（`dev-scripts/data/model-overrides.json`）に該当する agent は `modelOverride` を base 値（現宣言では opus）へ逆変換した内容を書き込む。
- FR-1.2: 逆変換の判定は #554 の parity 逆変換と同じ保守則に従う。base 記録済み、かつ実値が管理値集合（宣言モデル ∪ 宣言済み fallback 先）と一致する場合に限り置換する。base 未記録または管理外値の場合は置換せずそのままコピーする（無言の改変をしない）。
- FR-1.3: overlay 宣言ファイルが source に存在しない、または読めない場合は、逆変換なしで従来どおりコピーする（overlay は任意機構であり、installer を fail させない）。残存リスク: agent md に overlay 値が焼き込まれたまま宣言ファイルだけが欠落した source からは、overlay 値がそのまま配布される。この状態は開発 repo の破損（parity 検査と #554 eval が fail する状態）であり installer 側では検出せず、この分岐の挙動（そのままコピー = fail-open）を eval で固定する（FR-4.1）。

### FR-2: overlay 適用中の開発環境からの install で成立する

- FR-2.1: overlay 適用済みの source（実値 fable）から install した配布物で、該当 agent md の `modelOverride` が base 値であることを eval で検証する（Issue 受け入れ条件 2）。
- FR-2.2: 逆変換は配布物側だけに作用し、source 側のファイルは変更しない。

### FR-3: #543 manifest / 3-way 判定との整合

- FR-3.1: manifest（`.amadeus-install.json`）に記録する hash は、逆変換後に実際へ書き込んだ内容の sha256 とする（#543 の「書き込んだ内容を記録する」規定の帰結。実装点は `trackedWrite` へ渡す content が逆変換済みであること）。
- FR-3.2: 逆変換つき install → 再 install で、該当 agent md が「変更なし = skip」象限に落ちる（退避が発生しない）ことを eval で検証する（#543 feasibility の論証の実証）。

### FR-4: 検証

- FR-4.1: 新規挙動（FR-1、FR-2、FR-3.2、および FR-1.3 の fail-open 分岐 = 宣言ファイル不在時にそのままコピーされること）の eval assertion を TDD 先行（RED 確認 → GREEN）で `dev-scripts/evals/installer/check.ts` へ追加する。
- FR-4.2: 既存 installer eval（353 assertion）の全 GREEN を維持する。
- FR-4.3: PR 作成前に validator（Intent 指定）と `npm run test:all` を実行し記録する。

## 制約

- 変更対象は `scripts/amadeus-install.ts` と `dev-scripts/evals/installer/check.ts` の 2 ファイルとする（README 英日は overlay / modelOverride への言及がなく = grep 実測、変更不要）。エンジン・skill・overlay 機構本体は変更しない。`apply-model-overrides.ts` と `parity-check.ts` はどちらも無変更で、export 済み helper（`readModelOverrideLine` / `setModelOverrideLine`）を import して使うだけとする（questions Q1 = A）。
- bugfix scope の Right-Sizing に従い、逆変換以外の配布内容変換（新しい変換一般機構）を作らない。
- merge 順 = #572 B002 → #579（ディスパッチ指示）。rebase は当方が持つ。証跡 = 本 record の [audit shard](../../audit/) の DECISION_RECORDED（Stage: state-init、Timestamp: 2026-07-06T12:16:22Z。「merge 順 = #572 B002 → #579、rebase は engineer2 が持つ」を含むディスパッチ decision の転記）。

## 受け入れ条件（Issue #579 対応）

| Issue 受け入れ条件 | 対応 FR |
|---|---|
| 配布物の agent md の `modelOverride` が overlay base 値（opus / sonnet）である | FR-1 |
| overlay 適用中の開発環境からインストールしても成立する（逆変換の検証を含む） | FR-2、FR-4.1 |
| （#543 整合、ディスパッチ補足）3-way の通常上書き象限に落ちる整合の eval 実証 | FR-3 |
