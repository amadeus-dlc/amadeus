# Security Design — u4-hook-dispatcher

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 入力・実行境界

- slugは静的allowlistとの完全一致だけを受理し、path結合用の任意文字列として扱わない
- project rootは`CLAUDE_PROJECT_DIR`をparseし、未設定時だけdispatcher自身の`import.meta.dir`からrepository rootを導出する。process cwdはpath基準に使わない
- child pathは検証済みproject root + 表の固定relative pathから取得し、realpathがroot外なら拒否する
- Bun spawnはargv配列で行いshellを介さず、`env: process.env`、stdin/stdout/stderr継承を明示する
- 未知slugは既知一覧をstderrへ出してexit 1。実体不在だけをbuild前の既知状態としてexit 0にする

hook payloadは保存・解釈・ログ出力せず、実体へbyte透過する。credentialを新規保持しない。

## 投影完全性

実行時の dispatcher は**当該 slug 単体**の実在判定のみを行う(FD BR-U4-1/U4-2 — 不在 = 案内+exit 0。旧記述の『全不在/部分欠落』cross-slug 判定は FD 逸脱のため撤回し、同バンドル performance-design の『file existence check 1回・directory scan なし』と統一)。partial build / 破損の検出は build 後検証とテスト時 smoke(10 slug 全起動)の責務とし、build 完了 marker は新設しない。
