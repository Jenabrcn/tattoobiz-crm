import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil',
})

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export const config = {
  api: {
    bodyParser: false,
  },
}

async function getRawBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    const rawBody = await getRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.supabase_user_id

        if (userId) {
          await supabase
            .from('users')
            .update({ plan: 'pro', subscription_end_date: null })
            .eq('id', userId)

          console.log(`User ${userId} upgraded to pro`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const customerId = subscription.customer

        const customer = await stripe.customers.retrieve(customerId)
        if (customer && !customer.deleted && customer.email) {
          const { data: users } = await supabase
            .from('users')
            .select('id')
            .eq('email', customer.email)
            .limit(1)

          if (users && users.length > 0) {
            if (subscription.cancel_at_period_end && subscription.current_period_end) {
              // User cancelled but still active until period end
              const endDate = new Date(subscription.current_period_end * 1000).toISOString()
              await supabase
                .from('users')
                .update({ subscription_end_date: endDate })
                .eq('id', users[0].id)
              console.log(`User ${users[0].id} subscription ending on ${endDate}`)
            } else {
              // User resubscribed or cancellation was reversed
              await supabase
                .from('users')
                .update({ subscription_end_date: null })
                .eq('id', users[0].id)
              console.log(`User ${users[0].id} subscription reactivated`)
            }
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = subscription.customer

        // Find user by looking up the customer email
        const customer = await stripe.customers.retrieve(customerId)
        if (customer && !customer.deleted && customer.email) {
          const { data: users } = await supabase
            .from('users')
            .select('id')
            .eq('email', customer.email)
            .limit(1)

          if (users && users.length > 0) {
            await supabase
              .from('users')
              .update({ plan: 'expired' })
              .eq('id', users[0].id)

            console.log(`User ${users[0].id} subscription expired`)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error('Webhook processing error:', err)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }

  return res.status(200).json({ received: true })
}
