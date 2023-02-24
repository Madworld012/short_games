const Redis = require('ioredis');

const client = new Redis(process.env.REDIS_URI, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});
const subscriber = new Redis(process.env.REDIS_URI, {
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
                return new Redis(process.env.REDIS_URI, {
                    maxRetriesPerRequest: null,
                    enableReadyCheck: false
                });
        }
    },
};

module.exports = opts