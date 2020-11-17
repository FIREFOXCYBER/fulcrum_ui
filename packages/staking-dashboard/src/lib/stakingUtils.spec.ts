import { BigNumber } from '@0x/utils'
import stakingUtils from './stakingUtils'

const userBalancesMock = {
  bzrx: new BigNumber(100),
  vbzrx: new BigNumber(100),
  bpt: new BigNumber(100)
}

describe('stakingUtils', () => {
  describe('verifyStake()', () => {
    // These are some safeguards tests, they dont cover everything
    it('should return false if all amounts are 0', () => {
      const tokensToStake = {
        bzrx: new BigNumber(0),
        vbzrx: new BigNumber(0),
        bpt: new BigNumber(0)
      }
      expect(stakingUtils.verifyStake(userBalancesMock, tokensToStake)).toBe(false)
    })

    it('should return false if any amount is negative', () => {
      let tokensToStake = {
        bzrx: new BigNumber(-1),
        vbzrx: new BigNumber(0),
        bpt: new BigNumber(0)
      }
      expect(stakingUtils.verifyStake(userBalancesMock, tokensToStake)).toBe(false)

      tokensToStake = {
        bzrx: new BigNumber(0),
        vbzrx: new BigNumber(-1),
        bpt: new BigNumber(0)
      }
      expect(stakingUtils.verifyStake(userBalancesMock, tokensToStake)).toBe(false)

      tokensToStake = {
        bzrx: new BigNumber(0),
        vbzrx: new BigNumber(0),
        bpt: new BigNumber(-1)
      }
      expect(stakingUtils.verifyStake(userBalancesMock, tokensToStake)).toBe(false)
    })

    it('should return false if any amount is bigger than user balance', () => {
      let tokensToStake = {
        bzrx: new BigNumber(101),
        vbzrx: new BigNumber(99),
        bpt: new BigNumber(99)
      }
      expect(stakingUtils.verifyStake(userBalancesMock, tokensToStake)).toBe(false)

      tokensToStake = {
        bzrx: new BigNumber(99),
        vbzrx: new BigNumber(101),
        bpt: new BigNumber(99)
      }
      expect(stakingUtils.verifyStake(userBalancesMock, tokensToStake)).toBe(false)

      tokensToStake = {
        bzrx: new BigNumber(99),
        vbzrx: new BigNumber(99),
        bpt: new BigNumber(101)
      }
      expect(stakingUtils.verifyStake(userBalancesMock, tokensToStake)).toBe(false)
    })

    it('should return true if amounts are fine', () => {
      let tokensToStake = {
        bzrx: new BigNumber(100),
        vbzrx: new BigNumber(100),
        bpt: new BigNumber(100)
      }
      expect(stakingUtils.verifyStake(userBalancesMock, tokensToStake)).toBe(true)

      tokensToStake = {
        bzrx: new BigNumber(0),
        vbzrx: new BigNumber(0),
        bpt: new BigNumber(1)
      }
      expect(stakingUtils.verifyStake(userBalancesMock, tokensToStake)).toBe(true)
    })
  })
})
