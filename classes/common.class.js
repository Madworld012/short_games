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


            let update_json = {};

            if (data.cash > 0) {
                if (data.bonus && data.bonus == true) {
                    update_json['bonus_cash'] = parseFloat((((data.cash + user_data.bonus_cash) < 0) ? 0 : data.cash + user_data.bonus_cash).toFixed(2));
                } else {

                    let bet_from_bonus = user_data.bet_from_bonus;
                    let add_cash = data.cash;

                    let total_cash = 0;
                    let bonus_cash = 0;

                    if (bet_from_bonus > 0) {
                        if (add_cash > bet_from_bonus) {
                            bonus_cash = bet_from_bonus;
                            add_cash = add_cash - bet_from_bonus;
                            bet_from_bonus = 0;

                            if (add_cash > 0) {
                                total_cash = add_cash;
                            }
                        } else if (bet_from_bonus > add_cash) {
                            bet_from_bonus = bet_from_bonus - add_cash;
                            bonus_cash = add_cash;
                        } else if (add_cash == bet_from_bonus) {
                            bonus_cash = add_cash;
                            bet_from_bonus = 0;
                        }
                    } else {
                        total_cash = add_cash;
                    }


                    if (total_cash > 0) {
                        update_json['total_cash'] = parseFloat((((total_cash + user_data.total_cash) < 0) ? 0 : total_cash + user_data.total_cash).toFixed(2));
                        update_json['bet_from_bonus'] = bet_from_bonus;
                    }

                    if (bonus_cash > 0) {
                        update_json['bonus_cash'] = parseFloat((((bonus_cash + user_data.bonus_cash) < 0) ? 0 : bonus_cash + user_data.bonus_cash).toFixed(2));
                        update_json['bet_from_bonus'] = bet_from_bonus;
                    }
                }
            } else {
                if (data.trans && data.trans == true) {
                    update_json['total_cash'] = parseFloat((((data.cash + user_data.total_cash) < 0) ? 0 : data.cash + user_data.total_cash).toFixed(2));
                } else {
                    let total_cash = user_data.total_cash;
                    let bonus_cash = user_data.bonus_cash;
                    let total_cut_cash = Math.abs(data.cash);

                    if (total_cash + bonus_cash >= total_cut_cash) {

                        let halft_deduct_cash = total_cut_cash / 2;

                        if (total_cash == 0 && bonus_cash >= total_cut_cash) {
                            bonus_cash = bonus_cash - total_cut_cash;
                            total_cut_cash = 0;
                        } else if (bonus_cash == 0 && total_cash >= total_cut_cash) {
                            total_cash = total_cash - total_cut_cash;
                            total_cut_cash = 0;
                        } else if (total_cash >= halft_deduct_cash && bonus_cash >= halft_deduct_cash) {
                            total_cash = total_cash - halft_deduct_cash;
                            bonus_cash = bonus_cash - halft_deduct_cash;
                            total_cut_cash = 0;
                        } else if ((bonus_cash < halft_deduct_cash && bonus_cash > 0) || (total_cash < halft_deduct_cash && total_cash > 0)) {
                            if (bonus_cash < halft_deduct_cash) {
                                let diff = halft_deduct_cash - bonus_cash;
                                bonus_cash = 0;
                                total_cash = total_cash - (halft_deduct_cash + diff);
                                total_cut_cash = 0;
                            } else if (total_cash < halft_deduct_cash) {
                                let diff = halft_deduct_cash - total_cash;
                                total_cash = 0;
                                bonus_cash = bonus_cash - (halft_deduct_cash + diff);
                                total_cut_cash = 0;
                            }
                        }
                    } else {
                        console.log("not enough cash");
                    }


                    update_json["total_cash"] = parseFloat(total_cash.toFixed(2));
                    update_json["bonus_cash"] = parseFloat(bonus_cash.toFixed(2));

                    update_json["bet_from_bonus"] = user_data.bet_from_bonus + parseFloat((user_data.bonus_cash - bonus_cash).toFixed(2));
                }
            }

            // var final_cash = (((data.cash + user_data.total_cash) < 0) ? 0 : data.cash + user_data.total_cash).toFixed(2);
            // console.log("final_cash", final_cash);
            // let user_updated_record = await db.collection('game_users').findOneAndUpdate({ _id: ObjectId(data.uid.toString()) }, { $set: { total_cash: parseFloat(final_cash) } }, { returnDocument: 'after' });
            let user_updated_record = await db.collection('game_users').findOneAndUpdate({ _id: ObjectId(data.uid.toString()) }, { $set: update_json }, { returnDocument: 'after' });
            commonClass.trackChips({
                uid: user_data._id.toString(),
                msg: data.msg,
                cut_cash: data.cash,
                cash: user_data.total_cash,
                bonus: user_data.bonus_cash,
                bet_from_bonus: (user_data.bet_from_bonus) ? user_data.bet_from_bonus : "",
                a_cash: user_updated_record.value.total_cash,
                a_bonus: user_updated_record.value.bonus_cash,
                a_bet_from_bonus: (update_json.bet_from_bonus) ? update_json.bet_from_bonus : "",
                cd: new Date()
            });
            commonClass.sendDataToUserSocketId(user_data.sck, { en: "UC", data: { status: true, total_cash: user_updated_record.value.total_cash + user_updated_record.value.bonus_cash, bonus_cash: user_updated_record.value.bonus_cash } });
        } else {
            console.log("Problem in update cash:: ", data);
        }


    },
    trackChips: function (data) {
        if (data) {
            let cash_track = db.collection('cash_track').findOneAndUpdate({}, { $inc: { total_cash: data.cut_cash } }, { new: true, upsert: true, returnDocument: 'after' });
            let today = moment().format("DD/MM/YYYY");
            let daily_updated_record = db.collection('daily_cash_track').findOneAndUpdate({ date: today }, { $inc: { total_cash: data.cut_cash } }, { new: true, upsert: true, returnDocument: 'after' });
            let user_cash_track = db.collection('user_cash_track').insertOne(data);
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
    getRandomeHistory: async function (number) {
        let history_data = await db.collection("daily_table_history").aggregate([{ $match: { "history": { $gte: 25 } } }, { $limit: 1 }]).toArray();
        console.log("data", history_data);
        let history = _.shuffle([1.97, 2.87, 3.00, 2.89, 1.85, 5.30, 1.67, 10.25, 1.32, 1.18, 1.23, 10.25, 1.32, 1.18, 1.23]);
        if (history_data.length > 0) {
            history = history_data[0].history.splice(0, 25)
        }
        return history;
    }
}