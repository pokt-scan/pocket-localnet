import Piscina from 'piscina'
import * as Stream from 'stream'
import fs from 'fs'
import bunyan from 'bunyan'
import bFormat from 'bunyan-format'
import joi from 'joi'
import _ from 'lodash'

const dataSchema = joi.object({
  rpcUrls: joi.array().min(1).items(joi.string()).required(),
  whitelistedServicers: joi.array().optional().default([]),
  appPrivKey: joi.string().hex().required(),
  chain: joi.object().keys({
    id: joi.string().required(),
    callSet: joi.array().min(1).items(joi.object().keys({
      method: joi.string().optional().default(null).allow(''),
      path: joi.string().optional().default(null).allow(''),
      headers: joi.object().optional().unknown(true),
      data: joi.string().required(),
    })).required(),
  }).required(),
  mesh: joi.object().keys({
    enabled: joi.bool().default(false),
    rpcUrl: joi.string().when('enabled', {
      is: true,
      then: joi.string().required(),
      otherwise: joi.string().optional().allow(''),
    }),
  }).optional().default({ enabled: false }),
  relays: joi.number().min(1).default(1),
  logRelayData: joi.bool().default(false).optional(),
  logFile: joi.string().optional().default('relays.log').allow(''),
  writeRawRelayData: joi.bool().default(false).optional(),
  rawFile: joi.string().optional().default('relays.raw').allow(''),
})

const bunyanFormat = bFormat({ outputMode: 'long', levelInString: true })

const logger = bunyan.createLogger({
  name: 'relayer',
  level: 'debug',
  stream: bunyanFormat,
})

const readDataFile = async () => {
  const filePath = _.isEmpty(process.env.DATA_PATH) ? './data.json' : process.env.DATA_PATH

  if (!fs.existsSync(filePath)) {
    throw new Error(`file ${filePath} does not exist`)
  }

  const data = await fs.readFileSync(filePath)

  logger.info(`reading ${filePath} file`)

  return JSON.parse(data)
}

const run = (data) => {
  return new Promise((resolve, reject) => {
    const validation = dataSchema.validate(data)
    if (validation.error) {
      reject(validation.error)
      return
    }
    
    const rawToFile = _.isBoolean(data.writeRawRelayData) && data.writeRawRelayData
    const logToFile = _.isBoolean(data.logRelayData) && data.logRelayData

    if(logToFile) logger.level('debug')

    logger.addStream({
      type: 'rotating-file',
      path: data.logFile,
      level: 'debug',
      // daily rotation
      period: '1d',
      // keep 3 back copies
      count: 3,
    })

    const pool = new Piscina({
      filename: new URL('./worker.mjs', import.meta.url).href,
      maxQueue: 'auto',
      workerData: data,
    })

    const tasks = []

    const stream = new Stream.Readable()
    stream.setEncoding('utf8')

    pool.on('drain', () => {
      if (stream.isPaused()) {
        logger.info({ queueSize: pool.queueSize }, 'resuming pool queue')
        stream.resume()
      }
    })

    stream
      .on('data', () => {
        tasks.push(pool.run())
        if (pool.queueSize === pool.options.maxQueue) {
          logger.info({ queueSize: pool.queueSize }, 'pausing pool queue')
          stream.pause()
        }
      })
      .on('error', (e) => {
        reject(e)
      })
      .on('end', async () => {
        const results = await Promise.allSettled(tasks)

        let goodRelays = 0
        let goodRelaysTime = 0
        let badRelays = 0
        const relaysByNode = {}

        logger.info('analyzing results', {relays: data.relays})
        results.forEach(p => {
          if (p.status === 'rejected' || !p.value.success) {

            badRelays++
            if (p.status === 'rejected') {
              logger.error({err: p.reason}, `relay rejected`)
            } else if (p.value) {
              logger.error({err: p.value.errorMsg, hash: p.value.debug.hash}, `relay success with error`)
            }
          } else {
            goodRelays++
            goodRelaysTime += p.value.relayTime
            if (relaysByNode[p.value.node]) relaysByNode[p.value.node]++
            else relaysByNode[p.value.node] = 1

            if(logToFile){
              logger.debug('relay data', {
                hash: p.value.debug.hash,
                request: p.value.debug.request,
                response: p.value.debug.response,
              })
            }
            if(rawToFile){
              fs.appendFile(data.rawFile, p.value.debug.response + '\n', (err) => {
                if (err) {
                  console.error('Error writing log to file:', err);
                }
              });
            }
          }
        })

        logger.info('summary', {
          goodRelays,
          badRelays,
          byNodeCount: relaysByNode,
          avgMs: goodRelays > 0 ? goodRelaysTime / goodRelays : 0,
        })

        // give enough time to streams complete file write on logs
        if(logToFile) setTimeout(resolve, 2000)
        else resolve()
      })

    for (let i = 0; i < data.relays; i++) {
      stream.push(`${i}`)
    }

    // finish
    stream.push(null)
  })
}

const exec = async () => {
  const data = await readDataFile()
  return run(data)
}

(function () {
  exec().then(() => {
    logger.info('relayer job done')
    process.exit(0)
  }).catch((e) => {
    logger.trace({ err: e }, 'something went wrong')
    process.exit(1)
  })
})()
