const { ethers, deployments } = require("hardhat");

async function main() {
  const [player] = await ethers.getSigners();
  const p = await player.getAddress();
  const s1 = await ethers.getContractAt("Season1NFTFlags", (await deployments.get("Season1NFTFlags")).address);
  const s2 = await ethers.getContractAt("Season2NFTFlags", (await deployments.get("Season2NFTFlags")).address);
  const s1addr = await s1.getAddress();
  const s2addr = await s2.getAddress();
  const out = [];
  for (let i = 1; i <= 12; i++) {
    try { out.push(`S1#${i}=${await s1.hasMinted(p, i)}`); } catch { out.push(`S1#${i}=?`); }
  }
  for (let i = 1; i <= 12; i++) {
    try { out.push(`S2#${i}=${await s2.hasMinted(p, i)}`); } catch { out.push(`S2#${i}=?`); }
  }
  console.log("s1", s1addr, "s2", s2addr);
  console.log(out.join(" "));
}
main().then(() => process.exit(0)).catch(e => { console.log("FATAL", e.message); process.exit(1); });
