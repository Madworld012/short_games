const Redis = require('ioredis');

// let redis_url = process.env.REDIS_URI;
let redis_url = "redis://default:WpQjHzot3cfwAm4SR3jCXKXAn0gGfhV3@redis-13598.c11.us-east-1-3.ec2.cloud.redislabs.com:13598";

const client = new Redis(redis_url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});
const subscriber = new Redis(redis_url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});

const opts = {
    createClient(type) {
        switch (type) {
            case 'client':
                return client;
            case 'subscriber':
                return subscriber;
            default:
                return new Redis(redis_url, {
                    maxRetriesPerRequest: null,
                    enableReadyCheck: false
                });
        }
    },
};

module.exports = opts