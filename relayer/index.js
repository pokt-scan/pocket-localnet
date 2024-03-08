import Piscina from "piscina";
import * as Stream from "stream";
import bunyan from "bunyan";

const logger = bunyan.createLogger({
    name: 'relayer',
    level: 'debug',
    streams: [{
        level: 'info',
        stream: process.stdout // log INFO and above to stdout
    }, {
        type: 'rotating-file',
        path: './logs/relays.log',
        period: '1d',   // daily rotation
        count: 3        // keep 3 back copies
    }]
});

const run = () => {
    return new Promise((resolve, reject) => {
        const pool = new Piscina({
            filename: new URL('./worker.mjs', import.meta.url).href,
            maxQueue: 'auto'
        });

        const tasks = [];
        const totalRelays = Number(process.env.MAX_RELAYS || 1000)

        const stream = new Stream.Readable()
        stream.setEncoding('utf8');

        pool.on('drain', () => {
            if (stream.isPaused()) {
                logger.info('resuming...', pool.queueSize);
                stream.resume();
            }
        });

        stream
            .on('data', (data) => {
                tasks.push(pool.run(data));
                if (pool.queueSize === pool.options.maxQueue) {
                    logger.info('pausing...', pool.queueSize);
                    stream.pause();
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

                results.forEach(p => {
                    if (p.status === 'rejected' || !p.value.success) {

                        badRelays++
                        if (p.status === 'rejected') {
                            logger.error(`relay promise reject because: ${p.reason}`)
                        } else if (p.value && p.value.success) {
                            logger.error(`relay promise fulfilled but was a bad relay because: ${p.value.errorMsg}`)
                        }
                    } else {
                        goodRelays++
                        goodRelaysTime += p.value.relayTime
                        if (relaysByNode[p.value.node]) relaysByNode[p.value.node]++
                        else relaysByNode[p.value.node] = 1
                        if (p.value.responseSample && p.value.responseSample.length > 0) {
                            const items = p.value.responseSample
                            logger.debug('response', {
                                node: p.value.node,
                                response: items,
                            });
                        }
                    }
                })

                logger.info('=======================================================================')
                logger.info(`Good Relays: ${goodRelays}`)
                logger.info(`Relays MS Avg: ${goodRelays > 0 ? goodRelaysTime / goodRelays : 0}`)
                logger.info(`Bad Relays: ${badRelays}`)
                logger.info(JSON.stringify(relaysByNode, null, 2))
                logger.info('=======================================================================')

                setTimeout(() => {
                    resolve()
                }, 1000)
            });

        for( let i=0; i < totalRelays; i++) {
            stream.push(`${i}`)
        }

        // finish
        stream.push(null)
    })
}

(function () {
    run().then(() => process.exit(0)).catch((e) => {
        console.trace(e)
        process.exit(1)
    })
})()