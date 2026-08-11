上流入力(consumes 全数): requirements.md / unit-of-work.md(SKIP 由来で不在 — 設計どおり)

# Code Generation Plan — fix-1622-allowlist-semantic-audit

対象: Issue #1622。`tests/.coverage-patch-allowlist.json`(623 エントリ)の `reason` と
セレクタが指す実コードの意味的不一致(無音転位)の全数照合・是正と、再発防止ガードの新設。

測定 ref: worktree HEAD `854692fd7a11b124236b0427fe3d59e2fe6bf785`。
上流成果物: `inception/requirements-analysis/requirements.md`(FR-1〜FR-7 / NFR-1〜NFR-4)。
`unit-of-work.md` は `self-fix` が units-generation を SKIP するため不在(`expected: true`)であり、
本計画が unit の作業定義を兼ねる。

## 受け入れ基準の逐語転記(縮小しない)

下流実装が参照する契約は requirements.md の以下である。**本計画は述語を弱めない**
(`cid:code-generation:c3-260803-state-integrity`)。

- **FR-1**: 623 件すべてに `一致` / `転位` / `判定不能` の判定が付き、合計が 623 に一致する
- **FR-2**: (1) `bun tests/coverage-patch-gate.ts --check` が exit 0 (2) 是正前後の免除対象行集合を
  機械 diff し、増加行・減少行の全件がエントリへ帰属する(増加行 = 張り直しを採ったエントリの新解決先、
  減少行 = 張り直しの旧解決先または削除エントリの解決先)。**どのエントリにも帰属しない増加行が 0 件**
  (3) 張り直しは張り直し先が免除に値すると判定した根拠を、削除は削除根拠を、エントリ単位で記録
- **FR-3**: (1) 対象母集団の件数が FR-1 の `判定不能` 件数と一致 (2) 書き換え後に FR-1 の分類を
  再実行すると `判定不能` が 0 件 (3) `一致` / `転位` 分類済みエントリの `reason` を書き換えていない
- **FR-4**: (1) 既知転位を注入すると赤 (2) 是正後の台帳では緑。注入は「注入 → 赤の実測 → revert push」を
  不可分の 1 セット
- **FR-5**: `require_result` 相当の実評価が run ログに現れ、意図的に赤にした PR がマージ不能になることを実測
- **FR-6**: 規約違反・構文クラス不定の 2 クラスそれぞれに赤の実測があり、規約準拠の既存データでは緑
- **FR-7**: 記録された述語を再実行して同一の件数が得られる
- **NFR-1**: 同一入力で 2 回実行が byte-identical。ガード実装がネットワーク・LLM クライアントを
  import しないことを静的 assert
- **NFR-2**: 判定不能・解決失敗・述語の異常終了はすべて赤。空出力を「一致」と解釈しない
- **NFR-4**: 全フィールドを消費するコードが存在することを fixture テストで固定

## 設計 — OQ-1 の解(機械述語と人手 adjudication の境界)

`reason` が主張する内容を**構文クラス**として機械判定し、判定できないものだけを人手へ回す。

### 構文クラスの閉じた語彙(OQ-2 の解)

RE の `reason` 語彙分布(type-only 76 / spawn 260 / catch 32 / dispatch・usage 10)から、
TypeScript AST で決定的に判定できる 5 クラスへ閉じる。

| クラス | 主張 | AST 述語 |
|---|---|---|
| `type-only` | 対象行が型注釈・型引数のみで実行時に消える | 対象行の全ノードが型ノード(`TypeNode` / 型のみの `PropertySignature` 等) |
| `catch-arm` | 対象行が防御的 catch 節 | 対象行が `CatchClause` の内側 |
| `dispatch-case` | 対象行が switch の case ラベル / usage メッセージ | 対象行が `CaseClause` または `DefaultClause` の内側 |
| `spawn-only` | 対象行が CLI エントリ配線で in-process 計測が届かない | 対象行が `import.meta.main` 分岐の内側、または `main` 関数の本体 |
| `unmeasurable-other` | 上記以外の計測不能理由(明示の根拠が要る) | 述語なし。`reason` に明示のクラス宣言が要る |

### 三値判定のアルゴリズム(FR-1)

各エントリについて:

1. `resolveSemanticSelector` で解決(失敗は **NFR-2 により赤**、`判定不能` へ落とさない)
2. `reason` から**主張クラス**を抽出。抽出規則は決定的な文字列述語とし、
   **選言(`A, B, or C`)を検出したら `判定不能`**(クラスを一意に決められないため)
3. `reason` が関数名を名指す場合、それが `selector.function` と一致するか、
   または解決先が当該関数の内側にあるかを照合。**不一致なら `転位`**
4. 主張クラスの AST 述語を解決先の行へ適用。**偽なら `転位`**、真なら `一致`
5. 主張クラスを抽出できない(クラス宣言が無い / 選言)場合は `判定不能`

**人手 adjudication へ回るのは `転位` と判定されたエントリのみ**(是正方針の選択が要るため)。
`判定不能` は FR-3 の書き換え対象であり、書き換え後に再分類する。

## 実行ステップ

TDD を既定とする(`team.md` Testing Posture)。各ステップは Red → 最小実装 → Green の
vertical slice を 1 件ずつ反復する。

### Step 1: 構文クラス判定器(AST 述語)

- 新規モジュール `tests/allowlist-semantic-audit.ts` に、5 クラスの AST 述語を純関数として実装
- 先に失敗テストを 1 件書いて Red を実測してから実装する
- `tests/unit/tNNN-allowlist-semantic-audit.test.ts` に純関数のユニットテスト(実 FS に触れない)
- `cid:code-generation:fs-tests-integration-first` により、実 FS を使う検証は integration 層へ置く

### Step 2: `reason` の主張クラス抽出器

- 選言の検出(`, or ` / ` or ` を含む主張)を含む決定的な抽出規則
- **vacuity guard テスト**: 規約の定型句のみの入力で抽出が空文化しないこと
  (`cid:code-generation:vocabulary-collision-vacuity-guard`)

### Step 3: 三値分類器と全数実行(FR-1)

- Step 1 + Step 2 を合成し、623 件へ適用
- **母集団の恒等式** `一致 + 転位 + 判定不能 = 623` を assert するテスト
  (`cid:functional-design:c1-identity-population-stratify`)
- 分類結果と使用述語を `construction/fix-1622-allowlist-semantic-audit/code-generation/` 配下へ記録(FR-7)

### Step 4: 転位の是正(FR-2)

- 各 `転位` について、`reason` が説明する真の対象を特定し、免除に値するかを判定
- 値する → セレクタを張り直す / 値しない → エントリ削除
- **免除対象行集合の前後 diff とエントリ帰属**を機械検証するテストを置く
- 判定根拠をエントリ単位で記録

### Step 5: `reason` 記述規約と `判定不能` の書き換え(FR-3)

- 規約を `tests/README.md` へ明文化(単一構文クラスの主張、選言の禁止、閉じた語彙 5 種)
- `判定不能` 全件を規約準拠へ書き換え
- 書き換え後に Step 3 を再実行し `判定不能` 0 件を確認
- `一致` / `転位` 分類済みエントリの `reason` 差分が空であることを確認

### Step 6: ガードの新設(FR-4 / FR-6 / NFR-1 / NFR-2 / NFR-4)

- Step 3 の分類器をガードとして `tests/coverage-patch-gate.ts` の check 経路へ組み込む
  (**第 2 の解釈器を作らない** — requirements.md Constraints)
- 落ちる実証: 既知転位の注入で赤、規約違反の注入で赤、構文クラス不定の注入で赤
- 正当な既存データで緑(corpus sweep、`cid:code-generation:corpus-sweep-for-new-guards`)
- NFR-1 の 2 回実行 byte-identical テストと import 静的 assert
- NFR-4 の全フィールド消費 fixture テスト

### Step 7: CI 配線(FR-5)

- `.github/workflows/ci.yml` へ配線。**集約ジョブ `ci-success` の `needs` に載せる**
  (`cid:code-generation:c1-2814-aggregate-needs-is-blocking`)
- `require_result` の無条件評価を入れ、run ログでの実評価を確認
- `t222-ci-snapshot-branch` 系の pin は**位置まで固定**する
  (`cid:code-generation:c6-2814-pin-position-not-just-presence`)

### Step 8: 分離 Issue の起票

- `expiry` 面の意味整合(RE の UNMEASURED-1)を別 Issue として起票し、
  **Issue 番号は本 record 側へ残す**(承認済み requirements.md は書き戻さない)

### Step 9: 検証と配布面の同期

- `bun run typecheck` / `bun run lint` / `bun run build`(追跡ファイル不変の確認)
- `bash tests/run-tests.sh --ci` を**フルスイート 1 回**(`cid:code-generation:c3-conductor-runs-full-suite`)
- coverage registry の再生成と `EXPECTED_NONE_TO_CLI` の追記(`cid:code-generation:integration-registry-regen`)
- 新規テストが追加されるため、honesty ratchet / 境界ガード / registry drift の横断ゲートを通す

### Step 10: PR 発行と収束(ゲート前提)

`pr-convergence` プラグインが `self-fix` に bind されており、`pr-convergence-report.md` は
**plugin CLI のみが書く機械生成物**である。したがってステージ本体の実装完了だけでは produces が揃わない
(`cid:code-generation:c1-tsr-external-cli-produces`)。順序は:

1. Bolt ブランチで PR を発行
2. `j5ik2o-gh-pr-converge-loop` で収束(競合解消 → レビュー対応 → 必須 check green)
3. plugin CLI が `pr-convergence-report.md` を生成
4. §12a レビュー → approve

**マージは `irreversible` として autonomy full のグラント範囲外**であり、
ユーザーの明示承認を得てから leader が実行する(`cid:requirements-analysis:no-ai-merge`)。

## 実装の隔離

本セッションは worktree 隔離ガード下にあるため、実装は Agent の worktree isolation で起動した
builder が行い、conductor が merge-base 起点の取込みと fidelity diff で回収する
(`cid:code-generation:c1-pcp-isolated-session-swarm-incompat`)。
§12a レビューは conductor ツリーを読むため、**取込みは approve 前ではなく review 前**に行う
(`cid:code-generation:c1-mirror-and-rebuild-before-review`)。

## 工数の見通しと停止条件

Step 3 の全数分類で `転位` が RE の下限 18 件を大きく超えた場合(目安: 100 件超)、
Step 4 の是正工数が本 intent の想定を超える。その場合は**実装を止めて報告する** —
スコープを縮めるかどうかは利用者の裁定である(`cid:build-and-test:no-silent-scope-narrowing` /
requirements.md OQ-3)。builder は独断でスコープを縮小しない。
