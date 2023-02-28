const Redis = require('ioredis');

let redis_url = process.env.REDIS_URL;

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