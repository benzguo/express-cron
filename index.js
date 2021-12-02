require('dotenv').config();

// DEV
const DRYRUN_ROCKET = false // don't run stripe stuff
const DRYRUN_KAVHOLM = false // don't run stripe stuff
const DEVRUN_KAVHOLM = false // ignore hour/day check

const KAVHOLM_DAYS = [1,2,3,4,5] // M-F
const KAVHOLM_HOUR = 6
const random = (min, max) => Math.floor(Math.random() * (max - min)) + min;
const date = new Date()
const day = date.getDay()
const hour = date.getHours()
console.log("DAY: " + day)
console.log("HOUR: " + hour)
const RUN_KAVHOLM = ((hour % 3 == 0) && KAVHOLM_DAYS.includes(day));
console.log("RUN_KAVHOLM: " + RUN_KAVHOLM)

const run = async () => {
  // ROCKET RIDES
  try {
    const locations = [
      "Costco - Colma",
      "Rainbow Grocery - SOMA",
      "Cybelle's Front Room - Inner Sunset",
      "China North Dumpling - Inner Sunset",
      "BAIA - Fillmore",
      "Taco Bell - Daly City",
      "Whole Foods - Haight",
      "Souley Vegan - Oakland",
      "El Farolito - Excelsior",
      "Gracias Madre - Mission",
      "The Butcher's Son - Oakland",
      "Flacos - Oakland",
      "Lucky Creation Vegetarian Restaurant - Chinatown",
      "Ike's Love & Sandwiches - Polk St",
      "Wildseed - Marina",
      "Vegan Picnic - Marina",
      "Shizen Vegan Sushi Bar and Izakaya - Mission",
      "Hinodeya Ramen Bar - Japantown",
      "Burma Superstar - Inner Richmond",
      "Loving Hut Vegan Restaurant - Chinatown",
    ]
    const shouldDeliver = random(0, 4)
    if (shouldDeliver === 0) {
      const index = Math.floor(Math.random() * locations.length);
      const description = `Delivery from ${locations[index]}`
      console.log(description)
      const base = random(200, 1201)
      const tip = base * (random(0,11)/10.0)
      const amount = Math.floor(base + tip)
      const fee = Math.floor(base*0.1)
      console.log("base: " + base)
      console.log("tip: " + tip)
      console.log("fee: " + fee)
      if (DRYRUN_ROCKET) {
        throw "DRYRUN_ROCKET"
      }
      const stripe = require('stripe')(process.env.ROCKET_KEY);
      const charge = await stripe.charges.create({
        amount: amount,
        currency: 'usd',
        description: description,
        application_fee_amount: fee,
        source: 'tok_visa',
        transfer_data: {
          destination: process.env.ROCKET_ACCOUNT,
        },
      });
      const transferId = charge.transfer
      console.log("charge: " + charge.id)
      const transfer = await stripe.transfers.retrieve(transferId);
      const paymentId = transfer.destination_payment;
      console.log('updating charge');
      const payment = await stripe.charges.update(
        paymentId,
        { description: description },
        { stripe_account: accountId },
      );
      console.log("destination_payment: " + payment.id)
      const shouldRefund = random(0, 10)
      if (shouldRefund === 0) {
        // https://stripe.com/docs/connect/destination-charges#issuing-refunds
        const refund = await stripe.refunds.create({
          charge: charge.id,
          reverse_transfer: true,
          refund_application_fee: true,
        });
        console.log("refund: " + refund.id)
      }
    }
    else {
      console.log("NO DELIVERY")
    }

  } catch (e) {
    console.error(e);
  }

  // KAVHOLM
  try {
    const nights = random(1, 4)
    const properties = [
      "Cozy Closet",
      "Beautiful Basement",
      "Backyard Glamping",
      "Attractive Attic",
    ]
    const prices = [
      1000,
      2000,
      3000,
      4500
    ]

    if (DRYRUN_KAVHOLM) {
      throw "DRYRUN_KAVHOLM"
    }
    const stripe = require('stripe')(process.env.KAVHOLM_KEY);
    if (DEVRUN_KAVHOLM || RUN_KAVHOLM) {
      const index = Math.floor(Math.random() * properties.length);
      const price = prices[index]
      const base = price*nights
      const services = 1500*nights
      const fee = Math.floor(base*0.15)
  
      const description = `${nights} night${nights > 1 ? "s" : ""} in ${properties[index]}`
      console.log(description)
      console.log("base: " + base)
      console.log("services: " + services)
      console.log("fee: " + fee)
      const transferGroup = `${description} - ${date.toString()}`
  
      // https://stripe.com/docs/connect/charges-transfers#on-behalf-of
      const baseCharge = await stripe.charges.create({
        amount: base,
        currency: 'usd',
        source: 'tok_visa',
        transfer_group: transferGroup,
        description: `BASE - ${description}`,
        // on_behalf_of: process.env.KAVHOLM_ACCOUNT,
      });
      console.log("base: " + baseCharge.id)

      const servicesCharge = await stripe.charges.create({
        amount: services,
        currency: 'usd',
        source: 'tok_visa',
        transfer_group: transferGroup,
        description: `SERVICES - ${description}`,
        // on_behalf_of: process.env.KAVHOLM_ACCOUNT,
      });
      console.log("services: " + servicesCharge.id)

      // typically you would add delays before transfer / payout to allow for chargebacks/refunds
      const amount = base + services - fee;
      const transfer = await stripe.transfers.create({
        amount: amount,
        currency: 'usd',
        destination: process.env.KAVHOLM_ACCOUNT,
        description: description,
        transfer_group: transferGroup,
      });
      console.log("transfer: " + transfer.id)

      const paymentId = transfer.destination_payment;
      console.log('updating charge');
      const payment = await stripe.charges.update(
        paymentId,
        { description: description },
        { stripe_account: accountId },
      );
      console.log("destination_payment: " + payment.id)

      const shouldReverseTransfer = random(0, 4)
      if (shouldReverseTransfer === 0) {
        // https://stripe.com/docs/connect/charges-transfers#reversing-transfers
        const reversal = await stripe.transfers.createReversal(
          transfer.id,
          {
            amount: amount,
            description: `REFUND for ${description}`,
          },
        );
        console.log("transfer reversal: " + reversal.id)
      }
      else {
        // https://stripe.com/docs/connect/manual-payouts
        const shouldFailPayout = random(0, 3)
        if (shouldFailPayout === 0) {
          // https://stripe.com/docs/connect/testing#payouts
          const failedPayout = await stripe.payouts.create({
            amount: amount,
            currency: 'usd',
            destination: 'tok_visa_debit_us_transferFail',
          }, {
            stripeAccount: process.env.KAVHOLM_ACCOUNT,
          });
          console.log("failed payout: " + failedPayout.id)
          const payout = await stripe.payouts.create({
            amount: amount,
            currency: 'usd',
          }, {
            stripeAccount: process.env.KAVHOLM_ACCOUNT,
          });
          console.log("payout: " + payout.id)
        }
        else {
          const payout = await stripe.payouts.create({
            amount: amount,
            currency: 'usd',
          }, {
            stripeAccount: process.env.KAVHOLM_ACCOUNT,
          });
          console.log("payout: " + payout.id)
        }
      }
    }  
  } catch (e) {
    console.error(e);
  }
};

run();
