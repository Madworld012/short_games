// const { Double } = require("mongodb");
_ = module.exports = require('underscore');
// let cut_out_x_value = 10
// let x = 1;


// setTimeout(() => {
//         console.log("-------------------------------------Old Cut Value", cut_out_x_value);
//         console.log("-------------------------------------new value", x + 2);

//         cut_out_x_value = x + 0.05;
//         console.log("-------------------------------------Old Cut Value", cut_out_x_value);

// }, 2000);



// function sleep(ms) {
//         return new Promise(resolve => setTimeout(resolve, ms));
// }

// const call = async () => {
//         console.log("cut_out_x_value"+"= " +cut_out_x_value+" x = "+x);
//         if (x == cut_out_x_value) {
//                 console.log("--------------------------------------" + x + "--------------------------------------break");
//                 return false;
//         } else {
//                 await sleep(100 / x);

//                 x = parseFloat((x + 0.01).toFixed(2));
//                 // console.log("x", str);
//                 call(cut_out_x_value);
//         }

// }
// setInterval(() => {
//         console.log("rand_value", call());

// }, 10);

// function call(params) {

//         const str = (Math.random() * (1 - 1.1) + 1.1).toFixed(2);

//         return parseFloat(str);
// }

// const str = (Math.random() * (2 - 1) + 1).toFixed(2);
// console.log("rand_value",str);







// let r = _.random(1,0);
// console.log(r*60*1000);

// // setInterval(() => {
//       console.log(r);  
// // }, 1000);

// var randomnumber=Math.floor(Math.random()*5)*100;
// console.log(randomnumber);

// console.log("Math.random()",Math.random()*10);


// console.log(parseFloat((1.15 * 3).toFixed(2)));

// let chips = -10;
// let total_cash = 15;
// let bonus_cash = 0;

// const deductChip = (Math.abs(chips) / 2);
// console.log("deductChip",deductChip);

// let setInfo = { $inc: {}, $set: {} }

// if (total_cash == 0 && bonus_cash >= chips) {
//       setInfo["$inc"]["bonus_cash"] = chips;
//       setInfo["$set"]["total_cash"] = 0;
//       setInfo["$set"]["bootcutfrom"] = 'bonus_cash';
// } else if (!bonus_cash) {
//       setInfo["$set"]["bonus_cash"] = 0;
//       setInfo["$inc"]["total_cash"] = chips
// } else if (bonus_cash >= deductChip && total_cash >= deductChip) {
//       setInfo["$inc"]["bonus_cash"] = -deductChip;
//       setInfo["$inc"]["total_cash"] = -deductChip
// } else if ((bonus_cash < deductChip && bonus_cash > 0) || (total_cash < deductChip && total_cash > 0)) {
//       if (bonus_cash < deductChip) {
//             let diffValue = deductChip - bonus_cash
//             setInfo["$inc"]["bonus_cash"] = -bonus_cash;
//             setInfo["$inc"]["total_cash"] = -(deductChip + diffValue);
//       } else if (total_cash < deductChip) {
//             let diffValue = deductChip - total_cash
//             setInfo["$inc"]["total_cash"] = -total_cash;
//             setInfo["$inc"]["bonus_cash"] = -(deductChip + diffValue);
//       }
// } else {
//       console.log("set 0.........")
//       setInfo["$set"]["bonus_cash"] = 0;
//       setInfo["$inc"]["total_cash"] = chips
// }



let chips = -10.155465;
let total_cash = 50;
let bonus_cash = 50.56574864414684;
let user_bonus_cash = 50.56574864414684;

let total_cut_cash = Math.abs(chips);

if (total_cash + bonus_cash >= total_cut_cash) {

      let halft_deduct_cash = total_cut_cash / 2;

      if (total_cash == 0 && bonus_cash >= total_cut_cash) {
            console.log("1");
            bonus_cash = bonus_cash - total_cut_cash;
            total_cut_cash = 0;
      } else if (bonus_cash == 0 && total_cash >= total_cut_cash) {
            console.log("2");
            total_cash = total_cash - total_cut_cash;
            total_cut_cash = 0;
      } else if (total_cash >= halft_deduct_cash && bonus_cash >= halft_deduct_cash) {
            console.log("3");
            total_cash = total_cash - halft_deduct_cash;
            bonus_cash = bonus_cash - halft_deduct_cash;
            total_cut_cash = 0;
      } else if ((bonus_cash < halft_deduct_cash && bonus_cash > 0) || (total_cash < halft_deduct_cash && total_cash > 0)) {
            if (bonus_cash < halft_deduct_cash) {
                  console.log("4");
                  let diff = halft_deduct_cash - bonus_cash;
                  bonus_cash = 0;
                  total_cash = total_cash - (halft_deduct_cash + diff);
                  total_cut_cash = 0;
            } else if (total_cash < halft_deduct_cash) {
                  console.log("5");
                  let diff = halft_deduct_cash - total_cash;
                  total_cash = 0;
                  bonus_cash = bonus_cash - (halft_deduct_cash + diff);
                  total_cut_cash = 0;
            }
      }
} else {
      console.log("not enough cash");
}


// console.log("total_cash", parseFloat(total_cash.toFixed(2)));
// console.log("bonus_cash", parseFloat(bonus_cash.toFixed(2)));
// console.log("total_cut_cash", parseFloat(total_cut_cash.toFixed(2)));

// console.log( parseFloat((user_bonus_cash - bonus_cash).toFixed(2)));

// console.log(parseFloat((5.0777325).toFixed(2)));







let deposit_amount = 100;
let bonus = 0;
if (deposit_amount <= 1000) {
      bonus = deposit_amount * 200/100;
} else {
      bonus = 1000
}

console.log(bonus);


console.log((Math.random() * (1- 1) + 1).toFixed(2))





/*

03-02-2023

1. Reference id ma balnk mokla je starting ma user add no kare to - Done
2. Home screen sound and ee side popup.
3. center ni x value 6e ne te je tene thoduk vadhare bold karvanu 6e 
4. last ma plane je udi ne jatu rey 6e ne teni speed thodik oo6i karvani 6e 
5. withdraw ma thoduk add karvanu 6e te hu tane moklu hamana
6. aapade cashout karvi aatale je upar small poup aave 6e ne "you cashout at" kari ne teni size oo6i karvani 6e and x(close) nu button mukvanu 6e
7. Auto play valu logic banavanu 6e 
8. facebook SDK add karvani 6e.

9. bank details add and update karvanu 6e event AUPD aa 6e data ma aatalu pass karvanu { uid: "63d396317a37a18c5f34d90d", bank_no: "1111111111", ifsc_code: "Nachi2203#1", bank_name: "icici", holder_name: "Viju", uip_id: "viju@okicici" }
10. pa6i payemnt details add kari hoy to get karva mate GPD aa event 6e aama khali uid moklvani
11. WITHDRAWAL aa event ma payment_method aa 1 field add karvnai 6e 
12. support nu add karu 6e to teni event name SUPPORT and data ma { uid: "63d396317a37a18c5f34d90d", msg:"Make Money" }  aatalu moklvanu
13. 

*/