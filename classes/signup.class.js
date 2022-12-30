module.exports = {
    SP: async function (data, client) {
        console.log("data of SP", data);
        // return;

        cl("call COme FOr SP");

        if (data.ult == "phone") {
            signupClass.phoneNumberLogin(data, client);
        } else {
            cl("no login type found---------");
        }


    },
    //first call this  // Done
    LOGIN_PHNO: async function (data, client) {
        console.log("call come for login with phone");
        var wh = {};
        wh.mobile_no = data.mobile_no;
        var resp = await db.collection('game_users').find(wh).toArray()
        if (resp.length > 0) {
            cl("LOGIN_MOBILE ----->>>> resp:", resp);
            commonClass.SendSMS(data, function (cb_status) {
                cl("cb_status____", cb_status)
                if (cb_status.status == 1) {
                    var jobId = randomstring.generate(10);
                    var extime = commonClass.AddTime(60);
                    db.collection('game_users').updateOne({ _id: ObjectId(resp[0]._id.toString()) }, { $set: { OTP: cb_status.data.otp, jobId: jobId, isexpire: false } }, function (err) { })
                    commonClass.sendDirectToUserSocket(client, { en: "OPENOTP", data: { success: true, open_otp_screen: true, mobile_no: data.mobile_no, timer: 60 } });
                    schedule.scheduleJob(jobId, new Date(extime), function () {
                        schedule.cancelJob(jobId);
                        db.collection('game_users').updateOne({ _id: ObjectId(resp[0]._id.toString()) }, { $set: { isexpire: true } }, function (err) { });
                    });
                }
            });
        } else {
            console.log("send for sp user found");
            signupClass.SP(data, client);
        }
    },
    RESEND: function (data, client) {
        if (data.mobile_no != "" && typeof data.mobile_no != "undefined") {
            db.collection('game_users').findOne({ mobile_no: data.mobile_no }, function (err, resp) {
                c(resp)
                if (resp != null) {
                    commonClass.SendSMS(data, function (cb_status) {
                        cl("cb_status_________________________", cb_status)
                        if (cb_status.status == 1) {
                            var jid = randomstring.generate(10);
                            var extime = commonClass.AddTime(60);
                            db.collection('game_users').update({ mobile_no: data.mobile_no }, { $set: { OTP: cb_status.data.otp, jid: jid, isexpire: false } }, function (err) { })
                            commonClass.SendData(client, 'RESEND', { success: true, mobile_no: data.mobile_no, timer: 60 });
                            schedule.scheduleJob(jid, new Date(extime), function () {
                                schedule.cancelJob(jid);
                                db.collection('game_users').update({ mobile_no: data.mobile_no }, { $set: { isexpire: true } }, function (err) { })
                            })
                        }
                    });
                }
            });
        }
    },
    phoneNumberLogin: async function (data, client) {
        let wh = {};
        wh.mobile_no = data.mobile_no;
        let userData = await db.collection('game_users').find(wh).toArray();
        if (userData && userData.length > 0) {
            userData = userData[0];
            //last login save 
            //set user data into socket
            signupClass.setUserSocketData(userData, client);
            //send eventy to client
            var send_json = {
                status: true,
                uid: userData._id.toString(),
                un: userData.un,
                total_cash: userData.total_cash,
                msg: "Your Data"
            }
            if (userData.isMobileVerified == 1) {
                commonClass.sendDirectToUserSocket(client, { en: "SP", data: send_json });
            } else {
                send_json.msg = "Please Verify Your Phone Number First..";
                send_json.status = false;
                commonClass.sendDirectToUserSocket(client, { en: "SP", data: { status: false, msg: "Please Verify Your Phone Number First.." } });
            }

            if (userData.isMobileVerified == 0 && userData.mobile_no != '') {
                var udatac = {};
                udatac.mobile_no = userData.mobile_no;
                var jid = randomstring.generate(10);
                var extime = commonClass.AddTime(60);
                commonClass.SendSMS(udatac, function (cb_status) {
                    if (cb_status.status == 1) {
                        db.collection('game_users').updateOne({ mobile_no: userData.mobile_no }, { $set: { OTP: cb_status.data.otp } }, function (err) {
                            commonClass.sendDirectToUserSocket(client, { en: "OPENOTP", data: { success: true, mobile_no: data.mobile_no, timer: 60 } });
                            schedule.scheduleJob(jid, new Date(extime), function () {
                                schedule.cancelJob(jid);
                                db.collection('game_users').updateOne({ mobile_no: userData.mobile_no }, { $set: { isexpire: true } }, function (err) { })
                            })
                        })
                    }
                });
                return;
            }

            commonClass.sendDirectToUserSocket(client, { en: "SP", data: send_json });
            cl("user already exit.", userData);
        } else {
            var UserFields = await signupClass.getUserDefaultFields(data, client);
            console.log("UserFields", UserFields);
            let user = await db.collection('game_users').insertOne(UserFields);
            let newUserData = await db.collection('game_users').find(wh).toArray();
            newUserData = newUserData[0];
            //send sms and other process
            signupClass.setUserSocketData(newUserData, client);

            // if (false) {
            commonClass.SendSMS(data, function (cb_status) {
                if (cb_status.status == 1) {
                    var jid = randomstring.generate(10);
                    var extime = commonClass.AddTime(60);
                    db.collection('game_users').update({ mobile_no: data.mobile_no }, { $set: { OTP: cb_status.data.otp, jid: jid, isexpire: false } }, function (err) { })
                    commonClass.sendDirectToUserSocket(client, { en: "OPENOTP", data: { success: true, mobile_no: data.mobile_no, timer: 60 } });
                    schedule.scheduleJob(jid, new Date(extime), function () {
                        schedule.cancelJob(jid);
                        db.collection('game_users').update({ mobile_no: data.mobile_no }, { $set: { isexpire: true } }, function (err) { })
                    })
                }
            })
            // } else {

            // var send_json = {
            //     status: true,
            //     uid: newUserData._id.toString(),
            //     un: newUserData.un,
            //     total_cash: newUserData.total_cash,
            //     msg: "Your Data"
            // }
            // console.log("event send");
            // commonClass.sendDirectToUserSocket(client, { en: "SP", data: send_json });
            // }
        }
    },
    getUserDefaultFields: async function (data, client) {
        var unique_id = await commonClass.GetRandomInt(1, 9999999);
        var OTP = await commonClass.GetRandomInt(1, 99999);
        var fields = {
            un: data.un.substr(0, 15),
            unique_id: unique_id,
            sck: client.id,//client.id,
            ue: (typeof data.email != 'undefined') ? data.email : "",
            mobile_no: data.mobile_no,
            isMobileVerified: 0,
            total_cash: config.INITIAL_CASH,
            OTP: 0,
            bet_1: 0,
            bet_2: 0,
            tblid: "",
            country: (data.country_name) ? data.country_name : "India",
            gender: (data.gender) ? data.gender : '', //gender,
            is_play: 0,
            is_online: 0,
            last_game_play: "",
            cd: new Date(),
            ll: new Date()
        }
        return fields;

    },
    setUserSocketData: async function (data, client) {
        if (data == null || typeof client.id == 'undefined') {
            return false;
        }
        client.uid = data._id.toString();
        client.un = data.un.toString();

        await db.collection('game_users').updateOne({ _id: ObjectId(client.uid) }, { $set: { sck: client.id, is_online: 1, ll: new Date() } }, function () { })
    },
    VERIFY_OTP: function (data, client) {
        if (data && data.mobile_no && data.otp) {
            db.collection('game_users').findOne({ mobile_no: data.mobile_no }, function (err, userdata) {
                cl("VERIFY_LOGIN_MOBILE-----------------------------------------------", userdata)
                if (!err && userdata) {
                    cl("VERIFY_LOGIN_MOBILE------userdata.OTP", userdata.OTP);
                    cl("VERIFY_LOGIN_MOBILE------data.otp", data.otp);
                    cl("VERIFY_LOGIN_MOBILE------userdata.isexpire ", userdata.isexpire);
                    if (userdata.OTP == data.otp && userdata.isexpire == false) {
                        schedule.cancelJob(userdata.jid);
                        db.collection('game_users').update({ _id: MongoID(userdata._id.toString()) }, { $set: { isMobileVerified: 1, OTP: "" } }, function () { });
                        signupClass.SP(data, client);
                    } else {
                        commonClass.sendDirectToUserSocket(client, { en: "WOTP", data: { status: false, msg: "OTP is incorrect Or Expire" } });
                    }
                }
            });
        }else{
            commonClass.sendDirectToUserSocket(client, { en: "VERIFY_OTP", data: { status: false, msg: "Please send Proper Data" } });
        }

    }
}