# NFR Design Questions: solo-gate-transaction

## 入力と回答方針

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を入力とし、ユーザーの包括指示により推奨案を採用した。

## Q1. Protocol boundary

- A. grant-backed branchだけをexact typed parserへ通し、human/team branchを変更しない（推奨）
- B. 全report wireを新protocolへ移行する
- X. その他

[Answer]: A（E-1466-ND-U2-Q1、ユーザーの包括指示により採用）

## Q2. Human fallback target

- A. opaque intent UUID＋session reservationでtargetだけ保持し、認可はfresh HUMAN_TURNに限定する（推奨）
- B. active cursorを書き換える
- X. その他

[Answer]: A（E-1466-ND-U2-Q2、ユーザーの包括指示により採用）

## Q3. Reservation recovery

- A. Presence Reservation Id付きHUMAN_TURNでarmed→mintedをexactly-once回復する（推奨）
- B. marker update failure時は重複mintを許す
- X. その他

[Answer]: A（E-1466-ND-U2-Q3、ユーザーの包括指示により採用）

## Q4. Lock scope

- A. full grant pairだけworkspace→owner lock、targeted humanはowner lock、通常pathは既存のまま（推奨）
- B. 全approvalをworkspace lockで直列化する
- X. その他

[Answer]: A（E-1466-ND-U2-Q4、ユーザーの包括指示により採用）

## 曖昧性分析

- reservationはgitignored runtime correlationでありstanding grantの正本ではない。
- target UUIDは認可証拠ではなくmutation targetである。
- strict parserはstderrの内容を読まず、byte presenceだけをprotocol条件にする。
