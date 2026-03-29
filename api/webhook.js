import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil',
})

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
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
    console.log(`[webhook] Received event: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.supabase_user_id
        console.log(`[webhook] checkout.session.completed — userId: ${userId}`)

        if (userId) {
          const { error } = await supabase
            .from('users')
            .update({ plan: 'pro', subscription_end_date: null })
            .eq('id', userId)

          console.log(`[webhook] User ${userId} upgraded to pro — error: ${error?.message || 'none'}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const customerId = subscription.customer
        console.log(`[webhook] subscription.updated — customerId: ${customerId}, cancel_at_period_end: ${subscription.cancel_at_period_end}, current_period_end: ${subscription.current_period_end}`)

        const customer = await stripe.customers.retrieve(customerId)
        console.log(`[webhook] customer email: ${customer?.email || 'not found'}, deleted: ${customer?.deleted}`)

        if (customer && !customer.deleted && customer.email) {
          const { data: users, error: findError } = await supabase
            .from('users')
            .select('id')
            .eq('email', customer.email)
            .limit(1)

          console.log(`[webhook] Found users: ${JSON.stringify(users)}, error: ${findError?.message || 'none'}`)

          if (users && users.length > 0) {
            if (subscription.cancel_at_period_end && subscription.current_period_end) {
              const endDate = new Date(subscription.current_period_end * 1000).toISOString()
              const { error: updateError } = await supabase
                .from('users')
                .update({ subscription_end_date: endDate })
                .eq('id', users[0].id)
              console.log(`[webhook] User ${users[0].id} subscription ending on ${endDate} — error: ${updateError?.message || 'none'}`)
            } else {
              const { error: updateError } = await supabase
                .from('users')
                .update({ subscription_end_date: null })
                .eq('id', users[0].id)
              console.log(`[webhook] User ${users[0].id} subscription reactivated — error: ${updateError?.message || 'none'}`)
            }
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = subscription.customer
        console.log(`[webhook] subscription.deleted — customerId: ${customerId}`)

        const customer = await stripe.customers.retrieve(customerId)
        if (customer && !customer.deleted && customer.email) {
          const { data: users } = await supabase
            .from('users')
            .select('id')
            .eq('email', customer.email)
            .limit(1)

          if (users && users.length > 0) {
            const { error } = await supabase
              .from('users')
              .update({ plan: 'expired', subscription_end_date: null })
              .eq('id', users[0].id)

            console.log(`[webhook] User ${users[0].id} subscription expired — error: ${error?.message || 'none'}`)
          }
        }
        break
      }

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error('[webhook] Processing error:', err)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }

  return res.status(200).json({ received: true })
}
