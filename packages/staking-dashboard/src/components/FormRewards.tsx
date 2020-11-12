import { BigNumber } from '@0x/utils'
import React from 'react'
import { ReactComponent as VBzrxIcon } from '../assets/images/token-vbzrx.svg'

interface IFormRewardsProps {
  rebateRewards: BigNumber
  userEarnings: BigNumber
  etherscanURL: string
  onClaimRebateRewardsClick: () => void
}

export function FormRewards(props: IFormRewardsProps) {
  const { etherscanURL, rebateRewards, onClaimRebateRewardsClick, userEarnings } = props

  return (
    <div className="calculator-row rewards-container">
      <div className="reward-item">
        <div className="row-header">Incentive rewards balance:</div>
        <div className="row-body">
          <div className="reward-content">
            <a
              href={`${etherscanURL}token/0xB72B31907C1C95F3650b64b2469e08EdACeE5e8F`}
              target="_blank"
              rel="noopener noreferrer">
              <span className="icon">
                <VBzrxIcon />
              </span>
            </a>
            <span className="value" title={rebateRewards.toFixed(18, 1)}>
              {rebateRewards.toFixed(4, 1)}
            </span>
          </div>
          <button
            className="button"
            disabled={!rebateRewards.gt(0)}
            onClick={onClaimRebateRewardsClick}>
            Claim Rewards
          </button>
        </div>
      </div>
      <div className="reward-item">
        <div className="row-header">Staking rewards balance:</div>
        <div className="row-body">
          <div className="reward-content">
            <span className="currency">$</span>
            <span className="value" title={userEarnings.toFixed(18, 1)}>
              {userEarnings.toFixed(2, 1)}
            </span>
          </div>
          <button className="button" disabled={true}>
            Claim Rewards
          </button>
        </div>
      </div>
    </div>
  )
}

export default React.memo(FormRewards)
