import { EventEmitter } from "events";

/**
 * In-process pub/sub for Server-Sent Events. Discussion updates are pushed to
 * connected viewers only when a comment is actually written — no idle DB load.
 * (Single-process deployment; a multi-node setup would swap this for Redis
 * pub/sub behind the same emit/subscribe interface.)
 */
export const eventBus = new EventEmitter();
// One listener per open SSE connection; don't warn at the default cap of 10.
eventBus.setMaxListeners(0);

export const commentChannel = (positionId: string) => `comments:${positionId}`;
