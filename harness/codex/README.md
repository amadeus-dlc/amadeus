# harness/codex — Codex ハーネス差分層

この文書は、Amadeus の Codex ハーネス差分層の契約と、Phase 1 時点の役割を定義する。

## ハーネス契約

- Codex は skill を `<project>/.agents/skills/` で発見する（上流 awslabs/aidlc-workflows の harness/codex/emit.ts 冒頭コメントに準拠）。
- 各 skill の `agents/openai.yaml` は Codex 向けの guard であり、`policy: allow_implicit_invocation: false` により skill の暗黙起動を禁止する。skill の起動は明示的な入口（`/amadeus` など）に限られる。
- openai.yaml の正準は `harness/codex/skills/amadeus-*/agents/openai.yaml` に置き、`dev-scripts/promote-skill.ts` の昇格で `.agents/skills/` へ反映する（promote は skill ディレクトリを丸ごと置換するため、実行時側だけに置いたファイルは昇格で消える。Issue #552 の設計確定 Q6 = B）。

## Phase 1 時点の役割（本ディレクトリ）

本ディレクトリは現時点では**契約と provenance の置き場**である。差分層のソース実体（openai.yaml の生成元）はまだここに置かない。

- [README.md](README.md)（本文書）: ハーネス契約と役割宣言。
- [provenance.md](provenance.md): 上流取り込みの記録（基準 commit、写像表、適応規則、再取り込み手順、照合結果）。

## Phase 2 での正準化予定

core / harness / dist 三層化の Phase 2（Issue #552 の後続 Intent）で、差分層ソースの正準がここ（harness/codex/）へ移り、`dev-scripts/build.ts`（promote-skill の一般化）が core + harness から実行時ツリーを生成する。その時点で source skills 側の openai.yaml は生成物になり、「生成物の再生成を CI で検証」（設計確定 Q4）に接続される。この予定を変更する場合は本文書を先に更新する。

## 言語の再判定条件

本ディレクトリの文書は現時点では repo 内の契約・記録であり日本語で書く（skill-language-policy と docs/amadeus 言語方針の対象外）。Phase 2 で本ディレクトリが dist 生成の source 層になった時点で、配布・上流交換の観点から言語を再判定する。

## 旧名表記について

provenance の上流 path 表記に現れる aidlc- prefix は上流リポジトリの実名であり、rename（#526）の対象外である（rename-leftovers の allow 規則 = aidlc-workflows / awslabs/aidlc に該当）。
