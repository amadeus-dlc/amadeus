# Code Generation Plan — static-gate-engine

## 対象とトレーサビリティ

本計画は Unit `static-gate-engine`、Issue #1979、要件 FR-01〜FR-09、NSD001〜NSD003、および当該 Unit の Functional／NFR Design に対応する。

## 実装計画

- [x] Step 1: `tests/no-silent-drop-gate.ts` と `tests/no-silent-drop/` に短命 Bun CLI の構造を作る。対応: 単一 contributor CLI。
- [x] Step 2: repository-local exact ast-grep dependency と validated source snapshot／coverage sentinel を実装する。対応: partial scan、PATH fallback、走査中変更の fail-closed。
- [x] Step 3: NSD001／NSD002／NSD003 の AST candidate scan と正規化 finding identity を実装する。対応: silent-drop 3形態の検出。
- [x] Step 4: schema v1 の `pass | violations | error`、閉じた infrastructure code、stdout JSON、exit 0／1／2 を実装する。対応: machine contract。
- [x] Step 5: baseline／exemption を read-only に保ち、trusted full SHA に対する shrink-only／同数置換拒否 ratchet を実装する。対応: 債務の単調減少。
- [x] Step 6: `check`、`census-evidence`、`approve-evidence`、`baseline-candidate` の4 mode を一方向 evidence chain として実装する。対応: bootstrap と承認境界。
- [x] Step 7: AST shape fixture、3 rule、marker、baseline、malformed／missing、JSON／exit 境界の unit test を追加する。対応: Comprehensive test strategy。
- [x] Step 8: package script、lockfile、typecheck、lint、distribution drift、smoke／integration test を検証する。対応: frozen install と配布整合。

## 非適用項目

DB、HTTP、UI、常駐 service、credential、artifact upload、新規デプロイ資産は導入しない。CI workflow への接続は `repository-adoption` Unit が所有する。
