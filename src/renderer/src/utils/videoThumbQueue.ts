/**
 * Limits concurrent video thumbnail generation (decode + seek) to avoid
 * overloading the main thread when many video cards are visible.
 */

import { VIDEO_THUMB_MAX_CONCURRENT } from '../constants'

const MAX_CONCURRENT = VIDEO_THUMB_MAX_CONCURRENT
let active = 0
const waitlist: Array<() => void> = []

export function requestVideoThumbSlot(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++
    return Promise.resolve()
  }
  return new Promise<void>((resolve) => {
    waitlist.push(() => {
      active++
      resolve()
    })
  })
}

export function releaseVideoThumbSlot(): void {
  active = Math.max(0, active - 1)
  if (waitlist.length > 0 && active < MAX_CONCURRENT) {
    const next = waitlist.shift()!
    next()
  }
}
