const isTest = () =>
	typeof process !== 'undefined' &&
	process.env.NODE_ENV === 'test' &&
	// @ts-expect-error
	!globalThis.__FORCE_RAF_IN_TESTS__

const fpsQueue: Array<() => void> = []
const targetFps = 60
const targetTimePerFrame = 1000 / targetFps
let frame: number | undefined
let time = 0
let last = 0

const flush = () => {
	const queue = fpsQueue.splice(0, fpsQueue.length)
	for (const fn of queue) {
		fn()
	}
}

function tick() {
	if (frame) {
		return
	}
	const now = Date.now()
	const elapsed = now - last

	if (time + elapsed < targetTimePerFrame) {
		frame = requestAnimationFrame(() => {
			frame = undefined
			tick()
		})
		return
	}
	frame = requestAnimationFrame(() => {
		frame = undefined
		last = now
		// If we fall behind more than 10 frames, we'll just reset the time so we don't try to update a number of times
		// This can happen if we don't interact with the page for a while
		time = Math.min(time + elapsed - targetTimePerFrame, targetTimePerFrame * 10)
		flush()
	})
}

let started = false

/**
 * Returns a throttled version of the function that will only be called max once per frame.
 * The target frame rate is 60fps.
 * @param fn - the fun to return a throttled version of
 * @returns
 * @internal
 */
export function fpsThrottle(fn: () => void) {
	if (isTest()) {
		return fn
	}

	return () => {
		if (fpsQueue.includes(fn)) {
			return
		}
		fpsQueue.push(fn)
		if (!started) {
			started = true
			// We set last to Date.now() - targetTimePerFrame - 1 so that the first run will happen immediately
			last = Date.now() - targetTimePerFrame - 1
		}
		tick()
	}
}

/**
 * Calls the function on the next frame. The target frame rate is 60fps.
 * If the same fn is passed again before the next frame, it will still be called only once.
 * @param fn - the fun to call on the next frame
 * @returns
 * @internal
 */
export function throttleToNextFrame(fn: () => void) {
	if (isTest()) {
		return fn()
	}

	if (fpsQueue.includes(fn)) {
		return
	}

	fpsQueue.push(fn)
	if (!started) {
		started = true
		// We set last to Date.now() - targetTimePerFrame - 1 so that the first run will happen immediately
		last = Date.now() - targetTimePerFrame - 1
	}
	tick()
}
