/**working start*/

let cache = require('./cache');

const redis = require('redis');


let redis_conf = {
    url: config.REDIS_URL        // replace with your port
}

if (config.MODE == "PROD") {
    redis_conf["url"] = config.REDIS_LIVE_URL;
}

// let redis_conf = {
//     url: config.REDIS_URL        // replace with your port
// }

const ex_client = redis.createClient(redis_conf);
ex_client.select(config.REDIS_DB);

ex_client.send_command('config', ['set', 'notify-keyspace-events', 'Ex'], SubscribeExpired)

async function SubscribeExpired(e, r) {
    
    const expired_subKey = '__keyevent@1__:expired';
    ex_client.subscribe(expired_subKey,await function () {
        console.log(' [i] Subscribed to "' + expired_subKey + '" event channel : ' + r)
        ex_client.on('message',async function (chan, msg) {
            console.log( "Key -----",msg);
            let field = msg.split("-");
            let current_x_value =JSON.parse(await cache.get(field[0].toString()));
            console.log("current_x_value",current_x_value);
            commonClass.sendToRoom(field[0].toString(), { en: "UPDATE_BET", data: { type: "CASHOUT", uid: field[2], x: current_x_value.x, bet: parseInt(field[5]), win_amount: current_x_value.x * field[5] } });
        });
    })
}
/**working End*/


