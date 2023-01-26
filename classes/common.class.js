var request = require("request");
require('dotenv').config();
let crypto = require('crypto');
const encKey = process.env.DATA_ENC_KEY;
module.exports = {
    GetRandomInt: async function (min, max) {
        var rnd = Math.floor(Math.random() * (parseInt(max) - parseInt(min) + 1)) + parseInt(min);
        return Number(rnd);
    },
    //to direct send to user
    sendDirectToUserSocket: async function (socket, data) {
        if (typeof socket != 'undefined' && typeof socket == 'object' && typeof socket.emit != 'undefined') {
            // rPub.publish("socket.", socket.id, JSON.stringify(data));
            rPub.publish("socket." + socket.id, JSON.stringify(data));
            // socket.emit('res', data);
        }
    },
    sendDataToUserSocketId: async function (socket_id, data) {
        if (typeof socket_id != 'undefined' || socket_id != '' || socket_id != null || socket_id != 0) {
            if (io.to(socket_id) && typeof io.to(socket_id).emit != 'undefined') {
                // io.to(socket_id).emit('res', data);
                rPub.publish("socket." + socket_id, JSON.stringify(data));
            }
        }
    },
    sendDataToUserId: async function (user_id, data) {
        if (user_id) {
            let userData = await db.collection('game_users').find({ _id: ObjectId(user_id.toString()) }).toArray();
            if (userData && userData.length > 0) {
                let socket_id;
                socket_id = userData[0].sck;
                if (typeof socket_id != 'undefined' || socket_id != '' || socket_id != null || socket_id != 0) {
                    if (io.to(socket_id) && typeof io.to(socket_id).emit != 'undefined') {
                        // io.to(socket_id).emit('res', data);
                        rPub.publish("socket." + socket_id, JSON.stringify(data));
                    }
                }
            }
        } else {
            console.log("socket id not found");
        }
    },
    sendToRoom: async function (room_id, data) {
        if (typeof room_id == 'object') {
            room_id = String(room_id);
        }
        if (typeof room_id == 'string' && room_id.length > 23) {
            // io.to(room_id).emit('res', data);
            rPub.publish("room." + room_id, JSON.stringify(data));
        }
    },
    sendToAllSocket: async function (data) {
        if (data) {
            rPub.publish("toallsck.", JSON.stringify(data));
        }
    },
    response: function (res, data) {
        res.send({ data: this.Enc(data) });
    },
    Enc: function (toCrypt) {
        let keyBuf = Buffer.from(Array(32));

        keyBuf.write(encKey, 'utf8');
        ivBuf = Buffer.from(Array(16));

        let cipher = crypto.createCipheriv('aes256', keyBuf, ivBuf);

        output = cipher.update(JSON.stringify(toCrypt), 'utf-8', 'base64') + cipher.final('base64');
        // return output;
        return toCrypt;
    },
    Dec: function (toDecrypt) {
        let keyBuf = Buffer.from(Array(32));

        keyBuf.write(encKey, 'utf8');

        // Create the 16-byte zero-filled IV buffer
        ivBuf = Buffer.from(Array(16));

        let deCipher = crypto.createDecipheriv('aes256', keyBuf, ivBuf);

        // try {
        // decrypted = deCipher.update(toDecrypt, 'base64', 'utf8') + deCipher.final('utf8');
        // return JSON.parse(decrypted);
        // return JSON.parse(toDecrypt);
        if (typeof toDecrypt == "object") {
            return toDecrypt;
        } else {
            return JSON.parse(toDecrypt);
        }
        // } catch (e) {
        //     throw new Error(e)
        // }
    },
    sendToRoom_test: async function (room_id, data) {
        if (typeof room_id == 'object') {
            room_id = String(room_id);
        }
        rPub.publish("room." + room_id, JSON.stringify(data));
        if (typeof room_id == 'string' && room_id.length > 23) {
            // io.to(room_id).emit('res', data);
            rPub.publish("room." + room_id, JSON.stringify(data));
        }
    },
    AddTime: function (t) {
        //t will be in second how many second you want to add in time.
        var ut = new Date();
        ut.setSeconds(ut.getSeconds() + Number(t));
        return ut;
    },
    update_cash: async function (data) {

        if (!data.uid) {
            console.log("CRITICAL Error in UPdate balance:: ", data.msg);
            return;
        }
        console.log("data", data);
        let user_data = await db.collection('game_users').find({ _id: ObjectId(data.uid.toString()) }).toArray();

        if (user_data && user_data.length > 0) {
            user_data = user_data[0];

            console.log("data.balance", data.cash);
            console.log("user.balance", data.cash);
            console.log("user_data.total_cash", user_data.total_cash);

            var final_cash = (((data.cash + user_data.total_cash) < 0) ? 0 : data.cash + user_data.total_cash).toFixed(2);
            console.log("final_cash", final_cash);
            let user_updated_record = await db.collection('game_users').findOneAndUpdate({ _id: ObjectId(data.uid.toString()) }, { $set: { total_cash: parseFloat(final_cash) } }, { returnDocument: 'after' });
            commonClass.trackChips(data);
            commonClass.sendDataToUserSocketId(user_data.sck, { en: "UC", data: { status: true, total_cash: user_updated_record.value.total_cash } });

        } else {
            console.log("Problem in update cash:: ", data);
        }


        console.log("data");
    },
    trackChips: function (data) {
        if (data) {
            let cash_track = db.collection('cash_track').findOneAndUpdate({}, { $inc: { total_cash: data.cash } }, { new: true, upsert: true, returnDocument: 'after' });
            let today = moment().format("DD/MM/YYYY");
            let daily_updated_record = db.collection('daily_cash_track').findOneAndUpdate({ date: today }, { $inc: { total_cash: data.cash } }, { new: true, upsert: true, returnDocument: 'after' });

            let user_cash_track = db.collection('user_cash_track').insertOne({ total_cash: data.cash, uid: data.uid, msg: data.msg, cd: new Date() });
        }
    },
    SendSMS: function (data, callback) {
        console.log("call come", data);
        var otp = Math.floor(100000 + Math.random() * 900000);
        var request = require("request");
        if (data.mobile_no != config.TEST_MOBILE) {
            var options = {
                method: 'GET',
                url: 'https://api.authkey.io/request',
                qs:
                {
                    "authkey": process.env.SMS_AUTH_KEY.toString(),
                    "company": config.GAME_NAME.toString(),
                    "country_code": "91",
                    "mobile": data.mobile_no.toString(),
                    "otp": otp.toString(),
                    "sid": "6559"
                },
            };

            request(options, function (error, response, body) {
                if (error) {
                    callback({ status: 0, msg: "ERROR", data: {} });
                    throw new Error(error);
                } else {
                    console.log("ccc---", body);
                    callback({ status: 1, msg: "SUCCESS", data: { otp: otp } });
                }
            });
        } else {
            callback({ status: 1, msg: "SUCCESS", data: { otp: config.TEST_OTP } });
        }
    },
    isJsonValid: function (str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    },
    GetTimeDifference: function (startDate, endDate, type) {
        var date1 = new Date(startDate);
        var date2 = new Date(endDate);
        var diffMs = (date2 - date1); // milliseconds between now & Christmas

        if (type == 'day') {
            var date1 = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0);
            var date2 = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 0, 0, 0);
            var timeDiff = Math.abs(date2.getTime() - date1.getTime());
            var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
            return diffDays;
        } else if (type == 'hour') {
            return Math.round((diffMs % 86400000) / 3600000);
        } else if (type == 'minute') {
            return Math.round(((diffMs % 86400000) % 3600000) / 60000);
        } else {
            return Math.round((diffMs / 1000));
        }
    },
    getRandomeHistory: function (number) {
        let history = [
            40, 1.2, 1, 36, 1.3, 1.49, 11.69, 37, 1.98, 2.58,
            1, 1.12, 35, 1, 40, 2.75, 1, 7.56, 5.48, 1.01, 8.09,
            1.18, 1, 100, 55, 1.2, 5.6, 10.9, 8.1, 5, 8, 6, 8, 12,
            26, 26.15, 89.1, 6.20, 10.69, 8.01, 2.76, 2.92, 6.07, 8.63,
            2.74, 7.46, 55, 1, 1.4, 1, 58
        ];
        let history_data = _.shuffle(history);
        
        return history_data.splice(0,number);
    }
}