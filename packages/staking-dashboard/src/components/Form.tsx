import { BigNumber } from '@0x/utils'
import React, { PureComponent } from 'react'
import Modal from 'react-modal'
import Representative1 from '../assets/images/representative1.png'
import Representative2 from '../assets/images/representative2.png'
import Representative3 from '../assets/images/representative3.png'
import { ReactComponent as BPTIcon } from '../assets/images/token-bpt.svg'
import { ReactComponent as BzrxIcon } from '../assets/images/token-bzrx.svg'
import { ReactComponent as VBzrxIcon } from '../assets/images/token-vbzrx.svg'
import appConfig from '../config/appConfig'
import { BecomeRepresentativeRequest } from '../domain/BecomeRepresentativeRequest'
import { ClaimReabteRewardsRequest } from '../domain/ClaimReabteRewardsRequest'
import { ClaimRequest } from '../domain/ClaimRequest'
import { ConvertRequest } from '../domain/ConvertRequest'
import { IRep } from '../domain/IRep'
import { RequestStatus } from '../domain/RequestStatus'
import { RequestTask } from '../domain/RequestTask'
import { StakingRequest } from '../domain/StakingRequest'
import stakingApi from '../lib/stakingApi'
import { StakingProviderEvents } from '../services/events/StakingProviderEvents'
import stakingProvider from '../services/StakingProvider'
import AddToBalance from './AddToBalance'
import AnimationTx from './AnimationTx'
import FindRepresentative from './FindRepresentative'
import FormAssetBalance from './FormAssetBalance'
import FormRewards from './FormRewards'
import TopRepList from './TopRepList'

interface IFormState {
  bzrxV1Balance: BigNumber
  bzrxBalance: BigNumber
  bptBalance: BigNumber
  vBzrxBalance: BigNumber
  bzrxStakingBalance: BigNumber
  bptStakingBalance: BigNumber
  vBzrxStakingBalance: BigNumber
  claimableAmount: BigNumber
  userEarnings: BigNumber
  canOptin: boolean
  isFindRepresentativeOpen: boolean
  selectedRepAddress: string
  topRepsList: IRep[]
  repsList: IRep[]
  isRepsLoaded: boolean
  delegateAddress: string
  rebateRewards: BigNumber
  isAnimationTx: boolean
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export default class Form extends PureComponent<{}, IFormState> {
  constructor(props: any) {
    super(props)
    this.state = {
      bzrxV1Balance: new BigNumber(0),
      bzrxBalance: new BigNumber(0),
      vBzrxBalance: new BigNumber(0),
      bptBalance: new BigNumber(0),
      bzrxStakingBalance: new BigNumber(0),
      vBzrxStakingBalance: new BigNumber(0),
      bptStakingBalance: new BigNumber(0),
      claimableAmount: new BigNumber(0),
      canOptin: false,
      isFindRepresentativeOpen: false,
      selectedRepAddress: '',
      topRepsList: [],
      repsList: [],
      isRepsLoaded: false,
      userEarnings: new BigNumber(0),
      rebateRewards: new BigNumber(0),
      delegateAddress: '',
      isAnimationTx: false
    }

    this._isMounted = false
  }

  private isAlreadyRepresentative: boolean = false

  private _isMounted: boolean

  /**
   * Utility to update local state easily taking async operations into account.
   * - checks if the component is still mounted before calling setState
   * - option to pass the state updates as an object or an async task
   * @param task new state updates OR async op that returns a promise with the state updates
   */
  private async updateLocalState<T>(task: (() => Promise<T>) | object) {
    if (!this._isMounted) {
      return
    }
    let stateUpdate: object
    if (typeof task === 'function') {
      stateUpdate = await task()
      if (!this._isMounted) {
        return
      }
    } else {
      stateUpdate = task
    }
    this.setState(stateUpdate)
    return stateUpdate
  }

  private async derivedUpdate() {
    this.isAlreadyRepresentative = await stakingProvider.checkIsRep()

    await this.updateLocalState(() => stakingProvider.getUserBalances(appConfig.appNetwork))

    await this.updateLocalState(async () => {
      const [userEarnings, rebateRewards] = await Promise.all([
        stakingProvider.getUserEarnings(),
        stakingProvider.getRebateRewards()
      ])
      return {
        userEarnings,
        rebateRewards: rebateRewards.div(10 ** 18)
      }
    })

    const repsList = ((await stakingProvider.getRepresentatives()) as IRep[]).map((rep, i) => {
      rep.index = i
      rep.imageSrc = i % 3 === 0 ? Representative1 : i % 2 === 0 ? Representative2 : Representative3
      rep.name = this.getShortHash(rep.wallet, 4)
      return rep
    })

    let topRepsList = repsList.sort((a, b) => b.BZRX.minus(a.BZRX).toNumber()).slice(0, 3)

    await this.updateLocalState({ repsList, topRepsList })

    topRepsList = await Promise.all(
      topRepsList.map((rep, index) => stakingApi.getRepInfo(rep, index))
    )

    await this.updateLocalState({ topRepsList })

    const delegateAddress = await stakingProvider.getDelegateAddress()
    const delegate = topRepsList.find(
      (e) => e.wallet.toLowerCase() === delegateAddress.toLowerCase()
    )
    if (delegate && !topRepsList.includes(delegate)) {
      topRepsList.push(delegate)
    }

    if (this._isMounted) {
      this.setState({ delegateAddress, selectedRepAddress: delegateAddress })
    }
  }

  private onProviderAvailable = async () => {
    await this.derivedUpdate()
  }

  private onProviderChanged = async () => {
    await this.derivedUpdate()
  }

  public componentDidMount(): void {
    this._isMounted = true
    stakingProvider.on(StakingProviderEvents.ProviderAvailable, this.onProviderAvailable)
    stakingProvider.on(StakingProviderEvents.ProviderChanged, this.onProviderChanged)
    stakingProvider.on(StakingProviderEvents.AskToOpenProgressDlg, this.onAskToOpenProgressDlg)
    stakingProvider.on(StakingProviderEvents.AskToCloseProgressDlg, this.onAskToCloseProgressDlg)
  }

  public componentWillUnmount(): void {
    this._isMounted = false
    stakingProvider.off(StakingProviderEvents.ProviderAvailable, this.onProviderAvailable)
    stakingProvider.off(StakingProviderEvents.ProviderChanged, this.onProviderChanged)
    stakingProvider.off(StakingProviderEvents.AskToOpenProgressDlg, this.onAskToOpenProgressDlg)
    stakingProvider.off(StakingProviderEvents.AskToCloseProgressDlg, this.onAskToCloseProgressDlg)
  }

  public onBzrxV1ToV2ConvertClick = () => {
    stakingProvider
      .onRequestConfirmed(new ConvertRequest(this.state.bzrxV1Balance.times(10 ** 18)))
      .catch((err) => {
        console.error(err)
      })
  }

  public onClaimClick = () => {
    stakingProvider.onRequestConfirmed(new ClaimRequest()).catch((err) => {
      console.error(err)
    })
  }

  public onClaimRebateRewardsClick = () => {
    stakingProvider.onRequestConfirmed(new ClaimReabteRewardsRequest()).catch((err) => {
      console.error(err)
    })
  }

  public onBecomeRepresentativeClick = () => {
    stakingProvider.onRequestConfirmed(new BecomeRepresentativeRequest()).catch((err) => {
      console.error(err)
    })
  }

  public onStakeClick = (bzrx: BigNumber, vbzrx: BigNumber, bpt: BigNumber) => {
    if (this.state.selectedRepAddress === '') {
      return
    }

    const bzrxAmount = bzrx.gt(this.state.bzrxBalance.times(10 ** 18))
      ? this.state.bzrxBalance.times(10 ** 18)
      : bzrx
    const vbzrxAmount = vbzrx.gt(this.state.vBzrxBalance.times(10 ** 18))
      ? this.state.vBzrxBalance.times(10 ** 18)
      : vbzrx
    let bptAmount
    if (appConfig.isKovan) {
      bptAmount = bpt.gt(this.state.bptBalance.times(10 ** 6))
        ? this.state.bptBalance.times(10 ** 6)
        : bpt
    } else {
      bptAmount = bpt.gt(this.state.bptBalance.times(10 ** 18))
        ? this.state.bptBalance.times(10 ** 18)
        : bpt
    }

    stakingProvider
      .onRequestConfirmed(
        new StakingRequest(bzrxAmount, vbzrxAmount, bptAmount, this.state.selectedRepAddress)
      )
      .catch((err) => {
        console.error(err)
      })
  }

  public setSelectedRepAddressClick = (e: React.MouseEvent<HTMLElement>) => {
    if (this.state.delegateAddress !== '' && this.state.delegateAddress !== ZERO_ADDRESS) return
    const liElement = e.currentTarget
    const address = liElement.dataset.address
    if (!address) return
    this.setState({ selectedRepAddress: address })
  }

  private getShortHash = (hash: string, count: number) => {
    return hash.substring(0, 6) + '...' + hash.substring(hash.length - count)
  }

  private openFindRepresentative = async () => {
    if (this._isMounted && !this.state.isFindRepresentativeOpen) {
      this.setState({ isFindRepresentativeOpen: true })
    }
    if (!this.state.isRepsLoaded) {
      const repsList = await stakingApi.getRepsInfo(this.state.repsList)
      this.setState({ repsList, isRepsLoaded: true })
    }
  }

  private onAddRep = (wallet: string) => {
    const isAlreadyTopRep = this.state.topRepsList.find(
      (item) => item.wallet.toLowerCase() === wallet.toLowerCase()
    )
    if (isAlreadyTopRep) return
    const topRepsList = this.state.topRepsList.concat(
      this.state.repsList.find((item) => item.wallet === wallet)!
    )

    this._isMounted && this.setState({ topRepsList, isFindRepresentativeOpen: false })
  }

  private onRequestClose = () => {
    if (this._isMounted) {
      this.setState({ isFindRepresentativeOpen: false })
    }
  }

  private onAskToOpenProgressDlg = () => {
    this.setState({ isAnimationTx: true })
  }

  private onAskToCloseProgressDlg = async (task: RequestTask) => {
    if (
      task.status === RequestStatus.FAILED ||
      task.status === RequestStatus.FAILED_SKIPGAS ||
      task.status === RequestStatus.DONE
    ) {
      if (task.status === RequestStatus.DONE) await this.derivedUpdate()
      window.setTimeout(() => {
        this.setState({ isAnimationTx: false })
      }, 5000)
      return
    }

    this.setState({ isAnimationTx: false })
  }

  public render() {
    const etherscanURL = stakingProvider.web3ProviderSettings
      ? stakingProvider.web3ProviderSettings.etherscanURL
      : ''

    return (
      <React.Fragment>
        <Modal
          isOpen={this.state.isFindRepresentativeOpen}
          onRequestClose={this.onRequestClose}
          className="modal-content-div"
          overlayClassName="modal-overlay-div"
          ariaHideApp={false}>
          <FindRepresentative
            onFindRepresentativeClose={this.onRequestClose}
            onAddRepresentative={this.onAddRep}
            repsList={this.state.repsList}
          />
        </Modal>
        <div className="container">
          <div className="calculator">
            {this.state.isAnimationTx ? (
              <AnimationTx />
            ) : (
              <React.Fragment>
                <div className="calculator-row balance">
                  <div className="balance-wrapper">
                    <div className="balance-item">
                      <div className="row-header">Wallet Balance:</div>
                      <FormAssetBalance
                        link={`${etherscanURL}token/${
                          this.state.bzrxV1Balance.gt(0)
                            ? '0x1c74cFF0376FB4031Cd7492cD6dB2D66c3f2c6B9'
                            : '0x56d811088235F11C8920698a204A5010a788f4b3'
                        }`}
                        tokenLogo={<BzrxIcon />}
                        balance={this.state.bzrxBalance}
                        name="BZRX"/>

                      <FormAssetBalance
                        link={`${etherscanURL}token/0xB72B31907C1C95F3650b64b2469e08EdACeE5e8F`}
                        tokenLogo={<VBzrxIcon />}
                        balance={this.state.vBzrxBalance}
                        name="vBZRX"/>

                      <FormAssetBalance
                        link={`${etherscanURL}token/0xe26A220a341EAca116bDa64cF9D5638A935ae629`}
                        tokenLogo={<BPTIcon />}
                        balance={this.state.bptBalance}
                        name="vBZRX"/>
                    </div>
                    <div className="balance-item">
                      <div className="row-header">Staking Balance:</div>

                      <FormAssetBalance
                        link={`${etherscanURL}token/0x56d811088235F11C8920698a204A5010a788f4b3`}
                        tokenLogo={<BzrxIcon />}
                        balance={this.state.bzrxStakingBalance}
                        name="BZRX"/>

                      <FormAssetBalance
                        link={`${etherscanURL}token/0xB72B31907C1C95F3650b64b2469e08EdACeE5e8F`}
                        tokenLogo={<VBzrxIcon />}
                        balance={this.state.vBzrxStakingBalance}
                        name="vBZRX"/>

                      <FormAssetBalance
                        link={`${etherscanURL}token/0xe26A220a341EAca116bDa64cF9D5638A935ae629`}
                        tokenLogo={<BPTIcon />}
                        balance={this.state.bptStakingBalance}
                        name="BPT"/>
                    </div>
                    <p className="notice">
                      The staking dashboard in its current form tracks BZRX in your wallet or
                      deployed in the protocol. If it is transferred elsewhere your staked balance
                      may drop.
                    </p>
                  </div>
                </div>

                <FormRewards
                  rebateRewards={this.state.rebateRewards}
                  userEarnings={this.state.userEarnings}
                  etherscanURL={etherscanURL}
                  onClaimRebateRewardsClick={this.onClaimRebateRewardsClick}/>

                {this.state.bzrxV1Balance.gt(0) && (
                  <div className="convert-button">
                    <button
                      className="button button-full-width"
                      onClick={this.onBzrxV1ToV2ConvertClick}>
                      Convert BZRX v1 to v2
                      <span className="notice">
                        You will need to confirm 2 transactions in your wallet.
                      </span>
                    </button>
                  </div>
                )}

                {this.state.claimableAmount.gt(0) && (
                  <div className="convert-button">
                    <button
                      title={`Claim ${this.state.claimableAmount.toFixed(18)} vBZRX`}
                      className="button button-full-width"
                      onClick={this.onClaimClick}>
                      Claim&nbsp;
                      <span>{this.state.claimableAmount.toFixed(4)}</span>
                      &nbsp;vBZRX
                    </button>
                  </div>
                )}

                <TopRepList
                  topRepsList={this.state.topRepsList}
                  delegateAddress={this.state.delegateAddress}
                  selectedRepAddress={this.state.selectedRepAddress}
                  setSelectedRepAddressClick={this.setSelectedRepAddressClick}
                />

                {this.state.selectedRepAddress !== '' && (
                  <AddToBalance
                    bzrxMax={this.state.bzrxBalance}
                    vbzrxMax={this.state.vBzrxBalance}
                    bptMax={this.state.bptBalance}
                    stake={this.onStakeClick}
                  />
                )}

                <div className="calculator-row">
                  <div className="group-buttons">
                    <button className="button" onClick={this.openFindRepresentative}>
                      Find a Representative
                    </button>
                    <button
                      className="button"
                      disabled={this.isAlreadyRepresentative}
                      onClick={this.onBecomeRepresentativeClick}>
                      Become A Representative
                    </button>
                  </div>
                </div>
              </React.Fragment>
            )}
          </div>
        </div>
      </React.Fragment>
    )
  }
}
