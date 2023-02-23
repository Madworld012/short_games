
// async function init(params) {


// let cut_out_x_value = 40.5;
// // let cut_out_x_value = 1.01;

// console.log("\nNext Cut Out Value -----------------------------------------------------------------------------------------------", cut_out_x_value);
// //start x value
// let x = 0.99;
// let re_fly = 0;
// async function sleep(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }
// const call = async (cut_out_x_value) => {

//     if (x == cut_out_x_value) {

//         //need to add indexing
//         // let rand_value = _.random(1, config.FAKE_PLANE_START_STOP_MAX_AMOUNT);
//         console.log("plane cut out no at----------------------------",x);
//     } else {

//         await sleep((x > 10) ? 5 : 50 / x );




//         let ix = 0.01;
//         if(x > 10 && x <= 20){
//             ix = (cut_out_x_value < x + 0.05)? 0.01 : 0.05;
//         }else if(x > 20 && x <= 30){
//             ix = (cut_out_x_value < x + 0.10)? 0.01 : 0.10;
//         }else if(x > 30 && x <= 40){
//             ix = (cut_out_x_value < x + 0.20)? 0.01 : 0.20;
//         }else if(x < 40){
//             ix = (cut_out_x_value < x + 0.21)? 0.01 : 0.21;
//         }

//         x = parseFloat((x + ix).toFixed(2));
//         console.log("x value is ",x);

//         // console.log("x", x);
//         call(cut_out_x_value);
//     }
// }
// return await call(cut_out_x_value);





// async function sleep(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }

// }


// init()


// let x = 1.30;
// let tblid = "1111";

// let bet_data = [
//     { name: "a", uid: "12111", xx: 1.20 },
//     { name: "b", uid: "12112", xx: 1.30 },
//     { name: "c", uid: "12113", xx: 1.45 },
//     { name: "a", uid: "12111", xx: 1.20 },
//     { name: "b", uid: "12112", xx: 1.30 },
//     { name: "c", uid: "12113", xx: 1.45 }
// ]
// const result = bet_data.find(({ xx }) => xx === x);
// console.log("found", result);





let x = 1.30;
let tblid = "1111";

let MAIN_BET_JSON = {
    "1111": [
        { name: "a", uid: "12111", xx: 1.20 },
        { name: "b", uid: "12112", xx: 1.30 },
        { name: "c", uid: "12113", xx: 1.45 }],

    "1112": [
        { name: "a", uid: "12111", xx: 1.20 },
        { name: "b", uid: "12112", xx: 1.30 },
        { name: "c", uid: "12113", xx: 1.45 }]

}

console.log(MAIN_BET_JSON);
delete MAIN_BET_JSON[tblid];
console.log(MAIN_BET_JSON);




// let bet_data = MAIN_BET_JSON[tblid];
// console.log(bet_data);

// const result = bet_data.find(({ xx }) => xx === x);
// console.log("found", result);



