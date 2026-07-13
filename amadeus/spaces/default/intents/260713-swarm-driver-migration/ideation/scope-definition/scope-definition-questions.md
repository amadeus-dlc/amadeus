# スコープ定義の質問

- **モード:** Grill me
- **深度:** Standard

## Q1. driver selector の適用境界

Intent Statement と実現可能性評価が対象としている価値は、複数 Unit を実装・収束させる Construction の swarm 実行である。Amadeus には Reverse Engineering や Practices Discovery など、ライフサイクル上の別目的で subagent を使うステージもある。これらまで同じ selector で制御すると、stage topology、persona、監査、承認手順の契約変更が追加で必要になる。

`AMADEUS_SWARM_DRIVER` は、どの実行範囲を制御しますか？

1. **Construction の multi-Unit swarm だけ（推奨）** — `invoke-swarm` で許可された Unit batch の fan-out と収束だけを対象にし、通常の stage subagent や対話 conductor は変更しない
2. **全ライフサイクルの subagent 実行** — Reverse Engineering などを含む全 subagent stage に同じ driver selector を適用する
3. **全 agent 実行** — subagent stage に加え、対話 conductor や支援 agent の起動方式も制御する
4. **その他** — 自由記述

**回答:** 1

## Q2. 0.2.0 削除作業の Intent 境界

現在の公開タグは 0.1.x であり、Feasibility では「0.1.x で旧変数を警告付き受理し、0.2.0 で削除」と決定した。互換ブリッジと完全削除を同じリリース成果物へ同時に実装することはできない。今回の Intent では移行可能な0.1.x契約を完成させ、0.2.0の削除は追跡可能な後続項目として切り出すと、各時点の挙動とテストを一意に保てる。

0.2.0 での `AMADEUS_USE_SWARM` 完全削除を、今回の Intent でどこまで扱いますか？

1. **0.1.x 移行ブリッジまで実装（推奨）** — 今回は新 selector、警告付き旧互換、移行文書を出荷し、0.2.0 の削除実装は明確な受入条件を持つ後続 Issue として起票する
2. **今回を 0.2.0 対象に変更** — 旧互換を実装せず、この Intent 内で旧変数を完全削除する
3. **両方を同じ変更に含める** — version 条件で0.1.x互換と0.2.0削除を切り替える仕組みまで実装する
4. **その他** — 自由記述

**回答:** 1

## Q3. バックログの優先順位

最大の不確実性は、Agent Teams の非対話 Team 起動と Codex Ultra の実委譲を機械判定できる証跡である。この証跡が得られない場合、明示 driver を成功扱いできず、共通 selector を先に作っても契約を作り直す可能性がある。小さな live probe で実行面を先に確定してから本体へ進むほうが、手戻りを早期に限定できる。

proto-Unit / backlog は、どの優先基準で並べますか？

1. **リスク優先（推奨）** — Agent Teams と Codex Ultra の証跡・起動境界を最初に実証し、その後に共通 selector、各 driver、互換移行、配布・文書を進める
2. **共通基盤優先** — selector、能力モデル、監査契約を先に完成させ、その後に各 driver を接続する
3. **利用価値優先** — Claude と Codex の代表経路を先に end-to-end 化し、共通化と Kiro / 移行対応を後にする
4. **その他** — 自由記述

**回答:** 1

## Q4. driver 拡張性の今回スコープ

確定済みの5値は、現在検証できるローカルハーネス能力へ閉じた契約である。Responses API Multi-agent、任意の third-party driver、driver plugin SDK まで同時に含めると、credential 管理、外部 API version、拡張 ABI、互換性保証という別の問題が増える。現在の driver 選択を深く完成させ、拡張機構は実需要が出た時点で別 Intent にするのが最小である。

今回の driver registry は、どこまで拡張可能にしますか？

1. **既知の5値に閉じる（推奨）** — `auto` と4つのハーネス修飾 driver だけを提供し、Responses API、custom driver、plugin SDK、driver UI / cost optimizer は対象外にする
2. **内部 extension seam まで含める** — 公開値は5つのままだが、将来の custom driver を差し込める抽象契約も今回設計する
3. **外部 driver まで含める** — Responses API Multi-agent と custom driver API も第一級スコープへ追加する
4. **その他** — 自由記述

**回答:** 1

## Q5. live 収束検証の提供形態

4 driver の live 証明には、認証済み CLI、provider network、token 消費が必要である。これを通常の GitHub Actions 必須 job にすると、複数 provider の secret 管理と外部障害による不安定性が本 Intent に追加される。一方、一度限りの手作業では次回の CLI 更新で再検証できない。非機密 fixture と再実行可能な opt-in suite をリポジトリへ置き、通常 CI は決定的テストだけを必須にする境界が再現性と運用コストの釣り合いを取れる。

live 収束検証を、どの形で今回スコープへ含めますか？

1. **再実行可能な opt-in live suite（推奨）** — 非機密の2 Unit以上の fixture と4 driverの実行・証跡検査をリポジトリへ追加する。認証済み環境で Intent 完了前に実行するが、新しい credentialed CI job は作らない
2. **GitHub Actions の必須 matrix** — Claude、Codex、Kiro の credential を CI に持たせ、全 PR で live suite を必須実行する
3. **一度限りの手動検証** — 今回の実行証跡だけを保存し、再利用可能な suite / fixture は追加しない
4. **その他** — 自由記述

**回答:** 1

## Q6. proto-Unit の分割軸

driver selector、subprocess 起動、監査、互換処理、配布物を技術レイヤーごとに切ると、途中 Unit 単独では利用者価値を検証しにくい。ハーネス別の実行経路を、選択から収束・監査まで end-to-end に通す縦切りなら、各 Unit の完了時点で「要求 driver が本当に使えた」を独立に検証できる。共通契約は最初の縦切りで最小実装し、後続 driver から深める。

後続の Units Generation で、どの分割原則を優先しますか？

1. **検証可能な縦切り（推奨）** — native 証跡のrisk gateを置いた後、共通契約の最小 skeleton とハーネス別 end-to-end driver、移行・配布・live証明を、単独で完了判定できる複数 Unit にする
2. **技術レイヤー別** — selector、process launcher、監査、互換処理、文書・テストを別 Unit にする
3. **単一 Unit** — driver migration 全体を1つの大きな Unit として Construction する
4. **その他** — 自由記述

**回答:** 1

## Q7. スコープ決定の最終確認

ここまでの回答を、次のスコープ契約として解釈する。

1. `AMADEUS_SWARM_DRIVER` は Construction で engine が許可した multi-Unit `invoke-swarm` 経路だけを制御し、通常の stage subagent と対話 conductor は変更しない。
2. 今回の Intent は0.1.xの移行ブリッジまでを実装する。0.2.0での `AMADEUS_USE_SWARM` 完全削除は、受入条件付きの後続 Issue として起票する。
3. backlog はリスク優先とし、Agent Teams と Codex Ultra の native 実起動・委譲証跡を最初に実証する。
4. driver registry は `auto` と4つのハーネス修飾 driver に閉じる。Responses API、custom driver、plugin SDK、driver UI、cost optimizer は対象外とする。
5. 非機密 fixture を使う再実行可能な opt-in live suite をリポジトリへ追加し、Intent 完了前に4 driverを検証する。新しい credentialed CI job は作らない。
6. 後続の Units Generation は、共通契約の最小 skeleton とハーネス別 end-to-end driver、移行・配布・live 証明を、単独で完了判定できる縦切り Unit として分解する。

この解釈で scope document と intent backlog を確定してよいですか？

1. **この内容で確定（推奨）** — 成果物を作成して承認ゲートへ進む
2. **一部を修正** — 修正する項目番号と内容を指定する
3. **グリルを継続** — 未決事項について追加質問を続ける
4. **その他** — 自由記述

**回答:** 1
