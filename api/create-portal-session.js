import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil',
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Missing email' })
    }

    // Find customer by email
    const customers = await stripe.customers.list({ email, limit: 1 })

    if (customers.data.length === 0) {
      return res.status(404).json({ error: 'No Stripe customer found' })
    }

    const origin = req.headers.origin || `https://${req.headers.host}`

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${origin}/settings`,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Portal error:', err)
    return res.status(500).json({ error: 'Failed to create portal session' })
  }
}
