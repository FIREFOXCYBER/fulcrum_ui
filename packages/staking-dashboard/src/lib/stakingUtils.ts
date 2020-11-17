import { BigNumber } from '@0x/utils'

/**
 * Checks if the amounts to be staked are valid.
 * @param userBalances The balances of unstaked tokens in user wallet
 * @param tokensToStake The amount of tokens to be staked
 */
function verifyStake(
  userBalances: { bzrx: BigNumber; vbzrx: BigNumber; bpt: BigNumber },
  tokensToStake: { bzrx: BigNumber; vbzrx: BigNumber; bpt: BigNumber }
) {
  const { bzrx, vbzrx, bpt } = tokensToStake

  // All zeros
  if (bzrx.eq(0) && vbzrx.eq(0) && bpt.eq(0)) {
    return false
  }
  // Some negative
  if (bzrx.isNegative() || vbzrx.isNegative() || bpt.isNegative()) {
    return false
  }
  // Some bigger than total balance
  if (bzrx.gt(userBalances.bzrx) || vbzrx.gt(userBalances.vbzrx) || bpt.gt(userBalances.bpt)) {
    return false
  }
  return true
}

export default {
  verifyStake
}
