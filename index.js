const {ethers, utils} = require('ethers')

const config = require('./config')
const privateKey = require('./privateKey.js')

const abi = require('./DxLockWhitelisted4Rep.abi')

const provider = ethers.getDefaultProvider("homestead")
const wallet = new ethers.Wallet(privateKey,provider)

const signersContracts = config.contracts.map((addr)=>(new ethers.Contract(addr,abi,provider)).connect(wallet))

listenForBenficiaries()

async function listenForBenficiaries(){
  let totalReleasedTxSent = 0;
  let lockersToRelease = []
  signersContracts.forEach((contract,contractIndex)=>{
    contract.on("Lock",async (_locker,_lockingId,_amount,_period,event)=>{
      let lockedBalance = (await contract.lockers(_locker,_lockingId))[0]
      if(lockedBalance.toString()!='0'){
        lockersToRelease.push({
          address:_locker,
          lockingId:_lockingId,
          contractIndex:contractIndex
        })
      }
    })
  })
  provider.resetEventsBlock(config.firstBlock)
  console.log("waiting ",config.fetchTime," ms")
  await timeout(parseInt(config.fetchTime)/4);
  console.log("25%")
  await timeout(parseInt(config.fetchTime)/4);
  console.log("50%")
  await timeout(parseInt(config.fetchTime)/4);
  console.log("75%")
  await timeout(parseInt(config.fetchTime)/4);
  console.log("100%")
  console.log("Unreleased Lockers Found: ",lockersToRelease.length)

  let nonce = await wallet.getTransactionCount()

  lockersToRelease.forEach((locker,index)=>{
    signersContracts[locker.contractIndex].release(locker.address,locker.lockingId,{
      gasLimit:100000,
      gasPrice: ethers.utils.parseUnits(config.gasPriceGwei,'gwei'),
      nonce:nonce+index
    }).then(()=>console.log("Sent Release TX for lockerId ",locker.lockingId))
  })
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
