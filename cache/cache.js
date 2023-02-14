const redis = require('redis');
const util = require('util');
let redis_conf = {
    url: config.REDIS_URL        // replace with your port
}

if (config.MODE == "PROD") {
    redis_conf["url"] = config.REDIS_LIVE_URL;
}

redis.RedisClient.prototype.delWildcard = async function (key, callback) {
    var redis = this
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