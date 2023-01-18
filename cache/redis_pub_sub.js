rs = require('randomstring')
var redis = require('redis');
module.exports = {
    initRedisPublisher: function () {
        return new Promise(resolve => {

            let redis_conf = {
                port: config.REDIS_PORT,        // replace with your port
                host: config.REDIS_HOST,        // replace with your hostanme or IP address
                db: config.REDIS_DB
            }

            if (config.MODE == "PROD") {
                console.log("call cme for live");
                redis_conf.host = config.REDIS_HOST_LIVE;
                redis_conf["password"] = config.REDIS_PASS;
            }


            rPub = module.exports = redis.createClient(redis_conf);

            rPub.on("error", function (error) {
                console.error("Redis Publisher error : ", error);
            });

            rPub.on("ready", function () {
                console.log("Redis Publisher connected ", new Date())
                resolve();
            });
        })
    },
    initRedisSubscriber: function () {
        return new Promise(resolve => {
            let redis_conf = {
                port: config.REDIS_PORT,        // replace with your port
                host: config.REDIS_HOST,        // replace with your hostanme or IP address
                db: config.REDIS_DB
            }

            if (config.MODE == "PROD") {
                redis_conf.host = config.REDIS_HOST_LIVE;
                redis_conf["password"] = config.REDIS_PASS;
            }


            rSub = module.exports = redis.createClient(redis_conf);


            rSub.on("error", function (error) {
                console.error("Redis Subscriber error : ", error);
            });

            rSub.on("ready", function () {
                console.log("Redis Subscriber connected ", new Date())
                resolve();

                // rSub.psubscribe('user.*', 'single.*', 'table.*', 'test.*', function (err, count) {
                rSub.psubscribe('socket.*', 'room.*', 'socketid.*', function (err, count) {
                    console.log("psubscribe : err : ", err)
                    console.log("psubscribe : count : ", count)
                });

                rSub.on("pmessage", function (pattern, channel, msg) {

                    let message = JSON.parse(msg)

                    if (!message) {
                        return console.log("missing message data")
                    }

                    if (pattern == "socket.*") {
                        let socket = channel.replace('socket.', '');
                        console.log("socket", socket);
                        let clientObj = io.sockets.sockets.get(socket);
                        // let clientObj = io.sockets.connected[single];
                        if (clientObj) {
                            // var eData = commonClass.Enc(message);
                            console.log("data send from pubsub");
                            if(message.en == "NCC"){
                                delete clientObj.uid;
                                clientObj.emit('res', message);
                                clientObj.disconnect();
                            }else{
                                clientObj.emit('res', message);
                            }
                        }
                    } else if (pattern == "room.*") {
                        //first we have to get table id from routing key.
                        let room = channel.replace('room.', '');
                        //room must be exists in routing key.
                        if (!room) {
                            return false;
                        }
                        if (typeof io.to(room) != 'undefined') {
                            // var eData = commonClass.Enc(message);
                            io.to(room).emit('res', message);
                        }
                    } else {
                        console.log("invalid message in redis channel")
                    }
                });
            });
        })
    },
    parseJSON: function (data) {
        if (typeof data == 'object') {
            return data;
        }
        try {
            return JSON.parse(data);
        } catch (err) {
            return {};
        }
    }
}


