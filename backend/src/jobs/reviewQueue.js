import { Queue } from 'bullmq'
import IORedis   from 'ioredis'

const connection = new IORedis(process.env.UPSTASH_REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: process.env.UPSTASH_REDIS_URL?.startsWith('rediss') ? {} : undefined,
  // Silence the eviction policy warning — Upstash uses optimistic-volatile
  // by design for serverless Redis and it is safe for BullMQ job queues
  enableOfflineQueue: false,
  lazyConnect: true,
})

// Suppress the Upstash eviction policy warning — it is expected on Upstash
// free tier and does not affect queue correctness for this use case
const _warn = console.warn.bind(console)
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Eviction policy')) return
  _warn(...args)
}

export const reviewQueue = new Queue('review-jobs', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff:  { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 86400 },
    removeOnFail:     { age: 604800 },
  },
})

export async function enqueueReviewJob(data) {
  const job = await reviewQueue.add('review', data, { jobId: data.jobId })
  console.log(`Queued job ${job.id} → ${data.owner}/${data.repo}`)
  return job
}
