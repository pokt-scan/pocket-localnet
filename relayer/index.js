import Piscina from "piscina";
import * as Stream from "stream";

// function sleep(ms) {
//     console.log("info", `process sleep ${ms}ms`)
//     return new Promise((resolve) => {
//         setTimeout(resolve, ms);
//     });
// }

const run = () => {
    return new Promise((resolve, reject) => {
        const pool = new Piscina({
            filename: new URL('./worker.mjs', import.meta.url).href,
            maxQueue: 'auto'
        });

        // let round = 1
        // const maxRounds = Number(process.env.MAX_ROUNDS || 1)

        const tasks = [];
        const totalRelays = Number(process.env.MAX_RELAYS || 1000)

        const stream = new Stream.Readable()
        stream.setEncoding('utf8');

        pool.on('drain', () => {
            if (stream.isPaused()) {
                console.log('resuming...', pool.queueSize);
                stream.resume();
            }
        });

        stream
            .on('data', (data) => {
                tasks.push(pool.run(data));
                if (pool.queueSize === pool.options.maxQueue) {
                    console.log('pausing...', pool.queueSize);
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

                console.log("debug", "analyze results")
                results.forEach(p => {
                    if (p.status === 'rejected' || !p.value.success) {

                        badRelays++
                        if (p.status === 'rejected') {
                            console.error(`relay promise reject because: ${p.reason}`)
                        } else if (p.value && p.value.success) {
                            console.error(`relay promise fulfilled but was a bad relay because: ${p.value.errorMsg}`)
                        }
                    } else {
                        goodRelays++
                        goodRelaysTime += p.value.relayTime
                        if (relaysByNode[p.value.node]) relaysByNode[p.value.node]++
                        else relaysByNode[p.value.node] = 1
                        // if (p.value.responseSample && p.value.responseSample.length > 0) {
                        //     const items = p.value.responseSample
                        //     console.log(`sample response: ${items[Math.floor(Math.random()*items.length)]}`)
                        // }
                    }
                })

                console.log("info", '=======================================================================')
                console.log("info", `Good Relays: ${goodRelays}`)
                console.log("info", `Relays MS Avg: ${goodRelays > 0 ? goodRelaysTime / goodRelays : 0}`)
                console.log("info", `Bad Relays: ${badRelays}`)
                console.log("info", JSON.stringify(relaysByNode, null, 2))
                console.log("info", '=======================================================================')

                resolve()
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