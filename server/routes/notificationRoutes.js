const express = require('express');

const router = express.Router();

const pollingEngine = require('../services/pollingEngine');

const smsService = require('../services/smsService');



router.post('/subscribe', (req, res) => {

  const { subscription } = req.body;

  if (!subscription?.endpoint) {

    return res.status(400).json({ error: 'Valid push subscription required.' });

  }



  const subs = pollingEngine.getPushSubscriptions();

  const exists = subs.some((s) => s.endpoint === subscription.endpoint);

  if (!exists) subs.push(subscription);

  pollingEngine.setPushSubscriptions(subs);



  res.status(200).json({ status: 'subscribed', count: subs.length });

});



router.post('/sms-route', async (req, res) => {

  const { phoneNumber } = req.body;

  if (!phoneNumber?.trim()) {

    return res.status(400).json({ error: 'Phone number required.' });

  }



  const normalized = smsService.registerPhoneNumber(phoneNumber);

  if (!normalized) {

    return res.status(400).json({ error: 'Enter a valid phone number (e.g. +91 98765 43210).' });

  }



  pollingEngine.setSmsTargets(smsService.getRegisteredTargets());



  if (!smsService.isSmsConfigured()) {

    return res.status(200).json({

      status: 'saved',

      phone: normalized,

      smsLive: false,

      message: 'Number saved. Set Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) in server .env to enable live SMS.',

      targets: smsService.getRegisteredTargets(),

    });

  }



  const confirmation = await smsService.sendRegistrationConfirmation(normalized);

  res.status(200).json({

    status: confirmation.sent ? 'live_routing_active' : 'saved',

    phone: normalized,

    smsLive: confirmation.sent,

    message: confirmation.sent

      ? 'Number registered — you will receive real SMS when slots open.'

      : 'Number saved, but confirmation SMS could not be sent. Check Twilio settings.',

    targets: smsService.getRegisteredTargets(),

  });

});



router.get('/sms-route', (req, res) => {

  res.json({

    targets: smsService.getRegisteredTargets(),

    smsLive: smsService.isSmsConfigured(),

  });

});



module.exports = router;

