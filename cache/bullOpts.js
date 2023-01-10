const Redis = require('ioredis');

const client = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});
const subscriber = new Redis(config.REDIS_URL, {
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
                return new Redis(config.REDIS_URL, {
                    maxRetriesPerRequest: null,
                    enableReadyCheck: false
                });
        }
    },
};

module.exports = opts