require('dotenv').config();

const run = async () => {
  const sk = process.env.STRIPE_SECRET_KEY
  console.log(sk)
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  
  try {
    
  } catch (e) {
    console.error(e);
  }
};

run();
