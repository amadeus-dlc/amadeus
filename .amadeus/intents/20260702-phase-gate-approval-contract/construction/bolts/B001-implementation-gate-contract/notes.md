# B001 実行メモ

## 実行方針

実装ゲートの両側（implementation-execution の前提と bolt-preparation の停止行動）を同じ Bolt で変更し、`ready_for_approval` で停止したまま前へ進めない中間状態を作らない。

文言は Functional Design の BR001 と BR002 に合わせ、agent-instruction-rules の方針に従って肯定形の行動を先に書く。

## 対象タスク

- T001: implementation-execution の前提を人間承認済みだけに変更する。
- T002: bolt-preparation に停止と承認待ちの行動を明記する。
- T003: 両 skill の昇格先を promote で同期する。

## 作業順序

1. T001 で implementation-execution の前提を変更する。
2. T002 で bolt-preparation の手順を変更し、T001 と表現を揃える。
3. T003 で promote 同期と確認を行う。

## 実装判断

- implementation-execution の前提は、`passed` で進む、`ready_for_approval` で停止して承認待ちを報告、それ以外は停止して bolt-preparation を案内、の 3 分岐を肯定形で書いた（T001）。
- bolt-preparation は、目的文に「停止して人間の承認を待つ」を明記し、手順 12（停止）と手順 13（承認後の passed 化と approval evidence 追加）を分けた（T002）。
- promote は implementation-execution と bolt-preparation の両方を `--replace` で同期し、`npm run test:it:promote-skill` の pass を確認した（T003）。`.claude/skills` は `.agents/skills` への symlink であり追加同期は不要である。

## 未確認事項

- 変更 PR の説明は、レビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）に従う。
