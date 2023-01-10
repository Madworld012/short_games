const redis = require('redis');
const util = require('util');
let redis_conf = {
    port: config.REDIS_PORT,        // replace with your port
    host: config.REDIS_HOST,        // replace with your hostanme or IP address
}

if (config.MODE == "PROD") {
    console.log("call cme for live");
    redis_conf.host = config.REDIS_HOST_LIVE;
    redis_conf["password"] = config.REDIS_PASS;
}

redis.RedisClient.prototype.delWildcard = async function (key, callback) {
    var redis = this
    console.log("key -------------", key);

    let rows = await redis.keys(key.toString());
    for (var i = 0, j = rows.length; i < j; ++i) {
        redis.del(rows[i])
    }
    return callback();
}

const client = redis.createClient(redis_conf);
client.select(config.REDIS_DB);

//Incase any error pops up, log it
client.on("error", function (err) {
    console.log("Error " + err);
});

client.on("connect", function () {
    console.log("Redis Connection Sucessful");
});

client.on("reconnecting", function () {
    console.log("redis reconnecting")
});

client.get = util.promisify(client.get);
client.zrange = util.promisify(client.zrange);
client.keys = util.promisify(client.keys);

module.exports = client