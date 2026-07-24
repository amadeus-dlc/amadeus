# Performance Design — U1 tla-externalize

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 読込経路

- `TlaModelLoader`は`.tla`と`.cfg`を各1回だけ`node:fs`で`Uint8Array`として読み、同じbytesをidentity計算と既存生成処理へ渡す。
- process-global cache、streaming、並列読込は導入しない。対象が単一モデルであり、キャッシュ無効化や二重I/Oの複雑性が利益を上回るためである。
- `model-map.json`は1回parseし、各entryを1回hashする。計算量はentry数O(n)、総bytes O(bytes)とする。

## 予算と検証

- 移行受入時だけ、U1実装直前の親commitを`BASELINE_SHA`として固定し、baseline commitと実装source stateを別々の一時worktreeで同じFormalElection benchmarkへbuild・実行する。通常は実装commit SHAをsource-state identityとする。Code Generation workerにcommit禁止が課された場合は、`git diff --binary HEAD`と全U1未追跡ファイルのpath+bytesをpath昇順で結合したSHA-256を`IMPLEMENTATION_TREE_IDENTITY`として固定し、そのdiffを同じbaselineから作った一時worktreeへ適用して測定する。raw samples、`BASELINE_SHA`、`IMPLEMENTATION_TREE_IDENTITY`、diff SHA-256、測定commandをU1 code-generation配下のartifactへ保存する。旧埋め込みbytesや旧実装を現行treeへコピー・保持しない。
- 各buildを同一hostでwarm-up 2回後に10回計測し、medianとmaxを記録する。合格条件は実装commitのmedianがbaselineの110%以下、maxがbaselineの120%以下、かつ各loadが250ms未満であることとする。
- 通常CIでは単一ソースの現行buildだけを実行し、各load 250ms未満を継続判定する。相対比較のraw結果は移行受入artifactとして保存し、benchmark用一時worktreeは測定後に削除する。
- 測定環境としてOS、architecture、Bun version、baseline commit SHA、実装commit SHAまたは`IMPLEMENTATION_TREE_IDENTITY`、diff SHA-256、fixture byte数を記録する。raw samples artifact自身のSHA-256もcode summaryへ記録し、commit禁止下でも入力と結果をcontent-addressedに再検証可能にする。通常CIの既存timeoutを変更せず完走し、U1のためだけのTLC実行やnetwork I/Oを追加しない。
- memory/CPUの独立SLOは短命な単一モデル処理のため非該当とし、異常な増加はCI時間とprocess失敗で検出する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T22:11:28Z
- **Iteration:** 1
- **Scope decision:** none

model-map.jsonの許可パス境界が上流契約と矛盾し、固定パス方針と公開API、性能合否基準、エラー写像も実装可能な粒度まで確定していません。

### Findings

- Major — asset pathとimplementation-entry pathの信頼境界、許可root、symlink処理、正規化後包含判定が不足しています。
- Major — repository rootのowner、path引数の公開性、worktreeや任意cwdでの解決が未定義です。
- Major — baseline、許容退行率または絶対上限、反復回数、集計方法、測定環境が未定義です。
- Major — ModelLoadErrorとSOURCE_DRIFTからHARNESS_ERRORへの型、Result、exit、ownerの写像が未完成です。
- Minor — component owner、関数契約、同期Result、依存方向が未定義です。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T22:12:40Z
- **Iteration:** 2
- **Scope decision:** none

前回の主要論点は概ね具体化されましたが、adapterの型契約がエラー写像責務と矛盾し、性能比較方式も単一ソース方針と両立していません。

### Findings

- Major — adapter入力をResult<VerifiedTlaSource, ModelLoadError | SourceDriftError>として成功時だけgenerator/receiptへ進む契約が必要です。
- Major — 旧埋め込み版との同一process比較が二重ソース禁止と矛盾し、移行前commitとの別build比較または一時benchmarkの生成・廃棄手順が必要です。
- Minor — repository root探索の最初の祖先採用と複数候補拒否が矛盾し、唯一候補または最寄り候補へ一意化が必要です。
- Resolved — asset/implementation-entry信頼境界、realpath包含、symlink拒否、許可rootは分離されました。
- Resolved — cwd非依存root、任意path非公開、component owner、同期Result、依存方向は定義されました。
- Resolved — 性能計測回数・集計・閾値・環境とerror taxonomyは具体化されました。
