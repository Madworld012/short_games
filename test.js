// let total_cash = 10;
// let bonus_cash = 10;
// let total_cut_cash = 10;




// if (total_cash + bonus_cash >= total_cut_cash) {

//     // let halft_deduct_cash = total_cut_cash / 2;
//     console.log("calcome");
//     let halft_deduct_cash = Math.round(total_cut_cash * 75/100);
//     console.log(halft_deduct_cash);

//     if (total_cash == 0 && bonus_cash >= total_cut_cash) {
//         bonus_cash = bonus_cash - total_cut_cash;
//         total_cut_cash = 0;
//     } else if (bonus_cash == 0 && total_cash >= total_cut_cash) {
//         total_cash = total_cash - total_cut_cash;
//         total_cut_cash = 0;
//     } else if (total_cash >= halft_deduct_cash && bonus_cash >= halft_deduct_cash) {
//         total_cash = total_cash - halft_deduct_cash;
//         bonus_cash = bonus_cash - halft_deduct_cash;
//         total_cut_cash = 0;
//     } else if ((bonus_cash < halft_deduct_cash && bonus_cash > 0) || (total_cash < halft_deduct_cash && total_cash > 0)) {
//         if (bonus_cash < halft_deduct_cash) {
//             let diff = halft_deduct_cash - bonus_cash;
//             bonus_cash = 0;
//             total_cash = total_cash - (halft_deduct_cash + diff);
//             total_cut_cash = 0;
//         } else if (total_cash < halft_deduct_cash) {
//             let diff = halft_deduct_cash - total_cash;
//             total_cash = 0;
//             bonus_cash = bonus_cash - (halft_deduct_cash + diff);
//             total_cut_cash = 0;
//         }
//     }
// } else {
//     console.log("not enough cash");
// }


// console.log("total_cash",total_cash);
// console.log("bonus_cash",bonus_cash);
// console.log("total_cut_cash",total_cut_cash);


// // console.log("percentage is ", Math.round(10*75/100));







let total_cash = 10;
let bonus_cash = 30;
let total_cut_cash = 15;

if(total_cash + bonus_cash >= total_cut_cash){
    
    let cut_from_cash = Math.round(total_cut_cash * 75/100);
    let cut_from_bonus = total_cut_cash - cut_from_cash;

    console.log("cut_from_cash",cut_from_cash);
    console.log("cut_from_bonus",cut_from_bonus);
    console.log("-------------------------------------------------------");

    if(total_cash == 0 && bonus_cash >= total_cut_cash){
        console.log("cond 1");
        bonus_cash = bonus_cash - total_cut_cash;
        total_cut_cash = 0;
    }else if(bonus_cash == 0 && total_cash >= total_cut_cash) {
        console.log("cond 2");
        total_cash = total_cash - total_cut_cash;
        total_cut_cash = 0;
    }else if(total_cash >= cut_from_cash && bonus_cash >= cut_from_bonus){
        console.log("cond 3");
        total_cash = total_cash - cut_from_cash;
        bonus_cash = bonus_cash - cut_from_bonus;
        total_cut_cash = 0;
    }else{
        if((total_cash <= cut_from_cash && total_cash > 0) || (bonus_cash <= cut_from_bonus && bonus_cash > 0)){
            console.log("cond 4");
            total_cut_cash = total_cut_cash - total_cash;
            total_cash = 0;
            if(total_cut_cash > 0){
                bonus_cash = bonus_cash - total_cut_cash;
                total_cut_cash = 0;
            }
        }
    }
    
}else{
    console.log("not enough coin");
}



console.log("total_cash",total_cash);
console.log("bonus_cash",bonus_cash);
console.log("total_cut_cash",total_cut_cash);

