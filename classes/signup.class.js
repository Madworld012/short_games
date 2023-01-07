module.exports = {
    //AL
    SP: async function (data, client) {
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
                unique_id: userData.unique_id,
                ue: userData.ue,
                mobile_no: userData.mobile_no
            }
            if (userData.isMobileVerified == 1) {
                commonClass.sendDirectToUserSocket(client, { en: "SP", data: send_json });
                return;
            } else {
                send_json.msg = "Please Verify Your Phone Number First..";
                send_json.status = false;
                commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { success: false, msg: "Please verify your Mmobile number first, Do login for verify number" } });
            }
        } else {
            commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { success: false, msg: "Please Do Registration First." } });
        }
    },
    //first call this  // Done
    RESEND: function (data, client) {
        if (data.mobile_no != "" && typeof data.mobile_no != "undefined") {
            db.collection('game_users').findOne({ mobile_no: data.mobile_no }, function (err, resp) {
                if (resp != null) {
                    commonClass.SendSMS(data, function (cb_status) {
                        cl("cb_status_________________________", cb_status)
                        if (cb_status.status == 1) {
                            var jid = randomstring.generate(10);
                            var extime = commonClass.AddTime(60);
                            db.collection('game_users').updateOne({ mobile_no: data.mobile_no }, { $set: { OTP: cb_status.data.otp, jid: jid, isexpire: false } }, function (err) { })
                            commonClass.sendDirectToUserSocket(client, { en: "RESEND", data: { success: true, mobile_no: data.mobile_no, timer: 60 } });
                            schedule.scheduleJob(jid, new Date(extime), function () {
                                schedule.cancelJob(jid);
                                db.collection('game_users').updateOne({ mobile_no: data.mobile_no }, { $set: { isexpire: true } }, function (err) { })
                            })
                        }
                    });
                }
            });
        }
    },
    //AL
    getUserDefaultFields: async function (data, client) {
        var unique_id = await commonClass.GetRandomInt(1, 9999999);
        var OTP = await commonClass.GetRandomInt(1, 99999);
        var fields = {
            un: data.name.substr(0, 15),
            unique_id: unique_id,
            sck: client.id,//client.id,
            ue: (typeof data.email != 'undefined') ? data.email : "",
            mobile_no: data.mobile_no,
            password: data.password,
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
    //AL
    setUserSocketData: async function (data, client) {
        if (data == null || typeof client.id == 'undefined') {
            return false;
        }

        if (data.sck != null && data.sck != '' && data.sck != client.id) {
            commonClass.sendDataToUserSocketId(data.sck, { en: 'NCC', data: { leave: true, logout: true } });
        }

        client.uid = data._id.toString();
        client.un = data.un.toString();

        await db.collection('game_users').updateOne({ _id: ObjectId(client.uid) }, { $set: { sck: client.id, is_online: 1, ll: new Date() } }, function () { })
    },
    //AL
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
                        console.log("otp verified");
                        db.collection('game_users').updateOne({ _id: MongoID(userdata._id.toString()) }, { $set: { isMobileVerified: 1, OTP: "" } }, function () { });
                        signupClass.SP(data, client);
                    } else {
                        commonClass.sendDirectToUserSocket(client, { en: "WOTP", data: { status: false, msg: "OTP is incorrect Or Expire" } });
                    }
                }
            });
        } else {
            commonClass.sendDirectToUserSocket(client, { en: "VERIFY_OTP", data: { status: false, msg: "Please send Proper Data" } });
        }

    },
    //AL
    LOGIN: async function (data, client) {

        if (!data.mobile_no || !data.password) {
            commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, msg: "Please send Proper Data" } });
            return false;
        }

        console.log(data);
        var wh = {};
        wh.mobile_no = data.mobile_no;
        wh.password = data.password;
        var userData = await db.collection('game_users').find(wh).toArray()
        if (userData.length > 0) {
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
            } else {
                signupClass.SP(data, client);
            }
        } else {
            commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { status: false, msg: "Phone Number and Passowrd Not Matched" } });
        }
    },
    //AL
    REGISTRATION: async function (data, client) {
        console.log("data", data);
        if (!data || !data.mobile_no || !data.password || !data.name || !data.email) {
            commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { success: false, msg: "Please send proper data." } });
            return;
        }

        let wh = {};
        wh.mobile_no = data.mobile_no;
        wh.password = data.password;
        let userData = await db.collection('game_users').find(wh).toArray();
        if (userData && userData.length > 0) {
            commonClass.sendDirectToUserSocket(client, { en: "PUP", data: { success: false, msg: "Phone Number Already Registered Please Login." } });
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
                    db.collection('game_users').updateOne({ mobile_no: data.mobile_no }, { $set: { OTP: cb_status.data.otp, jid: jid, isexpire: false } }, function (err) { })
                    commonClass.sendDirectToUserSocket(client, { en: "OPENOTP", data: { success: true, mobile_no: data.mobile_no, timer: 60 } });
                    schedule.scheduleJob(jid, new Date(extime), function () {
                        schedule.cancelJob(jid);
                        db.collection('game_users').updateOne({ mobile_no: data.mobile_no }, { $set: { isexpire: true } }, function (err) { })
                    })
                }
            })
        }
    }
}