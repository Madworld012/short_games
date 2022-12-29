const { Double } = require("mongodb");

let cut_out_x_value = 10
let x = 1;


// setTimeout(() => {
//     console.log("-------------------------------------new value");
//     cut_out_x_value = 3;
// }, 1000);



function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const call = async () => {
    if (parseInt(x) == cut_out_x_value) {
        console.log("--------------------------------------" + x + "--------------------------------------break");
        return false;
    } else {
        await sleep(100 / x);

        x = x + 0.01;
        // this is a working logic for 1.00 
        var str = (Math.round(x * 100) / 100).toFixed(2);

        console.log("x", str);
        call(cut_out_x_value);
    }   
    
}

call();



