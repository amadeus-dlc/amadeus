# Pi Coding Agent 上の AI-DLC

> 言語: [English](pi.md) | **日本語**

Amadeus は、macOS と Linux 上の **Pi Coding Agent 0.83.0 以降**に対応します。
Pi 配布物は Pi ネイティブの project skill と extension の読み込みを使い、
workflow engine、state machine、audit log、swarm referee は共通の Amadeus core を
そのまま使います。

Pi の project trust は実行許可の判断であって、sandbox ではありません。trust された
Pi Package や extension は、Pi を起動したユーザーと同じ権限で任意の code を実行でき、
そのユーザーの file、process、network、利用可能な credential にアクセスできます。
trust を許可する前に source と生成済み resource catalog を確認してください。
Amadeus が trust を自動承認したり、Pi の trust store を編集したりすることはありません。

## 前提条件

- macOS または Linux。native Windows は formal-success の対象外です。
- [Pi Coding Agent](https://github.com/earendil-works/pi)、package
  `@earendil-works/pi-coding-agent` 0.83.0 以降。
  `0.82.x` 以前は未対応です。
- 非対話 shell の `PATH` から Bun を実行できること。
- Pi に provider と credential が設定済みであること。Amadeus は provider credential を
  配布、複製、設定しません。
- Amadeus の source と生成済み Pi resource を確認できる Git project。

install 前に runtime version を確認します。

```bash
pi --version
bun --version
```

## setup CLI による完全な project install

通常はこちらを使います。完全な `dist/pi` candidate、つまり `.pi/`、project の
`AGENTS.md`、`amadeus/` workspace shell を install します。また、Pi doctor が使う
installer receipt も記録します。

```bash
bunx @amadeus-dlc/setup install \
  --harness pi \
  --target /absolute/path/to/project \
  --yes
cd /absolute/path/to/project
pi
```

`--yes` は setup を非対話にするだけで、Pi project trust を承認しません。Pi の trust
prompt では project-local な `.pi` resource を確認し、自分で判断してください。
以前に拒否した場合や適用可能な保存済み判断がない場合は、Pi の `/trust` command で
内容を確認して判断します。setup も doctor も `trust.json` を変更しません。

trust を許可したら candidate を検証します。

```text
/skill:amadeus --doctor
```

同等の read-only shell check は次のとおりです。

```bash
bun .pi/tools/amadeus-utility.ts doctor
```

doctor は対応 OS、Bun、Pi version floor、適用可能な native trust 判断、manifest から
生成された catalog と installer receipt、catalog に記録された skill、extension、
internal driver resource を検査します。resource の欠落、余分な追加、変更、symlink、
通常 file 以外、hash 不一致は fail-closed です。表示された remediation に従い、
一部 file だけを直して残りの candidate まで検証済みとみなさないでください。

## Native Pi Package activation: local source と Git source

repository root の `package.json` には、manifest から生成される `pi` entry があります。
これは Pi の [package mechanism](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md)
を通じて、Pi-native な Amadeus extension と orchestrator skill を公開します。

candidate を確認した後、次のどちらかで project-local に activation します。

```bash
# Local source: full commit identity の clean repository を使う。
pi install -l /absolute/path/to/amadeus

# Git source: credential を含まない canonical HTTPS と 40 桁の full commit SHA を使う。
pi install -l https://github.com/amadeus-dlc/amadeus.git@<full-commit-sha>
```

local candidate を形式的に識別できるのは、worktree が clean で、
`git rev-parse HEAD` が full commit SHA を返す場合だけです。branch name、short SHA、
floating tag、credential を含む URL、変更中の worktree は、Amadeus の formal source
identity になりません。

Pi Package activation は**完全な project install の代替ではありません**。package
metadata が activation するのは宣言された native skill と extension だけです。
Amadeus には、同じ candidate から作られた project-local な `.pi/tools`、internal
driver、生成済み catalog、`AGENTS.md`、`amadeus/` workspace shell、installer receipt
も必要です。package だけの project や revision を混在させた project を healthy と
報告してはならず、doctor も失敗します。

## workflow の開始と再開

trust 済みかつ検証済みの project で実行します。

```text
/skill:amadeus 作りたいものを説明する
/skill:amadeus --status
/skill:amadeus --resume
```

Pi では gate を番号付き prose で表示します。Pi の通常の対話入力から、求められた番号
または text を返してください。native Pi `input` event の source が厳密に
`interactive` の場合だけ human turn が成立します。RPC input、extension が生成した
input、tool output、custom message では question への回答や gate の承認はできません。
停止した gate を state や audit file の編集で迂回しないでください。

Pi に built-in subagent primitive はありません。Construction では、Amadeus が同梱する
internal Pi RPC driver を使います。driver failure、lifecycle registration drift、対応しない
tool lifecycle、曖昧な continuation は進行を block し、manual-success への無言の fallback
はありません。

## update

setup 管理下の project では active な Pi session を停止してから実行します。

```bash
bunx @amadeus-dlc/setup upgrade \
  --harness pi \
  --target /absolute/path/to/project \
  --yes
```

setup upgrade は transactional で、installer manifest の分類に従って user-owned file を
保持します。update 後は doctor を再実行し、trust 判断も確認してください。

project-local な Pi Package registration では、`pi update --extensions` が pin されて
いない package を更新します。Amadeus の Git candidate は pin を維持してください。
新しい確認済み commit へ移る場合は `pi install -l <url>@<new-full-sha>` を明示的に実行し、
完全な project distribution も同じ candidate へ upgrade します。新しい package entry と
古い project-local runtime file を混在させないでください。

## uninstall

`@amadeus-dlc/setup` には現在 uninstall subcommand がありません。`amadeus/` を recursive
に削除しないでください。ここには version-controlled な intent record、audit shard、
team memory、knowledge が含まれます。これらの record を保持したうえで、VCS と
`amadeus/.installer/amadeus-setup-manifest.json` を根拠に、確認済みの installer-owned path
だけを削除してください。shared file と user-owned file は project owner が明示的に
決めない限り残します。

project-local な Pi Package registration は同じ source specifier で削除します。

```bash
pi remove -l /absolute/path/to/amadeus
pi remove -l https://github.com/amadeus-dlc/amadeus.git@<full-commit-sha>
```

`pi uninstall` は `pi remove` の alias です。package registration を削除しても、setup が
install した project file や Amadeus workspace は削除されません。

## unsupported と fail-closed 条件

- `0.82.x` を含む 0.83.0 未満の Pi。
- formal-success platform としての native Windows。
- Pi project trust を隔離機構として扱うこと、自動承認すること、ユーザーに代わって
  trust store を変更すること。
- package だけの activation、混在した catalog、変更済み resource を完全で healthy な
  install とみなすこと。
- provider credential を distribution、source URL、installer metadata、log、文書例へ
  含めること。
- 現在の環境で実際には実行していない live provider journey を pass と主張すること。

failure の調査は `/skill:amadeus --doctor` から始めます。catalog または receipt が不正なら、
変更された extension や driver を読み込まず、確認済みの immutable source から再 install
してください。
