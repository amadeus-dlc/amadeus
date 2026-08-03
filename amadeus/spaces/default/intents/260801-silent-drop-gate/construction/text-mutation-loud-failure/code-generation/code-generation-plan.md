# Code Generation Plan — text-mutation-loud-failure

## 対象とトレーサビリティ

本計画は Unit `text-mutation-loud-failure`、Issue #1874、#1963 の統合後回帰、および当該 Unit の Functional／NFR Design に対応する。

## 実装計画

- [x] Step 1: `ValidatedStageState` と `TextMutationResult = changed | not-found` を正本 helper に導入する。対応: silent no-op success の禁止。
- [x] Step 2: `setCheckbox`／`setStageSuffix` が mutation 後を再 parse し、postcondition を満たす場合だけ `changed` を返すようにする。対応: all-or-nothing と idempotent set。
- [x] Step 3: typed validation／target／invariant error と private success construction を実装する。対応: caller が成功を偽装できない境界。
- [x] Step 4: state、jump、utility の全 production callsite を `validateStageState → setter → requireChanged` へ移行し、write／audit／success より前に停止する。対応: loud failure の全経路伝播。
- [x] Step 5: per-unit state の正当な重複を `(unit, slug)` で限定し、unit 内重複と文脈なしの曖昧 target を拒否する。対応:既存 merge 互換と一意性。
- [x] Step 6: unit／integration regression を追加・更新し、t76／t77／t82、t108、t194、t224、t400 を検証する。対応: Comprehensive test strategy。
- [x] Step 7: coverage registry／ratchet と全 harness projection を正本から再生成する。対応: coverage／配布 drift 防止。
- [x] Step 8: typecheck、lint、package/promote drift、focused regression を実行する。対応: 完了条件。

## 非適用項目

新規 API、DB、UI、service、credential、test runner 設定は不要である。#1963 の修正は再実装せず、既存 t407／t411 を回帰確認対象とする。
