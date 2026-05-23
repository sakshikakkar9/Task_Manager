import express from 'express';
import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';

const router = express.Router();

// @desc    Upsert a push subscription
// @route   POST /api/push/subscribe
router.post('/subscribe', async (req, res, next) => {
  try {
    const { subscription, reminderOffsetMinutes, beepEnabled } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ success: false, error: 'Subscription data is required' });
    }

    console.log('[Push] New subscription request')
    console.log('[Push] Endpoint:', subscription.endpoint.substring(0,60)+'...')
    console.log('[Push] Offset:', reminderOffsetMinutes, 'Beep:', beepEnabled)

    const updatedSubscription = await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        reminderOffsetMinutes: reminderOffsetMinutes || 10,
        beepEnabled: beepEnabled === true
      },
      { upsert: true, new: true }
    );

    console.log('[Push] Subscription saved successfully')

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// FIX 3: Add POST /api/push/test — call this from browser to test immediately
router.post('/test', async (req, res) => {
  try {
    const sub = await PushSubscription.findOne({}).lean()
    if (!sub) return res.status(404).json({
      success: false,
      error: 'No subscription found. Open app, click Enable notifications, then retry.'
    })

    const payload = JSON.stringify({
      title: 'DayFlow — Test ✅',
      body: 'Push notifications are working! You will see this even if Chrome is minimized.',
      taskId: 'test',
      playBeep: false
    })

    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
      payload
    )
    res.json({ success: true, message: 'Test notification sent — check bottom-right of your Windows screen' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, code: err.statusCode })
  }
})

// @desc    Remove a push subscription
// @route   DELETE /api/push/subscribe
router.delete('/subscribe', async (req, res, next) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ success: false, error: 'Endpoint is required' });
    }

    await PushSubscription.findOneAndDelete({ endpoint });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
