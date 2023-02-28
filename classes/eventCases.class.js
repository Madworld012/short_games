module.exports = {
	init: function () {
		io.sockets.on("connection", function (socket) {

			console.log("call come for connection----------------------------------------------------------------- ", socket.id);
			commonClass.sendDirectToUserSocket(socket, { en: "done", data: {} });

			ecClass.BindSocketToEvent(socket);
		});
	},
	getRendomeTimeInterval: function () {
		console.log("call come");
		return _.random(100, 500)
	},
	BindSocketToEvent: function (client) {

		client.on('req', function (request) {
			cl("call come for socket ", typeof request.data);
			cl("call come for socket ",request);
			request = commonClass.Dec(request);
			cl("request.en", request.en);
			cl("request.data", request.data);

			var en = request.en;

			switch (en) {
				case "SP": //user register
				case "REGISTRATION": //user register // intial call come here
				case "LOGIN": //user register // intial call come here
				case "RESEND": // resend OTP
				case "VERIFY_OTP": //verify otp
				case "FORGOT_PASS":
				case "VERIFY_CAHNGE_PASS_OTP":
				case "CHANGE_PASSWORD":
				case "PD": // profile detail
				case "UP": //update profile
				case "AUPD" : //add or update payemnt details
				case "GPD" : //get payment details
				case "SUPPORT" : // for support message.
					signupClass[en](request.data, client);
					break;
				case "SG": //start game
				case "PLACE_BET": // place bet
				case "CASH_OUT": //cashout 
				case "CANCEL_BET": //cancel_bet
				case "LG": // Leave Game
				case "HISTORY": //game history
				case "DWN_LIST": //default history
					aviatorClass[en](request.data, client);
					break;
				case "DEPOSIT":
				case "WITHDRAWAL":
				case "DEPOSIT_HISTORY":
				case "WITHDRAWAL_HISTORY":
				case "CD": // cash details
				case "REFERRAl_DETAILS" : //referal test 
				case "DEPOSIT_DETAILS": // payment details.
					cashClass[en](request.data, client);
					break;

				case "TEST":
					console.log("call come test");
					//io.to("rest").emit('res', {});
					// commonClass.sendToRoom("rest", { en: "FLAY", data: { "count": 1 } });
					break;


			}
		});

		client.on('error', function (exc) {
			cl("ignoring exception: " + exc);
		});

		client.on('disconnect', function (disc) {
			cl("User Disconnect ------> ", client.id);
			cl("User Disconnect ------> ", client.uid);
			disconnectUserClass.disconnectUser(client);
		});

	}
}