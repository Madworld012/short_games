const redis = require('redis');
const util = require('util');

let redis_conf = {
    // url: process.env.REDIS_URI       // replace with your port
    url: "redis://default:WpQjHzot3cfwAm4SR3jCXKXAn0gGfhV3@redis-13598.c11.us-east-1-3.ec2.cloud.redislabs.com:13598"      // replace with your port
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