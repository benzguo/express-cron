require('dotenv').config();

// DEV
const DRYRUN_ROCKET = false // don't run stripe stuff
const DRYRUN_KAVHOLM = false // don't run stripe stuff
const DEVRUN_KAVHOLM = false // ignore hour/day check

const KAVHOLM_DAYS = [1, 4] // MONDAY, THURSDAY
const KAVHOLM_HOUR = 6 
const random = (min, max) => Math.floor(Math.random() * (max - min)) + min;
const date = new Date()
const day = date.getDay()
const hour = date.getHours()
console.log("DAY: " + day)
console.log("HOUR: " + hour)
const RUN_KAVHOLM = (hour == KAVHOLM_HOUR && KAVHOLM_DAYS.includes(day));
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
      const base = random(500, 3001)
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
      const transfer = charge.transfer
      console.log("charge: " + charge.id)
      const updatedTransfer = await stripe.transfers.update(
        transfer,
        {description: description}
      );
      console.log("transfer: " + updatedTransfer.id)
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
      5000,
      6000,
      15000,
      7000
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

      const payout = await stripe.payouts.create({
        amount: amount,
        currency: 'usd',
      }, {
        stripeAccount: process.env.KAVHOLM_ACCOUNT,
      });
      console.log("payout: " + payout.id)
    }
    
  } catch (e) {
    console.error(e);
  }
};

run();
