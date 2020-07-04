var Gpio = require('onoff').Gpio;
var r1 = new Gpio(20, 'out');
var r2 = new Gpio(21, 'out');

r1.writeSync(0);
r2.writeSync(0);

var hourHand = 10;
var minHand = 35;

var polarity = false;

function autoAdvance(checkOnly) {
    if (!checkOnly) {
        advance(false);
    }

    var currentHour = new Date().getHours();
    if (currentHour > 11) {
        currentHour = currentHour - 12;
    }

    console.log("Clock reads: " + hourHand + ":" + minHand + " RT: " + currentHour + ":" + new Date().getMinutes());
    if (minHand !== new Date().getMinutes() || currentHour !== hourHand) {
        setTimeout(autoAdvance, 600);
    }
}

function advance(noReset) {
    polarity = !polarity;
    var value = 0;
    if(polarity) {
        value = 1;
    }
    r1.writeSync(value);
    r2.writeSync(value);

    minHand++;
    if (minHand > 59) {
        minHand = 0;
        hourHand++;
        if (hourHand > 11) {
            hourHand = 0;
        }
    }

    if (!noReset) {
        setTimeout(() => {
            // This is a safety check, to turn the power off to the
            // clock after sending the signal
            if (value === 0) {
                r1.writeSync(1);
            } else {
                r1.writeSync(0);
            }
        }, 100);
    }
}

var currentMinutes = new Date().getMinutes();

const keypress = async () => {
    process.stdin.setRawMode(true);
    return new Promise(resolve => process.stdin.once('data', data => {
        const byteArray = [...data];
        if (byteArray.length > 0 && byteArray[0] === 3) {
            console.log('^C');
            process.exit(1);
        }
        process.stdin.setRawMode(false);
        resolve();
    }));
}

;(async () => {
    //advance();
    await keypress();
    //advance();
    //await keypress();
    //advance();
})().then(process.exit);

autoAdvance(true);

setInterval(() => {
    var nowMinutes = new Date().getMinutes();
    if (nowMinutes !== currentMinutes) {
        currentMinutes = nowMinutes;
        advance();
    }
}, 100);

