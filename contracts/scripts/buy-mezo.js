// Buys MEZO with MUSD in the Mezo Pools MEZO/MUSD pool and sends some to the e2e wallet.
// MUSD_IN=5 E2E_MEZO=3 npx hardhat run scripts/buy-mezo.js --network mezotestnet
const { ethers } = require("hardhat");
const { T, ERC20 } = require("./mezo");

async function main() {
  const [me] = await ethers.getSigners();
  const musdIn = ethers.parseEther(process.env.MUSD_IN || "5");
  const pool = new ethers.Contract(T.MezoMusdPool, ["function getAmountOut(uint256,address) view returns (uint256)", "function swap(uint256,uint256,address,bytes)"], me);
  const out = await pool.getAmountOut(musdIn, T.MUSD);
  // basic Mezo pools are pay-first: send MUSD in, then take MEZO (token1) out
  await (await new ethers.Contract(T.MUSD, ERC20, me).transfer(T.MezoMusdPool, musdIn)).wait();
  await (await pool.swap(0, out, me.address, "0x")).wait();
  console.log("bought", ethers.formatEther(out), "MEZO for", ethers.formatEther(musdIn), "MUSD");

  const to = process.env.E2E_ADDRESS;
  const give = ethers.parseEther(process.env.E2E_MEZO || "3");
  if (to && give > 0n) {
    await (await new ethers.Contract(T.MEZO, ERC20, me).transfer(to, give)).wait();
    console.log("sent", ethers.formatEther(give), "MEZO to", to);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
