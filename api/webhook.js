import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil',
})

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

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  console.log(`[webhook] Supabase URL defined: ${!!url}, Service Role Key defined: ${!!key}, Key prefix: ${key ? key.substring(0, 10) + '...' : 'MISSING'}`)
  if (!url || !key) {
    console.error('[webhook] FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
    return null
  }
  return createClient(url, key)
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

  const supabase = getSupabase()
  if (!supabase) {
    return res.status(500).json({ error: 'Server configuration error: missing Supabase credentials' })
  }

  try {
    console.log(`[webhook] Received event: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.supabase_user_id
        console.log(`[webhook] checkout.session.completed — userId: ${userId}`)

        if (userId) {
          const { data, error } = await supabase
            .from('users')
            .update({ plan: 'pro', subscription_end_date: null })
            .eq('id', userId)
            .select()

          console.log(`[webhook] UPDATE result — data: ${JSON.stringify(data)}, error: ${JSON.stringify(error)}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const customerId = subscription.customer
        console.log(`[webhook] subscription.updated — customerId: ${customerId}, cancel_at_period_end: ${subscription.cancel_at_period_end}, current_period_end: ${subscription.current_period_end}`)

        const customer = await stripe.customers.retrieve(customerId)
        const email = customer && !customer.deleted ? customer.email : null
        console.log(`[webhook] Stripe customer email: "${email}", deleted: ${customer?.deleted}`)

        if (!email) {
          console.error('[webhook] No email found for customer')
          break
        }

        // Verify user exists
        const { data: users, error: findError } = await supabase
          .from('users')
          .select('id, email, plan, subscription_end_date')
          .eq('email', email)
          .limit(1)

        console.log(`[webhook] SELECT users by email "${email}" — data: ${JSON.stringify(users)}, error: ${JSON.stringify(findError)}`)

        if (!users || users.length === 0) {
          console.error(`[webhook] No user found with email: ${email}`)
          break
        }

        const userId = users[0].id

        const cancelAtPeriodEnd = subscription.cancel_at_period_end === true || subscription.cancel_at_period_end === 'true'
        const periodEnd = subscription.current_period_end
        console.log(`[webhook] cancel_at_period_end raw: ${JSON.stringify(subscription.cancel_at_period_end)} (type: ${typeof subscription.cancel_at_period_end}), parsed: ${cancelAtPeriodEnd}, current_period_end: ${periodEnd}`)

        if (cancelAtPeriodEnd && periodEnd) {
          const endDate = new Date(periodEnd * 1000).toISOString()
          const { data: updateData, error: updateError } = await supabase
            .from('users')
            .update({ subscription_end_date: endDate })
            .eq('id', userId)
            .select()

          console.log(`[webhook] UPDATE subscription_end_date=${endDate} for user ${userId} — data: ${JSON.stringify(updateData)}, error: ${JSON.stringify(updateError)}`)
        } else {
          const { data: updateData, error: updateError } = await supabase
            .from('users')
            .update({ subscription_end_date: null })
            .eq('id', userId)
            .select()

          console.log(`[webhook] CLEAR subscription_end_date for user ${userId} — data: ${JSON.stringify(updateData)}, error: ${JSON.stringify(updateError)}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = subscription.customer
        console.log(`[webhook] subscription.deleted — customerId: ${customerId}`)

        const customer = await stripe.customers.retrieve(customerId)
        const email = customer && !customer.deleted ? customer.email : null

        if (email) {
          const { data: users } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .limit(1)

          if (users && users.length > 0) {
            const { data: updateData, error } = await supabase
              .from('users')
              .update({ plan: 'expired', subscription_end_date: null })
              .eq('id', users[0].id)
              .select()

            console.log(`[webhook] User ${users[0].id} expired — data: ${JSON.stringify(updateData)}, error: ${JSON.stringify(error)}`)
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
