import { Web3ProviderEngine } from '@0x/subproviders'
import { BigNumber } from '@0x/utils'
import { TransactionReceipt, Web3Wrapper } from '@0x/web3-wrapper'
import { AbstractConnector } from '@web3-react/abstract-connector'
import { ConnectorEvent, ConnectorUpdate } from '@web3-react/types'
import { EventEmitter } from 'events'
import appConfig from '../config/appConfig'
import { Asset } from '../domain/Asset'
import { AssetsDictionary } from '../domain/AssetsDictionary'
import { BecomeRepresentativeRequest } from '../domain/BecomeRepresentativeRequest'
import { ClaimReabteRewardsRequest } from '../domain/ClaimReabteRewardsRequest'
import { ClaimRequest } from '../domain/ClaimRequest'
import { ConvertRequest } from '../domain/ConvertRequest'
import { IWeb3ProviderSettings } from '../domain/IWeb3ProviderSettings'
import { ProviderType } from '../domain/ProviderType'
import { ProviderTypeDictionary } from '../domain/ProviderTypeDictionary'
import { RequestTask } from '../domain/RequestTask'
import { StakingRequest } from '../domain/StakingRequest'
import { Web3ConnectionFactory } from '../domain/Web3ConnectionFactory'
import { ContractsSource } from './ContractsSource'
import { ProviderChangedEvent } from './events/ProviderChangedEvent'
import { StakingProviderEvents } from './events/StakingProviderEvents'

export class StakingProvider extends EventEmitter {
  public static Instance: StakingProvider

  public readonly gasLimit = '500000'

  // gasBufferCoeff equal 110% gas reserve
  public readonly gasBufferCoeff = new BigNumber('1.03')
  // 5000ms
  public readonly successDisplayTimeout = 5000
  public providerType: ProviderType = ProviderType.None
  public providerEngine: Web3ProviderEngine | null = null
  public web3Wrapper: Web3Wrapper | null = null
  public web3ProviderSettings: IWeb3ProviderSettings
  public contractsSource: ContractsSource | null = null
  public accounts: string[] = []
  public isLoading: boolean = false
  public unsupportedNetwork: boolean = false
  private requestTask: RequestTask | undefined

  public readonly UNLIMITED_ALLOWANCE_IN_BASE_UNITS = new BigNumber(2).pow(256).minus(1)

  constructor() {
    super()
    // init
    this.setMaxListeners(1000)

    // TasksQueue.Instance.on(TasksQueueEvents.Enqueued, this.onTaskEnqueued);

    const storedProvider: any = this.getLocalstorageItem('providerType')
    const providerType: ProviderType | null = (storedProvider as ProviderType) || null

    this.web3ProviderSettings = this.getWeb3ProviderSettings(appConfig.appNetworkId)
    if (!providerType || providerType === ProviderType.None) {
      this.web3ProviderSettings = this.getWeb3ProviderSettings(appConfig.appNetworkId)
      Web3ConnectionFactory.setReadonlyProvider()
        .then(() => {
          const web3Wrapper = Web3ConnectionFactory.currentWeb3Wrapper
          const engine = Web3ConnectionFactory.currentWeb3Engine
          const canWrite = Web3ConnectionFactory.canWrite

          if (web3Wrapper && this.web3ProviderSettings) {
            const contractsSource = new ContractsSource(
              engine,
              this.web3ProviderSettings.networkId,
              canWrite
            )
            contractsSource
              .Init()
              .then(() => {
                this.web3Wrapper = web3Wrapper
                this.providerEngine = engine
                this.contractsSource = contractsSource
                this.emit(StakingProviderEvents.ProviderAvailable)
              })
              .catch((err) => {
                // TODO: actually handle error
                console.error(err)
              })
          }
        })
        .catch((err) => {
          // TODO: actually handle error
          console.error(err)
        })
    }
  }

  public getLocalstorageItem(item: string): string {
    let response = ''
    response = localStorage.getItem(item) || ''
    return response
  }

  public setLocalstorageItem(item: string, val: string) {
    localStorage.setItem(item, val)
  }

  public setWeb3Provider = async (connector: AbstractConnector, account?: string) => {
    if (this.isLoading) {
      return
    }
    this.unsupportedNetwork = false
    this.isLoading = true
    this.emit(StakingProviderEvents.ProviderIsChanging)
    await Web3ConnectionFactory.setWalletProvider(connector, account)
    const providerType = await ProviderTypeDictionary.getProviderTypeByConnector(connector)
    await this.setWeb3ProviderFinalize(providerType)
    this.isLoading = false
    this.emit(
      StakingProviderEvents.ProviderChanged,
      new ProviderChangedEvent(this.providerType, this.web3Wrapper)
    )
  }

  public getLibrary = async (provider: any, connector: any): Promise<Web3ProviderEngine> => {
    // handle connectors events (i.e. network changed)
    await this.setWeb3Provider(connector)
    if (!connector.listeners(ConnectorEvent.Update).includes(this.onConnectorUpdated)) {
      connector.on(ConnectorEvent.Update, this.onConnectorUpdated)
    }
    return Web3ConnectionFactory.currentWeb3Engine
  }

  public onConnectorUpdated = async (update: ConnectorUpdate) => {
    this.emit(StakingProviderEvents.ProviderIsChanging)
    await Web3ConnectionFactory.updateConnector(update)
    await this.setWeb3ProviderFinalize(this.providerType)
    this.emit(
      StakingProviderEvents.ProviderChanged,
      new ProviderChangedEvent(this.providerType, this.web3Wrapper)
    )
  }

  public async setReadonlyWeb3Provider() {
    await Web3ConnectionFactory.setReadonlyProvider()
    await this.setWeb3ProviderFinalize(ProviderType.None)
    this.isLoading = false
  }

  public async setWeb3ProviderFinalize(providerType: ProviderType) {
    // : Promise<boolean> {
    this.web3Wrapper = Web3ConnectionFactory.currentWeb3Wrapper
    this.providerEngine = Web3ConnectionFactory.currentWeb3Engine
    let canWrite = Web3ConnectionFactory.canWrite
    const networkId = Web3ConnectionFactory.networkId
    this.accounts = Web3ConnectionFactory.userAccount ? [Web3ConnectionFactory.userAccount] : []

    if (this.web3Wrapper && networkId !== appConfig.appNetworkId) {
      // TODO: inform the user they are on the wrong network. Make it provider specific (MetaMask, etc)
      this.unsupportedNetwork = true
      canWrite = false // revert back to read-only
    }

    if (this.web3Wrapper && canWrite) {
      const web3EngineAccounts = await this.web3Wrapper.getAvailableAddressesAsync()
      if (web3EngineAccounts.length > 0 && this.accounts.length === 0) {
        this.accounts = web3EngineAccounts
      }
      if (this.accounts.length === 0) {
        canWrite = false // revert back to read-only
      }
    }

    if (this.web3Wrapper && this.web3ProviderSettings.networkId > 0) {
      const newContractsSource = new ContractsSource(
        this.providerEngine,
        this.web3ProviderSettings.networkId,
        canWrite
      )
      await newContractsSource.Init()
      this.contractsSource = newContractsSource
    } else {
      this.contractsSource = null
    }

    this.providerType = canWrite ? providerType : ProviderType.None

    this.setLocalstorageItem('providerType', this.providerType)
  }

  public deactivate = async () => {
    this.isLoading = true
    this.emit(StakingProviderEvents.ProviderIsChanging)
    await this.setReadonlyWeb3Provider()
    this.isLoading = false
    this.emit(
      StakingProviderEvents.ProviderChanged,
      new ProviderChangedEvent(this.providerType, this.web3Wrapper)
    )
  }

  public getUserBalances = async (networkName?: string) => {
    if ([ProviderType.None, ProviderType.Alchemy].includes(this.providerType)) {
      return {
        bzrxV1Balance: new BigNumber(0),
        bzrxBalance: new BigNumber(0),
        vBzrxBalance: new BigNumber(0),
        bptBalance: new BigNumber(0),
        bzrxStakingBalance: new BigNumber(0),
        vBzrxStakingBalance: new BigNumber(0),
        bptStakingBalance: new BigNumber(0)
      }
    }
    const otherDivider = networkName === 'kovan' ? 10 ** 6 : 10 ** 18
    const [
      bzrxV1Balance,
      bzrxBalance,
      vBzrxBalance,
      bptBalance,
      bzrxStakingBalance,
      vBzrxStakingBalance,
      bptStakingBalance
    ] = await Promise.all([
      this.getAssetTokenBalanceOfUser(Asset.BZRXv1),
      this.stakeableByAsset(Asset.BZRX),
      this.stakeableByAsset(Asset.vBZRX),
      this.stakeableByAsset(Asset.BPT),
      this.balanceOfByAsset(Asset.BZRX),
      this.balanceOfByAsset(Asset.vBZRX),
      this.balanceOfByAsset(Asset.BPT)
    ])
    return {
      bzrxV1Balance: bzrxV1Balance.div(10 ** 18),
      bzrxBalance: bzrxBalance.div(10 ** 18),
      vBzrxBalance: vBzrxBalance.div(10 ** 18),
      bptBalance: bptBalance.div(otherDivider),
      bzrxStakingBalance: bzrxStakingBalance.div(10 ** 18),
      vBzrxStakingBalance: vBzrxStakingBalance.div(10 ** 18),
      bptStakingBalance: bptStakingBalance.div(otherDivider)
    }
  }

  public getWeb3ProviderSettings(networkId: number | null): IWeb3ProviderSettings {
    let networkName
    let etherscanURL

    switch (networkId) {
      case 1:
        networkName = 'mainnet'
        etherscanURL = 'https://etherscan.io/'
        break
      case 3:
        networkName = 'ropsten'
        etherscanURL = 'https://ropsten.etherscan.io/'
        break
      case 4:
        networkName = 'rinkeby'
        etherscanURL = 'https://rinkeby.etherscan.io/'
        break
      case 42:
        networkName = 'kovan'
        etherscanURL = 'https://kovan.etherscan.io/'
        break
      default:
        networkId = 0
        networkName = 'local'
        etherscanURL = ''
        break
    }
    return {
      networkId,
      networkName,
      etherscanURL
    }
  }

  public getErc20AddressOfAsset(asset: Asset): string | null {
    let result: string | null = null

    const assetDetails = AssetsDictionary.assets.get(asset)
    if (this.web3ProviderSettings && assetDetails) {
      result = assetDetails.addressErc20.get(this.web3ProviderSettings.networkId) || ''
    }
    return result
  }

  public async getAssetTokenBalanceOfUser(asset: Asset): Promise<BigNumber> {
    let result: BigNumber = new BigNumber(0)
    if (asset === Asset.UNKNOWN) {
      // always 0
      result = new BigNumber(0)
    } else {
      // get erc20 token balance
      const precision = AssetsDictionary.assets.get(asset)!.decimals || 18
      const assetErc20Address = this.getErc20AddressOfAsset(asset)
      if (assetErc20Address) {
        result = await this.getErc20BalanceOfUser(assetErc20Address)
        result = result.multipliedBy(10 ** (18 - precision))
      }
    }

    return result
  }

  private async getErc20BalanceOfUser(addressErc20: string, account?: string): Promise<BigNumber> {
    let result = new BigNumber(0)

    if (this.web3Wrapper && this.contractsSource) {
      if (!account && this.contractsSource.canWrite) {
        account =
          this.accounts.length > 0 && this.accounts[0] ? this.accounts[0].toLowerCase() : undefined
      }

      if (account) {
        const tokenContract = await this.contractsSource.getErc20Contract(addressErc20)
        if (tokenContract) {
          result = await tokenContract.balanceOf.callAsync(account)
        }
      }
    }

    return result
  }

  public gasPrice = async (): Promise<BigNumber> => {
    let result = new BigNumber(500).multipliedBy(10 ** 9) // upper limit 120 gwei
    const lowerLimit = new BigNumber(3).multipliedBy(10 ** 9) // lower limit 3 gwei

    const url = `https://ethgasstation.info/json/ethgasAPI.json`
    try {
      const response = await fetch(url)
      const jsonData = await response.json()
      // console.log(jsonData);
      if (jsonData.average) {
        // ethgasstation values need divide by 10 to get gwei
        const gasPriceAvg = new BigNumber(jsonData.average).multipliedBy(10 ** 8)
        const gasPriceSafeLow = new BigNumber(jsonData.safeLow).multipliedBy(10 ** 8)
        if (gasPriceAvg.lt(result)) {
          result = gasPriceAvg
        } else if (gasPriceSafeLow.lt(result)) {
          result = gasPriceSafeLow
        }
      }
    } catch (error) {
      // console.log(error);
      result = new BigNumber(60).multipliedBy(10 ** 9) // error default 60 gwei
    }

    if (result.lt(lowerLimit)) {
      result = lowerLimit
    }

    return result
  }

  public getLargeApprovalAmount = (
    asset: Asset,
    neededAmount: BigNumber = new BigNumber(0)
  ): BigNumber => {
    let amount = new BigNumber(0)

    switch (asset) {
      case Asset.BZRX:
      case Asset.BZRXv1:
      case Asset.BPT:
        return new BigNumber(10 ** 18).multipliedBy(25000000)
      case Asset.ETH:
      case Asset.WETH:
        amount = new BigNumber(10 ** 18).multipliedBy(1500)
        break
      case Asset.WBTC:
        amount = new BigNumber(10 ** 8).multipliedBy(25)
        break
      case Asset.LINK:
        amount = new BigNumber(10 ** 18).multipliedBy(60000)
        break
      case Asset.ZRX:
        amount = new BigNumber(10 ** 18).multipliedBy(750000)
        break
      case Asset.KNC:
        amount = new BigNumber(10 ** 18).multipliedBy(550000)
        break
      case Asset.DAI:
      case Asset.SUSD:
        amount = new BigNumber(10 ** 18).multipliedBy(375000)
        break
      case Asset.USDC:
      case Asset.USDT:
        amount = new BigNumber(10 ** 6).multipliedBy(375000)
        break
      case Asset.REP:
        amount = new BigNumber(10 ** 18).multipliedBy(15000)
        break
      case Asset.MKR:
        amount = new BigNumber(10 ** 18).multipliedBy(1250)
        break
      default:
        break
    }

    if (amount.eq(0)) {
      throw new Error('Invalid approval asset!')
    }

    return amount.gt(neededAmount) ? amount : neededAmount
  }

  // public async stake(bzrxAmount: BigNumber, vbzrxAmount: BigNumber, bptAmount: BigNumber, address: string) {
  //   let receipt = null;

  //   const account = this.accounts.length > 0 && this.accounts[0] ? this.accounts[0].toLowerCase() : null;
  //   if (!this.contractsSource) return receipt;

  //   const bzrxStakigContract = await this.contractsSource.getBZRXStakingInterimContract();
  //   if (!account || !bzrxStakigContract) return receipt;

  //   const bzrxErc20Address = this.getErc20AddressOfAsset(Asset.BZRX);
  //   const vbzrxErc20Address = this.getErc20AddressOfAsset(Asset.vBZRX);
  //   const bptErc20Address = this.getErc20AddressOfAsset(Asset.BPT);
  //   if (!bzrxErc20Address || !vbzrxErc20Address || !bptErc20Address) return receipt;

  //   // const bzrxTokenErc20Contract = await this.contractsSource.getErc20Contract(bzrxErc20Address);
  //   // const bzrxallowance = await bzrxTokenErc20Contract.allowance.callAsync(account, bzrxStakigContract.address);
  //   // if (bzrxAmount.gt(bzrxallowance)) {
  //   //   const approveHash = await bzrxTokenErc20Contract!.approve.sendTransactionAsync(bzrxStakigContract.address, bzrxAmount, { from: account });
  //   //   await this.waitForTransactionMined(approveHash);
  //   // }
  //   // const vbzrxTokenErc20Contract = await this.contractsSource.getErc20Contract(vbzrxErc20Address);
  //   // const vbzrxallowance = await bzrxTokenErc20Contract.allowance.callAsync(account, bzrxStakigContract.address);
  //   // if (vbzrxAmount.gt(vbzrxallowance)) {
  //   //   const approveHash = await vbzrxTokenErc20Contract!.approve.sendTransactionAsync(bzrxStakigContract.address, vbzrxAmount, { from: account });
  //   //   await this.waitForTransactionMined(approveHash);
  //   // }
  //   // const bptTokenErc20Contract = await this.contractsSource.getErc20Contract(bptErc20Address);
  //   // const bptallowance = await bzrxTokenErc20Contract.allowance.callAsync(account, bzrxStakigContract.address);
  //   // if (bptAmount.gt(bptallowance)) {
  //   //   const approveHash = await bptTokenErc20Contract!.approve.sendTransactionAsync(bzrxStakigContract.address, bptAmount, { from: account });
  //   //   await this.waitForTransactionMined(approveHash);
  //   // }

  //   const encoded_input = account.toLowerCase() === address.toLowerCase() ?
  //     bzrxStakigContract.stake.getABIEncodedTransactionData(
  //       [bzrxErc20Address, vbzrxErc20Address, bptErc20Address],
  //       [bzrxAmount, vbzrxAmount, bptAmount]
  //     ) :
  //     bzrxStakigContract.stakeWithDelegate.getABIEncodedTransactionData(
  //       [bzrxErc20Address, vbzrxErc20Address, bptErc20Address],
  //       [bzrxAmount, vbzrxAmount, bptAmount],
  //       address
  //     );
  //   console.log(encoded_input);

  //   let gasAmountBN;
  //   let gasAmount;
  //   try {
  //     gasAmount = account.toLowerCase() === address.toLowerCase()
  //       ? await bzrxStakigContract.stake.estimateGasAsync(
  //         [bzrxErc20Address, vbzrxErc20Address, bptErc20Address],
  //         [bzrxAmount, vbzrxAmount, bptAmount],
  //         {
  //           from: account,
  //           gas: this.gasLimit,
  //         })
  //       : await bzrxStakigContract.stakeWithDelegate.estimateGasAsync(
  //         [bzrxErc20Address, vbzrxErc20Address, bptErc20Address],
  //         [bzrxAmount, vbzrxAmount, bptAmount],
  //         address,
  //         {
  //           from: account,
  //           gas: this.gasLimit,
  //         })
  //     gasAmountBN = new BigNumber(gasAmount).multipliedBy(this.gasBufferCoeff).integerValue(BigNumber.ROUND_UP);

  //   }
  //   catch (e) {
  //     console.error(e);
  //   }

  //   const txHash = account.toLowerCase() === address.toLowerCase()
  //     ? await bzrxStakigContract.stake.sendTransactionAsync(
  //       [bzrxErc20Address, vbzrxErc20Address, bptErc20Address],
  //       [bzrxAmount, vbzrxAmount, bptAmount],
  //       {
  //         from: account,
  //         gas: gasAmountBN ? gasAmountBN.toString() : this.gasLimit,
  //         gasPrice: await this.gasPrice()
  //       })
  //     : await bzrxStakigContract.stakeWithDelegate.sendTransactionAsync(
  //       [bzrxErc20Address, vbzrxErc20Address, bptErc20Address],
  //       [bzrxAmount, vbzrxAmount, bptAmount],
  //       address,
  //       {
  //         from: account,
  //         gas: gasAmountBN ? gasAmountBN.toString() : this.gasLimit,
  //         gasPrice: await this.gasPrice()
  //       })

  //   const txReceipt = await this.waitForTransactionMined(txHash);
  //   return txReceipt.status === 1 ? txReceipt : null;
  // }

  // public async convertBzrxV1ToV2(tokenAmount: BigNumber) {
  //   let receipt = null;

  //   const account = this.accounts.length > 0 && this.accounts[0] ? this.accounts[0].toLowerCase() : null;
  //   if (!this.contractsSource) return receipt;

  //   const convertContract = await this.contractsSource.getConvertContract();
  //   if (!account || !convertContract) return receipt;

  //   const assetErc20Address = this.getErc20AddressOfAsset(Asset.BZRXv1);
  //   if (!assetErc20Address) return receipt;
  //   const tokenErc20Contract = await this.contractsSource.getErc20Contract(assetErc20Address);

  //   // Detecting token allowance
  //   const erc20allowance = await tokenErc20Contract.allowance.callAsync(account, convertContract.address);

  //   if (tokenAmount.gt(erc20allowance)) {
  //     const approveHash = await tokenErc20Contract!.approve.sendTransactionAsync(convertContract.address, tokenAmount, { from: account });
  //     await this.waitForTransactionMined(approveHash);
  //   }

  //   let gasAmountBN;
  //   let gasAmount;
  //   try {
  //     gasAmount = await convertContract.convert.estimateGasAsync(
  //       tokenAmount,
  //       {
  //         from: account,
  //         gas: this.gasLimit,
  //       });
  //     gasAmountBN = new BigNumber(gasAmount).multipliedBy(this.gasBufferCoeff).integerValue(BigNumber.ROUND_UP);

  //   }
  //   catch (e) {
  //     console.error(e);
  //   }

  //   const txHash = await convertContract.convert.sendTransactionAsync(
  //     tokenAmount,
  //     {
  //       from: account,
  //       gas: gasAmountBN ? gasAmountBN.toString() : this.gasLimit,
  //       gasPrice: await this.gasPrice()
  //     });

  //   const txReceipt = await this.waitForTransactionMined(txHash);
  //   return txReceipt.status === 1 ? txReceipt : null;
  // }

  public canOptin = async (): Promise<boolean> => {
    let result: boolean = false
    const account =
      this.accounts.length > 0 && this.accounts[0] ? this.accounts[0].toLowerCase() : null
    if (!this.contractsSource) return result

    const traderCompensationContract = await this.contractsSource.getTraderCompensationContract()
    if (!account || !traderCompensationContract) return result
    try {
      const canOptin = await traderCompensationContract.canOptin.callAsync(account)
      if (canOptin) {
        result = canOptin
      }
    } catch (e) {
      console.error(e)
    }
    return result
  }

  public isClaimable = async (): Promise<BigNumber> => {
    let result: BigNumber = new BigNumber(0)
    const account =
      this.accounts.length > 0 && this.accounts[0] ? this.accounts[0].toLowerCase() : null
    if (!this.contractsSource) return result

    const traderCompensationContract = await this.contractsSource.getTraderCompensationContract()
    if (!account || !traderCompensationContract) return result
    try {
      const canOptin = await traderCompensationContract.claimable.callAsync(account)
      if (canOptin.gt(0)) {
        result = canOptin
      }
    } catch (e) {
      console.error(e)
    }
    return result
  }

  public doOptin = async () => {
    const account =
      this.accounts.length > 0 && this.accounts[0] ? this.accounts[0].toLowerCase() : null
    if (!this.contractsSource) {
      return null
    }

    const traderCompensationContract = await this.contractsSource.getTraderCompensationContract()
    if (!account || !traderCompensationContract) {
      return null
    }

    let gasAmountBN
    let gasAmount
    try {
      gasAmount = await traderCompensationContract.optin.estimateGasAsync({
        from: account,
        gas: this.gasLimit
      })
      gasAmountBN = new BigNumber(gasAmount)
        .multipliedBy(this.gasBufferCoeff)
        .integerValue(BigNumber.ROUND_UP)
    } catch (e) {
      console.error(e)
    }

    const txHash = await traderCompensationContract.optin.sendTransactionAsync({
      from: account,
      gas: gasAmountBN ? gasAmountBN.toString() : this.gasLimit,
      gasPrice: await this.gasPrice()
    })

    const txReceipt = await this.waitForTransactionMined(txHash)
    return txReceipt.status === 1 ? txReceipt : null
  }

  // public doClaim = async () => {
  //   let receipt = null;

  //   const account = this.accounts.length > 0 && this.accounts[0] ? this.accounts[0].toLowerCase() : null;
  //   if (!this.contractsSource || !this.contractsSource.canWrite) return receipt;

  //   const traderCompensationContract = await this.contractsSource.getTraderCompensationContract();
  //   if (!account || !traderCompensationContract) return receipt;

  //   let gasAmountBN;
  //   let gasAmount;
  //   try {
  //     gasAmount = await traderCompensationContract.claim.estimateGasAsync(
  //       {
  //         from: account,
  //         gas: this.gasLimit,
  //       });
  //     gasAmountBN = new BigNumber(gasAmount).multipliedBy(this.gasBufferCoeff).integerValue(BigNumber.ROUND_UP);

  //   }
  //   catch (e) {
  //     console.error(e);
  //   }

  //   const txHash = await traderCompensationContract.claim.sendTransactionAsync(
  //     {
  //       from: account,
  //       gas: gasAmountBN ? gasAmountBN.toString() : this.gasLimit,
  //       gasPrice: await this.gasPrice()
  //     });

  //   const txReceipt = await this.waitForTransactionMined(txHash);
  //   return txReceipt.status === 1 ? txReceipt : null;
  // }

  // public doBecomeRepresentative = async () => {
  //   let receipt = null;

  //   const account = this.accounts.length > 0 && this.accounts[0] ? this.accounts[0].toLowerCase() : null;
  //   if (!this.contractsSource || !this.contractsSource.canWrite) return receipt;

  //   const bzrxStakingContract = await this.contractsSource.getBZRXStakingInterimContract();
  //   if (!account || !bzrxStakingContract) return receipt;

  //   let gasAmountBN;
  //   let gasAmount;
  //   try {
  //     gasAmount = await bzrxStakingContract.setRepActive.estimateGasAsync(
  //       true,
  //       {
  //         from: account,
  //         gas: this.gasLimit,
  //       });
  //     gasAmountBN = new BigNumber(gasAmount).multipliedBy(this.gasBufferCoeff).integerValue(BigNumber.ROUND_UP);

  //   }
  //   catch (e) {
  //     console.error(e);
  //   }

  //   const txHash = await bzrxStakingContract.setRepActive.sendTransactionAsync(
  //     true,
  //     {
  //       from: account,
  //       gas: gasAmountBN ? gasAmountBN.toString() : this.gasLimit,
  //       gasPrice: await this.gasPrice()
  //     });

  //   const txReceipt = await this.waitForTransactionMined(txHash);
  //   return txReceipt.status === 1 ? txReceipt : null;
  // }

  public getRepresentatives = async (): Promise<
    Array<{ wallet: string; BZRX: BigNumber; vBZRX: BigNumber; LPToken: BigNumber }>
  > => {
    let result: Array<{
      wallet: string
      BZRX: BigNumber
      vBZRX: BigNumber
      LPToken: BigNumber
    }> = []

    const account =
      this.accounts.length > 0 && this.accounts[0] ? this.accounts[0].toLowerCase() : null
    if (!this.contractsSource) return result

    const bzrxStakingContract = await this.contractsSource.getBZRXStakingInterimContract()
    if (!account || !bzrxStakingContract) return result

    const repVotes = await bzrxStakingContract.getRepVotes.callAsync(
      new BigNumber(0),
      new BigNumber(1000),
      {
        from: account
      }
    )

    result = result.concat(repVotes)
    return result
  }

  public checkIsRep = async (): Promise<boolean> => {
    let result = false

    const account =
      this.accounts.length > 0 && this.accounts[0] ? this.accounts[0].toLowerCase() : null
    if (!this.contractsSource) return result

    const bzrxStakingContract = await this.contractsSource.getBZRXStakingInterimContract()
    if (!account || !bzrxStakingContract) return result

    result = await bzrxStakingContract.reps.callAsync(account, {
      from: account
    })

    return result
  }

  public stakeableByAsset = async (asset: Asset): Promise<BigNumber> => {
    let result = new BigNumber(0)

    if (!this.contractsSource) {
      return result
    }

    const account =
      this.accounts.length > 0 && this.accounts[0] ? this.accounts[0].toLowerCase() : null

    if (!account) {
      return result
    }

    const bZxContract = await this.contractsSource.getBZRXStakingInterimContract()

    if (!bZxContract) {
      return result
    }

    const tokenErc20Address = this.getErc20AddressOfAsset(asset)

    if (!tokenErc20Address) {
      return result
    }

    const stakeable = await bZxContract.stakeableByAsset.callAsync(tokenErc20Address, account, {
      from: account
    })

    result = stakeable
    return result
  }

  public balanceOfByAsset = async (asset: Asset): Promise<BigNumber> => {
    let result = new BigNumber(0)

    const account =
      this.accounts.length > 0 && this.accounts[0] ? this.accounts[0].toLowerCase() : null
    if (!this.contractsSource) return result

    const bzrxStakingContract = await this.contractsSource.getBZRXStakingInterimContract()
    if (!account || !bzrxStakingContract) return result

    const tokenErc20Address = this.getErc20AddressOfAsset(asset)
    if (!tokenErc20Address) return result
    const balanceOf = await bzrxStakingContract.balanceOfByAsset.callAsync(
      tokenErc20Address,
      account,
      {
        from: account
      }
    )

    result = balanceOf
    return result
  }

  public balanceOfByAssetWalletAware = async (asset: Asset): Promise<BigNumber> => {
    let result = new BigNumber(0)

    const account =
      this.accounts.length > 0 && this.accounts[0] ? this.accounts[0].toLowerCase() : null
    if (!this.contractsSource) return result

    const bzrxStakingContract = await this.contractsSource.getBZRXStakingInterimContract()
    if (!account || !bzrxStakingContract) return result

    const tokenErc20Address = this.getErc20AddressOfAsset(asset)
    if (!tokenErc20Address) return result
    const balanceOf = await bzrxStakingContract.balanceOfByAssetWalletAware.callAsync(
      tokenErc20Address,
      account,
      {
        from: account
      }
    )

    result = balanceOf
    return result
  }

  public getUserEarnings = async (): Promise<BigNumber> => {
    const result = new BigNumber(0)

    const account =
      this.accounts.length > 0 && this.accounts[0] ? this.accounts[0].toLowerCase() : null
    if (!this.contractsSource) return result

    const bzrxStakingContract = await this.contractsSource.getBZRXStakingInterimContract()
    if (!account || !bzrxStakingContract) return result

    const earnedUsdAmount = await bzrxStakingContract.earned.callAsync(account, {
      from: account
    })

    return earnedUsdAmount.div(10 ** 18)
  }

  public getDelegateAddress = async (): Promise<string> => {
    let result = ''

    const account =
      this.accounts.length > 0 && this.accounts[0] ? this.accounts[0].toLowerCase() : null
    if (!this.contractsSource) return result

    const bzrxStakingContract = await this.contractsSource.getBZRXStakingInterimContract()
    if (!account || !bzrxStakingContract) return result

    result = await bzrxStakingContract.delegate.callAsync(account, {
      from: account
    })

    return result
  }

  public getRebateRewards = async (): Promise<BigNumber> => {
    let result = new BigNumber(0)

    const account =
      this.accounts.length > 0 && this.accounts[0] ? this.accounts[0].toLowerCase() : null
    if (!this.contractsSource) return result

    const bZxContract = await this.contractsSource.getiBZxContract()
    if (!account || !bZxContract) return result

    result = await bZxContract.rewardsBalanceOf.callAsync(account, {
      from: account
    })

    return result
  }

  // public doClaimReabteRewards = async () => {
  //   let receipt = null;

  //   const account = this.accounts.length > 0 && this.accounts[0] ? this.accounts[0].toLowerCase() : null;
  //   if (!this.contractsSource || !this.contractsSource.canWrite) return receipt;

  //   const bZxContract = await this.contractsSource.getiBZxContract();
  //   if (!account || !bZxContract) return receipt;

  //   let gasAmountBN;
  //   let gasAmount;
  //   try {
  //     gasAmount = await bZxContract.claimRewards.estimateGasAsync(
  //       account,
  //       {
  //         from: account,
  //         gas: this.gasLimit,
  //       });
  //     gasAmountBN = new BigNumber(gasAmount).multipliedBy(this.gasBufferCoeff).integerValue(BigNumber.ROUND_UP);

  //   }
  //   catch (e) {
  //     console.error(e);
  //   }

  //   const txHash = await bZxContract.claimRewards.sendTransactionAsync(
  //     account,
  //     {
  //       from: account,
  //       gas: this.gasLimit,
  //       gasPrice: await this.gasPrice()
  //     });

  //   const txReceipt = await this.waitForTransactionMined(txHash);
  //   return txReceipt.status === 1 ? txReceipt : null;
  // }

  public async getSwapToUsdRate(asset: Asset): Promise<BigNumber> {
    if (
      asset === Asset.DAI ||
      asset === Asset.USDC ||
      asset === Asset.SUSD ||
      asset === Asset.USDT
    ) {
      return new BigNumber(1)
    }

    /*const swapRates = await this.getSwapToUsdRateBatch(
      [asset],
      Asset.DAI
    );

    return swapRates[0][0];*/
    return this.getSwapRate(asset, appConfig.isMainnetProd ? Asset.DAI : Asset.USDC)
  }

  public async getSwapRate(
    srcAsset: Asset,
    destAsset: Asset,
    srcAmount?: BigNumber
  ): Promise<BigNumber> {
    if (
      srcAsset === destAsset ||
      (srcAsset === Asset.USDC && destAsset === Asset.DAI) ||
      (srcAsset === Asset.DAI && destAsset === Asset.USDC)
    ) {
      return new BigNumber(1)
    }
    // console.log("srcAmount 11 = "+srcAmount)
    let result: BigNumber = new BigNumber(0)
    const srcAssetErc20Address = this.getErc20AddressOfAsset(srcAsset)
    const destAssetErc20Address = this.getErc20AddressOfAsset(destAsset)
    if (!srcAmount) {
      srcAmount = this.UNLIMITED_ALLOWANCE_IN_BASE_UNITS
    } else {
      srcAmount = new BigNumber(srcAmount.toFixed(1, 1))
    }

    if (this.contractsSource && srcAssetErc20Address && destAssetErc20Address) {
      const oracleContract = await this.contractsSource.getOracleContract()

      const srcAssetDecimals = AssetsDictionary.assets.get(srcAsset)!.decimals || 18
      const srcAssetPrecision = new BigNumber(10 ** (18 - srcAssetDecimals))
      const destAssetDecimals = AssetsDictionary.assets.get(destAsset)!.decimals || 18
      const destAssetPrecision = new BigNumber(10 ** (18 - destAssetDecimals))

      try {
        const swapPriceData: BigNumber[] = await oracleContract.queryRate.callAsync(
          srcAssetErc20Address,
          destAssetErc20Address
        )
        // console.log("swapPriceData- ",swapPriceData[0])
        result = swapPriceData[0]
          .times(srcAssetPrecision)
          .div(destAssetPrecision)
          .dividedBy(10 ** 18)
          .multipliedBy(swapPriceData[1].dividedBy(10 ** 18)) // swapPriceData[0].dividedBy(10 ** 18);
      } catch (e) {
        console.log(e)
        result = new BigNumber(0)
      }
    }
    return result
  }

  private waitForTransactionMinedRecursive = async (
    txHash: string,
    web3Wrapper: Web3Wrapper
  ): Promise<TransactionReceipt> => {
    const receipt = await web3Wrapper.getTransactionReceiptIfExistsAsync(txHash)
    if (receipt) {
      return receipt
    } else {
      await this.sleep(5000)
      return this.waitForTransactionMinedRecursive(txHash, web3Wrapper)
    }
  }

  public waitForTransactionMined = async (txHash: string) => {
    if (!this.web3Wrapper) {
      throw new Error('web3 is not available')
    }
    return this.waitForTransactionMinedRecursive(txHash, this.web3Wrapper)
  }

  public onRequestConfirmed = async (
    request: StakingRequest | ConvertRequest | ClaimRequest | BecomeRepresentativeRequest
  ) => {
    return this.processRequestTask(new RequestTask(request))
  }

  public processRequestTask = async (task: RequestTask) => {
    try {
      this.requestTask = task
      task.setEventEmitter(this)
      this.emit(StakingProviderEvents.AskToOpenProgressDlg, task)
      if (!(this.web3Wrapper && this.contractsSource && this.contractsSource.canWrite)) {
        throw new Error('No provider available!')
      }

      const account =
        this.accounts.length > 0 && this.accounts[0] ? this.accounts[0].toLowerCase() : null
      if (!account) {
        throw new Error('Unable to get wallet address!')
      }

      const taskRequest = task.request

      if (taskRequest instanceof ConvertRequest) {
        task.processingStart([
          'Initializing',
          'Detecting token allowance',
          'Prompting token allowance',
          'Waiting for token allowance',
          'Submitting ' + taskRequest.name,
          'Updating the blockchain',
          'Transaction completed'
        ])
      } else {
        task.processingStart([
          'Initializing',
          'Submitting ' + taskRequest.name,
          'Updating the blockchain',
          'Transaction completed'
        ])
      }
      let txHash
      switch (taskRequest.constructor) {
        case StakingRequest:
          txHash = await this.processStakingRequestTask(task, account)
          break
        case ConvertRequest:
          txHash = await this.processConvertRequestTask(task, account)
          break
        case ClaimRequest:
          txHash = await this.processClaimRequestTask(task, account)
          break
        case ClaimReabteRewardsRequest:
          txHash = await this.processClaimReabteRewardsRequestTask(task, account)
          break
        case BecomeRepresentativeRequest:
          txHash = await this.processBecomeRepresentativeRequestTask(task, account)
          break
        default:
          throw new Error('Unknown request!')
      }

      task.processingStepNext()
      const txReceipt = await this.waitForTransactionMined(txHash)
      if (!txReceipt.status) {
        throw new Error('Reverted by EVM')
      }

      task.processingStepNext()
      await this.sleep(this.successDisplayTimeout)
      task.processingEnd(true, false, null)
    } catch (err) {
      if (
        !err.message.includes(`Request for method "eth_estimateGas" not handled by any subprovider`)
      ) {
        console.log(err)
      }
      task.processingEnd(false, false, err)
    } finally {
      this.emit(StakingProviderEvents.AskToCloseProgressDlg, task)
    }
    return false
  }

  private processStakingRequestTask = async (task: RequestTask, account: string) => {
    const taskRequest = task.request as StakingRequest
    const { bzrxAmount, vbzrxAmount, bptAmount, address } = taskRequest

    const bzrxStakingContract = await this.contractsSource!.getBZRXStakingInterimContract()
    if (!bzrxStakingContract) {
      throw new Error('No ERC20 contract available!')
    }

    const bzrxErc20Address = this.getErc20AddressOfAsset(Asset.BZRX)
    const vbzrxErc20Address = this.getErc20AddressOfAsset(Asset.vBZRX)
    const bptErc20Address = this.getErc20AddressOfAsset(Asset.BPT)
    if (!bzrxErc20Address || !vbzrxErc20Address || !bptErc20Address) {
      throw new Error('No ERC20 contract available!')
    }

    const encodedInput =
      account.toLowerCase() === address.toLowerCase()
        ? bzrxStakingContract.stake.getABIEncodedTransactionData(
            [bzrxErc20Address, vbzrxErc20Address, bptErc20Address],
            [bzrxAmount, vbzrxAmount, bptAmount]
          )
        : bzrxStakingContract.stakeWithDelegate.getABIEncodedTransactionData(
            [bzrxErc20Address, vbzrxErc20Address, bptErc20Address],
            [bzrxAmount, vbzrxAmount, bptAmount],
            address
          )
    console.log(encodedInput)
    // Submitting loan
    task.processingStepNext()
    let gasAmountBN
    let gasAmount
    let txHash = ''
    try {
      gasAmount =
        account.toLowerCase() === address.toLowerCase()
          ? await bzrxStakingContract.stake.estimateGasAsync(
              [bzrxErc20Address, vbzrxErc20Address, bptErc20Address],
              [bzrxAmount, vbzrxAmount, bptAmount],
              {
                from: account,
                gas: this.gasLimit
              }
            )
          : await bzrxStakingContract.stakeWithDelegate.estimateGasAsync(
              [bzrxErc20Address, vbzrxErc20Address, bptErc20Address],
              [bzrxAmount, vbzrxAmount, bptAmount],
              address,
              {
                from: account,
                gas: this.gasLimit
              }
            )
      gasAmountBN = new BigNumber(gasAmount)
        .multipliedBy(this.gasBufferCoeff)
        .integerValue(BigNumber.ROUND_UP)
    } catch (e) {
      console.error(e)
      throw e
    }

    try {
      txHash =
        account.toLowerCase() === address.toLowerCase()
          ? await bzrxStakingContract.stake.sendTransactionAsync(
              [bzrxErc20Address, vbzrxErc20Address, bptErc20Address],
              [bzrxAmount, vbzrxAmount, bptAmount],
              {
                from: account,
                gas: gasAmountBN ? gasAmountBN.toString() : this.gasLimit,
                gasPrice: await this.gasPrice()
              }
            )
          : await bzrxStakingContract.stakeWithDelegate.sendTransactionAsync(
              [bzrxErc20Address, vbzrxErc20Address, bptErc20Address],
              [bzrxAmount, vbzrxAmount, bptAmount],
              address,
              {
                from: account,
                gas: gasAmountBN ? gasAmountBN.toString() : this.gasLimit,
                gasPrice: await this.gasPrice()
              }
            )

      task.setTxHash(txHash)
    } catch (e) {
      console.log(e)
      throw e
    }
    return txHash
  }

  private processConvertRequestTask = async (task: RequestTask, account: string) => {
    const tokenAmount = (task.request as ConvertRequest).tokenAmount

    const convertContract = await this.contractsSource!.getConvertContract()
    if (!convertContract) throw new Error('No ERC20 contract available!')

    const assetErc20Address = this.getErc20AddressOfAsset(Asset.BZRXv1)
    if (!assetErc20Address) throw new Error('No ERC20 contract available!')

    const tokenErc20Contract = await this.contractsSource!.getErc20Contract(assetErc20Address)
    // Detecting token allowance
    task.processingStepNext()
    const erc20allowance = await tokenErc20Contract.allowance.callAsync(
      account,
      convertContract.address
    )
    // Prompting token allowance
    task.processingStepNext()
    // Waiting for token allowance
    task.processingStepNext()
    if (tokenAmount.gt(erc20allowance)) {
      const approveHash = await tokenErc20Contract.approve.sendTransactionAsync(
        convertContract.address,
        tokenAmount,
        { from: account }
      )
      await this.waitForTransactionMined(approveHash)
    }
    // Submitting loan
    task.processingStepNext()

    let gasAmountBN
    let gasAmount
    let txHash = ''
    try {
      gasAmount = await convertContract.convert.estimateGasAsync(tokenAmount, {
        from: account,
        gas: this.gasLimit
      })
      gasAmountBN = new BigNumber(gasAmount)
        .multipliedBy(this.gasBufferCoeff)
        .integerValue(BigNumber.ROUND_UP)
    } catch (e) {
      console.error(e)
      throw e
    }

    try {
      txHash = await convertContract.convert.sendTransactionAsync(tokenAmount, {
        from: account,
        gas: gasAmountBN ? gasAmountBN.toString() : this.gasLimit,
        gasPrice: await this.gasPrice()
      })
      task.setTxHash(txHash)
    } catch (e) {
      console.log(e)
      throw e
    }
    return txHash
  }

  private processClaimRequestTask = async (task: RequestTask, account: string) => {
    const traderCompensationContract = await this.contractsSource!.getTraderCompensationContract()
    if (!traderCompensationContract) throw new Error('No ERC20 contract available!')
    // Submitting loan
    task.processingStepNext()
    let gasAmountBN
    let gasAmount
    let txHash = ''
    try {
      gasAmount = await traderCompensationContract.claim.estimateGasAsync({
        from: account,
        gas: this.gasLimit
      })
      gasAmountBN = new BigNumber(gasAmount)
        .multipliedBy(this.gasBufferCoeff)
        .integerValue(BigNumber.ROUND_UP)
    } catch (e) {
      console.error(e)
      throw e
    }

    try {
      txHash = await traderCompensationContract.claim.sendTransactionAsync({
        from: account,
        gas: gasAmountBN ? gasAmountBN.toString() : this.gasLimit,
        gasPrice: await this.gasPrice()
      })

      task.setTxHash(txHash)
    } catch (e) {
      console.error(e)
      throw e
    }
    return txHash
  }

  private processClaimReabteRewardsRequestTask = async (task: RequestTask, account: string) => {
    const bZxContract = await this.contractsSource!.getiBZxContract()
    if (!bZxContract) throw new Error('No ERC20 contract available!')
    // Submitting loan
    task.processingStepNext()
    let gasAmountBN
    let gasAmount
    let txHash = ''
    try {
      gasAmount = await bZxContract.claimRewards.estimateGasAsync(account, {
        from: account,
        gas: this.gasLimit
      })
      gasAmountBN = new BigNumber(gasAmount)
        .multipliedBy(this.gasBufferCoeff)
        .integerValue(BigNumber.ROUND_UP)
    } catch (e) {
      console.error(e)
      throw e
    }

    try {
      txHash = await bZxContract.claimRewards.sendTransactionAsync(account, {
        from: account,
        gas: gasAmountBN ? gasAmountBN.toString() : this.gasLimit,
        gasPrice: await this.gasPrice()
      })

      task.setTxHash(txHash)
    } catch (e) {
      console.error(e)
      throw e
    }
    return txHash
  }

  private processBecomeRepresentativeRequestTask = async (task: RequestTask, account: string) => {
    const bzrxStakingContract = await this.contractsSource!.getBZRXStakingInterimContract()
    if (!bzrxStakingContract) throw new Error('No ERC20 contract available!')
    // Submitting loan
    task.processingStepNext()
    let gasAmountBN
    let gasAmount
    let txHash = ''
    try {
      gasAmount = await bzrxStakingContract.setRepActive.estimateGasAsync(true, {
        from: account,
        gas: this.gasLimit
      })
      gasAmountBN = new BigNumber(gasAmount)
        .multipliedBy(this.gasBufferCoeff)
        .integerValue(BigNumber.ROUND_UP)
    } catch (e) {
      console.error(e)
      throw e
    }

    try {
      txHash = await bzrxStakingContract.setRepActive.sendTransactionAsync(true, {
        from: account,
        gas: gasAmountBN ? gasAmountBN.toString() : this.gasLimit,
        gasPrice: await this.gasPrice()
      })

      task.setTxHash(txHash)
    } catch (e) {
      console.error(e)
      throw e
    }
    return txHash
  }

  public sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  public getRequestTask() {
    return this.requestTask
  }
}

export default new StakingProvider()
